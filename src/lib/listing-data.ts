import { getSupabaseAdmin } from './supabase';
import { getListingAccess, VisibilityTier, ListingAccess } from './listing-visibility';

export interface ListingRow {
  id: string;
  host_id: string;
  property_type: string;
  title: string;
  area_name: string;
  description: string | null;
  price_min: number | null;
  price_max: number | null;
  availability_start: string | null;
  availability_end: string | null;
  availability_flexible: boolean;
  house_rules: string | null;
  amenities: string[];
  preview_visibility: VisibilityTier;
  full_visibility: VisibilityTier;
  min_trust_score: number;
  specific_user_ids: string[];
  // Stay rules (CC-9a)
  min_nights: number;
  max_nights: number;
  prep_days: number;
  advance_notice_days: number;
  availability_window_months: number;
  checkin_time: string;
  checkout_time: string;
  blocked_checkin_days: string[];
  blocked_checkout_days: string[];
  default_availability_status: string | null;

  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListingPhoto {
  id: string;
  listing_id: string;
  storage_path: string | null;
  public_url: string;
  /** Single-select: main thumbnail / hero image. */
  is_cover?: boolean;
  /** Multi-select: included in anonymous preview. */
  is_preview: boolean;
  sort_order: number;
}

export interface NextAvailableRange {
  start_date: string;
  end_date: string;
  status: string;
}

export interface ListingWithAccess extends ListingRow {
  access: ListingAccess;
  photos: ListingPhoto[];
  host?: {
    id: string;
    name: string;
    avatar_url: string | null;
    host_rating: number | null;
    host_review_count: number;
    vouch_power: number | null;
    vouch_score: number | null;
  };
  nextAvailable?: NextAvailableRange | null;
}

/**
 * Fetch all active listings with visibility checks for a viewer.
 * At most 5 DB round-trips regardless of listing count:
 *   1. All active listings + photos
 *   2. Viewer's vouch count
 *   3. Batch 1° scores for all unique hosts
 *   4. Batch inner_circle check for all unique hosts
 *   5. Host user profiles
 */
export async function getListingsForViewer(viewerId: string): Promise<ListingWithAccess[]> {
  const supabase = getSupabaseAdmin();

  // 1. Fetch all active listings with photos
  const { data: listings, error: listingsErr } = await supabase
    .from('listings')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (listingsErr || !listings) return [];

  const { data: photos } = await supabase
    .from('listing_photos')
    .select('*')
    .in('listing_id', listings.map(l => l.id))
    .order('sort_order', { ascending: true });

  const photosByListing = new Map<string, ListingPhoto[]>();
  for (const p of (photos || [])) {
    const arr = photosByListing.get(p.listing_id) || [];
    arr.push(p as ListingPhoto);
    photosByListing.set(p.listing_id, arr);
  }

  // 2. Viewer's vouch count (how many people have vouched for this viewer).
  // Demo-origin (B8 training-wheels) vouches don't count toward the
  // listing-access "min_vouches" gate — that gate is about real
  // social proof from other real users, not seeded presidents.
  const { count: vouchCount } = await supabase
    .from('vouches')
    .select('*', { count: 'exact', head: true })
    .eq('vouchee_id', viewerId)
    .eq('is_demo_origin', false);

  // 3. Get unique host IDs and batch-calculate 1° scores
  const hostIds = [...new Set(listings.map(l => l.host_id))];
  const { data: scores } = await supabase.rpc('calculate_one_degree_scores', {
    p_viewer_id: viewerId,
    p_target_ids: hostIds,
  });

  const scoreByHost = new Map<string, number>();
  for (const s of (scores || [])) {
    scoreByHost.set(s.target_id, s.score);
  }

  // 4. Batch inner_circle check: which hosts have inner_circled the viewer.
  // Auto-vouches are vouch_type='standard' so this would already
  // exclude them by type — filter is_demo_origin too as a belt-and-
  // suspenders so a future demo-origin inner_circle (we don't write
  // any today) would still be ignored for full-access unlocks.
  const { data: innerCircleVouches } = await supabase
    .from('vouches')
    .select('voucher_id')
    .in('voucher_id', hostIds)
    .eq('vouchee_id', viewerId)
    .eq('vouch_type', 'inner_circle')
    .eq('is_demo_origin', false);

  const innerCircleHostSet = new Set(
    (innerCircleVouches || []).map(v => v.voucher_id)
  );

  // 5. Next available range per listing (for browse cards)
  const today = new Date().toISOString().split('T')[0];
  const { data: availRanges } = await supabase
    .from('listing_availability')
    .select('listing_id, start_date, end_date, status')
    .in('listing_id', listings.map(l => l.id))
    .in('status', ['available', 'possibly_available'])
    .gte('end_date', today)
    .order('start_date', { ascending: true });

  const nextAvailByListing = new Map<string, { start_date: string; end_date: string; status: string }>();
  for (const r of (availRanges || [])) {
    if (!nextAvailByListing.has(r.listing_id)) {
      nextAvailByListing.set(r.listing_id, {
        start_date: r.start_date,
        end_date: r.end_date,
        status: r.status,
      });
    }
  }

  // Fallback: if a listing has no explicit ranges but a default status of
  // available/possibly_available, synthesize a next-available span from today
  // through the end of its availability window so browse cards show something.
  for (const l of listings) {
    if (nextAvailByListing.has(l.id)) continue;
    const def = l.default_availability_status as string | null;
    if (def === 'available' || def === 'possibly_available') {
      const windowMonths = l.availability_window_months ?? 12;
      const end = new Date();
      end.setMonth(end.getMonth() + windowMonths);
      nextAvailByListing.set(l.id, {
        start_date: today,
        end_date: end.toISOString().split('T')[0],
        status: def,
      });
    }
  }

  // 6. Host profiles
  const { data: hosts } = await supabase
    .from('users')
    .select('id, name, avatar_url, host_rating, host_review_count, vouch_power, vouch_score')
    .in('id', hostIds);

  const hostById = new Map(
    (hosts || []).map(h => [h.id, h])
  );

  // Build result with access checks
  const result: ListingWithAccess[] = [];

  for (const listing of listings) {
    const access = getListingAccess({
      viewerId,
      hostId: listing.host_id,
      previewVisibility: listing.preview_visibility,
      fullVisibility: listing.full_visibility,
      minTrustScore: listing.min_trust_score ?? 0,
      specificUserIds: listing.specific_user_ids ?? [],
      viewerVouchCount: vouchCount ?? 0,
      viewerScoreVsHost: scoreByHost.get(listing.host_id) ?? 0,
      hostHasInnerCircledViewer: innerCircleHostSet.has(listing.host_id),
    });

    // Skip listings where viewer can't even see the preview
    if (!access.canSeePreview) continue;

    result.push({
      ...(listing as ListingRow),
      access,
      photos: photosByListing.get(listing.id) || [],
      host: hostById.get(listing.host_id) ?? undefined,
      nextAvailable: nextAvailByListing.get(listing.id) ?? null,
    });
  }

  return result;
}

/**
 * Fetch a single listing with visibility check for a viewer.
 */
export async function getListingForViewer(
  listingId: string,
  viewerId: string
): Promise<ListingWithAccess | null> {
  const supabase = getSupabaseAdmin();

  // 1. Fetch the listing
  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .single();

  if (!listing) return null;

  // 2. Fetch photos
  const { data: photos } = await supabase
    .from('listing_photos')
    .select('*')
    .eq('listing_id', listingId)
    .order('sort_order', { ascending: true });

  // 3. Viewer vouch count (real-only — see batch path above for why).
  const { count: vouchCount } = await supabase
    .from('vouches')
    .select('*', { count: 'exact', head: true })
    .eq('vouchee_id', viewerId)
    .eq('is_demo_origin', false);

  // 4. 1° score vs this host
  const { data: scores } = await supabase.rpc('calculate_one_degree_scores', {
    p_viewer_id: viewerId,
    p_target_ids: [listing.host_id],
  });

  // 5. Inner circle check (real-only — see batch path above for why).
  const { data: icVouch } = await supabase
    .from('vouches')
    .select('voucher_id')
    .eq('voucher_id', listing.host_id)
    .eq('vouchee_id', viewerId)
    .eq('vouch_type', 'inner_circle')
    .eq('is_demo_origin', false)
    .maybeSingle();

  // Host profile
  const { data: host } = await supabase
    .from('users')
    .select('id, name, avatar_url, host_rating, host_review_count, vouch_power, vouch_score')
    .eq('id', listing.host_id)
    .single();

  const access = getListingAccess({
    viewerId,
    hostId: listing.host_id,
    previewVisibility: listing.preview_visibility,
    fullVisibility: listing.full_visibility,
    minTrustScore: listing.min_trust_score ?? 0,
    specificUserIds: listing.specific_user_ids ?? [],
    viewerVouchCount: vouchCount ?? 0,
    viewerScoreVsHost: scores?.[0]?.score ?? 0,
    hostHasInnerCircledViewer: !!icVouch,
  });

  return {
    ...(listing as ListingRow),
    access,
    photos: (photos || []) as ListingPhoto[],
    host: host ?? undefined,
  };
}
