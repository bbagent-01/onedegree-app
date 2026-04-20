import { getSupabaseAdmin } from "./supabase";
import { resolveEffectivePolicy } from "./cancellation";
import type { ListingPhoto, ListingRow } from "./listing-data";
import { derivedExtras } from "./listing-derived";
import { parseListingMeta } from "./listing-meta";

export interface ListingHost {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  host_rating: number | null;
  host_review_count: number;
}

export interface ListingReview {
  id: string;
  rating: number | null;
  text: string;
  created_at: string;
  guest: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
}

export interface ListingDetail {
  id: string;
  title: string;
  description: string | null;
  area_name: string;
  property_type: string;
  price_min: number | null;
  price_max: number | null;
  amenities: string[];
  house_rules: string | null;
  checkin_time: string | null;
  checkout_time: string | null;
  min_nights: number;
  max_nights: number;
  availability_start: string | null;
  availability_end: string | null;
  photos: ListingPhoto[];
  host: ListingHost | null;
  host_id: string;
  /**
   * Host-set trust gate. 0 means anyone can see the full listing.
   */
  min_trust_gate: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  latitude: number;
  longitude: number;
  avg_rating: number | null;
  review_count: number;
  reviews: ListingReview[];
  blockedRanges: { start: string; end: string }[];
  /** Visibility mode: public | preview_gated | hidden */
  visibility_mode: string;
  /** Host-written preview description (200 char max) */
  preview_description: string | null;
  /** Per-action access rules (JSONB from DB) */
  access_settings: import("./trust/types").AccessSettings | null;
  /**
   * Effective cancellation policy for this listing — listing-level
   * override if set, otherwise the host's default. Always populated
   * (falls back to the platform Moderate preset as a last resort).
   */
  cancellation_policy: import("./cancellation").CancellationPolicy;
}

export async function getListingDetail(
  id: string
): Promise<ListingDetail | null> {
  const supabase = getSupabaseAdmin();

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (!listing) return null;
  const row = listing as ListingRow & {
    avg_listing_rating: number | null;
    listing_review_count: number | null;
    min_trust_gate: number | null;
    visibility_mode: string | null;
    preview_description: string | null;
    access_settings: import("./trust/types").AccessSettings | null;
    cancellation_policy_override: unknown;
  };

  const [photosRes, hostRes, reviewsRes, blocksRes] = await Promise.all([
    supabase
      .from("listing_photos")
      .select("*")
      .eq("listing_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("users")
      .select(
        "id, name, avatar_url, bio, created_at, host_rating, host_review_count, cancellation_policy"
      )
      .eq("id", row.host_id)
      .maybeSingle(),
    supabase
      .from("stay_confirmations")
      .select(
        "id, guest_id, listing_rating, listing_review_text, review_text, created_at"
      )
      .eq("listing_id", id)
      .not("listing_rating", "is", null)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("listing_availability")
      .select("start_date, end_date, status")
      .eq("listing_id", id)
      .eq("status", "blocked"),
  ]);

  const photosRaw = (photosRes.data || []) as ListingPhoto[];
  // Cover first, then preview photos, then rest.
  const photos = [...photosRaw].sort((a, b) => {
    const ac = a.is_cover ? 0 : 1;
    const bc = b.is_cover ? 0 : 1;
    if (ac !== bc) return ac - bc;
    const ap = a.is_preview ? 0 : 1;
    const bp = b.is_preview ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
  const host = hostRes.data as
    | (ListingHost & { cancellation_policy: unknown })
    | null;
  const reviewRows = (reviewsRes.data || []) as Array<{
    id: string;
    guest_id: string;
    listing_rating: number | null;
    listing_review_text: string | null;
    review_text: string | null;
    created_at: string;
  }>;

  // Fetch guest profiles for reviews
  const guestIds = [...new Set(reviewRows.map((r) => r.guest_id))];
  let guestMap = new Map<
    string,
    { id: string; name: string; avatar_url: string | null }
  >();
  if (guestIds.length > 0) {
    const { data: guests } = await supabase
      .from("users")
      .select("id, name, avatar_url")
      .in("id", guestIds);
    guestMap = new Map(
      ((guests || []) as { id: string; name: string; avatar_url: string | null }[]).map(
        (g) => [g.id, g]
      )
    );
  }

  const reviews: ListingReview[] = reviewRows
    .map((r) => ({
      id: r.id,
      rating: r.listing_rating,
      text: r.listing_review_text || r.review_text || "",
      created_at: r.created_at,
      guest: guestMap.get(r.guest_id) || null,
    }))
    .filter((r) => r.text.trim().length > 0);

  const { meta } = parseListingMeta(row.description);
  const derived = derivedExtras(row.id, row.area_name, {
    bedrooms: meta.bedrooms,
    beds: meta.beds,
    bathrooms: meta.bathrooms,
    lat: meta.address?.lat,
    lng: meta.address?.lng,
  });

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    area_name: row.area_name,
    property_type: row.property_type,
    price_min: row.price_min,
    price_max: row.price_max,
    amenities: row.amenities || [],
    house_rules: row.house_rules,
    checkin_time: row.checkin_time,
    checkout_time: row.checkout_time,
    min_nights: row.min_nights ?? 1,
    max_nights: row.max_nights ?? 30,
    availability_start: row.availability_start,
    availability_end: row.availability_end,
    photos,
    host,
    host_id: row.host_id,
    min_trust_gate: row.min_trust_gate ?? 0,
    avg_rating: row.avg_listing_rating,
    review_count: row.listing_review_count ?? reviews.length,
    reviews,
    blockedRanges: ((blocksRes.data || []) as {
      start_date: string;
      end_date: string;
    }[]).map((b) => ({ start: b.start_date, end: b.end_date })),
    visibility_mode: row.visibility_mode ?? "preview_gated",
    preview_description: row.preview_description ?? null,
    access_settings: row.access_settings ?? null,
    cancellation_policy: resolveEffectivePolicy({
      hostDefault: host?.cancellation_policy,
      listingOverride: row.cancellation_policy_override,
      reservationSnapshot: null,
    }),
    ...derived,
  };
}
