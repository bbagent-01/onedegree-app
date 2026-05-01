import { getSupabaseAdmin } from "./supabase";

export interface UserProfile {
  id: string;
  clerk_id: string | null;
  name: string;
  email: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  languages: string[] | null;
  occupation: string | null;
  created_at: string;
  host_rating: number | null;
  host_review_count: number | null;
  guest_rating: number | null;
  guest_review_count: number | null;
  vouch_power: number | null;
  vouch_count_given: number | null;
  vouch_count_received: number | null;
  /** Trust v2 absolute platform-wide vouch score (mig 046, users.vouch_score, 0-10).
   *  Feeds the TrustBadge's vouch chip. */
  vouch_score: number | null;
}

export interface ProfileListing {
  id: string;
  title: string;
  area_name: string;
  price_min: number | null;
  price_max: number | null;
  avg_listing_rating: number | null;
  listing_review_count: number | null;
  photos: { public_url: string }[];
}

export interface ProfileReview {
  id: string;
  rating: number | null;
  text: string;
  created_at: string;
  other_user: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
  listing: {
    id: string;
    title: string;
    area_name: string;
  } | null;
}

export interface ProfilePayload {
  user: UserProfile;
  listings: ProfileListing[];
  reviewsOf: ProfileReview[]; // reviews about this user
  reviewsBy: ProfileReview[]; // reviews this user wrote
}

// SELECT * keeps the query resilient to schema drift — e.g. if migration
// 011 hasn't been applied yet the location/languages/occupation columns
// simply come back undefined and the UI falls back to its empty states.
const PROFILE_COLS = "*";

type StayRow = {
  id: string;
  guest_id: string;
  host_id: string;
  listing_id: string;
  listing_rating: number | null;
  listing_review_text: string | null;
  review_text: string | null;
  created_at: string;
};

export async function getProfileById(
  id: string
): Promise<ProfilePayload | null> {
  const supabase = getSupabaseAdmin();

  const { data: userRow } = await supabase
    .from("users")
    .select(PROFILE_COLS)
    .eq("id", id)
    .maybeSingle();

  if (!userRow) return null;
  const raw = userRow as Record<string, unknown>;
  const user: UserProfile = {
    id: raw.id as string,
    clerk_id: (raw.clerk_id as string) ?? null,
    name: (raw.name as string) || "User",
    email: (raw.email as string) ?? null,
    phone_number: (raw.phone_number as string) ?? null,
    avatar_url: (raw.avatar_url as string) ?? null,
    bio: (raw.bio as string) ?? null,
    location: (raw.location as string) ?? null,
    languages: (raw.languages as string[]) ?? null,
    occupation: (raw.occupation as string) ?? null,
    created_at: (raw.created_at as string) || new Date().toISOString(),
    host_rating: (raw.host_rating as number) ?? null,
    host_review_count: (raw.host_review_count as number) ?? null,
    guest_rating: (raw.guest_rating as number) ?? null,
    guest_review_count: (raw.guest_review_count as number) ?? null,
    vouch_power: (raw.vouch_power as number) ?? null,
    vouch_count_given: (raw.vouch_count_given as number) ?? null,
    vouch_count_received: (raw.vouch_count_received as number) ?? null,
    vouch_score: (raw.vouch_score as number) ?? null,
  };

  const [listingsRes, reviewsOfRes, reviewsByRes] = await Promise.all([
    supabase
      .from("listings")
      .select(
        "id, title, area_name, price_min, price_max, avg_listing_rating, listing_review_count"
      )
      .eq("host_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("stay_confirmations")
      .select(
        "id, guest_id, host_id, listing_id, listing_rating, listing_review_text, review_text, created_at"
      )
      .eq("host_id", user.id)
      .not("listing_rating", "is", null)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("stay_confirmations")
      .select(
        "id, guest_id, host_id, listing_id, listing_rating, listing_review_text, review_text, created_at"
      )
      .eq("guest_id", user.id)
      .not("listing_rating", "is", null)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // Hydrate listing photos (one cover shot per listing)
  const listingIds = (listingsRes.data || []).map((l) => l.id as string);
  const photosByListing = new Map<string, { public_url: string }[]>();
  if (listingIds.length > 0) {
    const { data: photos } = await supabase
      .from("listing_photos")
      .select("listing_id, public_url, is_preview, sort_order")
      .in("listing_id", listingIds)
      .order("sort_order", { ascending: true });
    for (const p of (photos || []) as {
      listing_id: string;
      public_url: string;
      is_preview: boolean;
      sort_order: number;
    }[]) {
      const arr = photosByListing.get(p.listing_id) || [];
      arr.push({ public_url: p.public_url });
      photosByListing.set(p.listing_id, arr);
    }
  }

  const listings: ProfileListing[] = (
    (listingsRes.data || []) as ProfileListing[]
  ).map((l) => ({
    ...l,
    photos: photosByListing.get(l.id) || [],
  }));

  // Hydrate counterparty users + related listings for reviews
  const ofRows = (reviewsOfRes.data || []) as StayRow[];
  const byRows = (reviewsByRes.data || []) as StayRow[];
  const allRows = [...ofRows, ...byRows];

  const counterpartyIds = new Set<string>();
  const reviewListingIds = new Set<string>();
  for (const r of allRows) {
    reviewListingIds.add(r.listing_id);
    // For reviewsOf (as host), counterparty is the guest
    // For reviewsBy (as guest), counterparty is the host
    counterpartyIds.add(r.guest_id);
    counterpartyIds.add(r.host_id);
  }
  counterpartyIds.delete(user.id);

  const usersMap = new Map<
    string,
    { id: string; name: string; avatar_url: string | null }
  >();
  if (counterpartyIds.size > 0) {
    const { data: counterparties } = await supabase
      .from("users")
      .select("id, name, avatar_url")
      .in("id", [...counterpartyIds]);
    for (const u of (counterparties || []) as {
      id: string;
      name: string;
      avatar_url: string | null;
    }[]) {
      usersMap.set(u.id, u);
    }
  }

  const reviewListingsMap = new Map<
    string,
    { id: string; title: string; area_name: string }
  >();
  if (reviewListingIds.size > 0) {
    const { data: reviewListings } = await supabase
      .from("listings")
      .select("id, title, area_name")
      .in("id", [...reviewListingIds]);
    for (const l of (reviewListings || []) as {
      id: string;
      title: string;
      area_name: string;
    }[]) {
      reviewListingsMap.set(l.id, l);
    }
  }

  const mapReview = (r: StayRow, otherId: string): ProfileReview => ({
    id: r.id,
    rating: r.listing_rating,
    text: r.listing_review_text || r.review_text || "",
    created_at: r.created_at,
    other_user: usersMap.get(otherId) || null,
    listing: reviewListingsMap.get(r.listing_id) || null,
  });

  const reviewsOf = ofRows
    .map((r) => mapReview(r, r.guest_id))
    .filter((r) => r.text.trim().length > 0);

  const reviewsBy = byRows
    .map((r) => mapReview(r, r.host_id))
    .filter((r) => r.text.trim().length > 0);

  return { user, listings, reviewsOf, reviewsBy };
}

export async function getProfileByClerkId(
  clerkId: string
): Promise<ProfilePayload | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!data) return null;
  return getProfileById(data.id as string);
}
