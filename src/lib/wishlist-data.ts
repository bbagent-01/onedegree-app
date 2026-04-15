import { getSupabaseAdmin } from "./supabase";
import type { BrowseListing, BrowseHost } from "./browse-data";
import type { ListingPhoto, ListingRow } from "./listing-data";
import { derivedExtras } from "./listing-derived";
import { parseListingMeta } from "./listing-meta";

/**
 * Return the set of listing IDs saved by a user. Used to render the heart
 * in its "filled" state on cards the user has already wishlisted.
 */
export async function getSavedListingIds(userId: string): Promise<Set<string>> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("saved_listings")
    .select("listing_id")
    .eq("user_id", userId);
  return new Set((data || []).map((r) => r.listing_id as string));
}

/**
 * Fetch all listings saved by a user, hydrated with photos + host for
 * LiveListingCard. Mirrors getBrowseListings shape exactly so the
 * wishlist page can reuse the same card component.
 */
export async function getSavedListings(
  userId: string
): Promise<BrowseListing[]> {
  const supabase = getSupabaseAdmin();

  const { data: savedRows } = await supabase
    .from("saved_listings")
    .select("listing_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const listingIds = (savedRows || []).map((r) => r.listing_id as string);
  if (listingIds.length === 0) return [];

  const { data: listings } = await supabase
    .from("listings")
    .select("*")
    .in("id", listingIds)
    .eq("is_active", true);

  if (!listings || listings.length === 0) return [];

  const rows = listings as ListingRow[];

  // Photos
  const { data: photoRows } = await supabase
    .from("listing_photos")
    .select("*")
    .in(
      "listing_id",
      rows.map((l) => l.id)
    )
    .order("sort_order", { ascending: true });

  const photosByListing = new Map<string, ListingPhoto[]>();
  for (const p of (photoRows || []) as ListingPhoto[]) {
    const arr = photosByListing.get(p.listing_id) || [];
    arr.push(p);
    photosByListing.set(p.listing_id, arr);
  }
  for (const arr of photosByListing.values()) {
    arr.sort((a, b) => {
      const ap = a.is_preview ? 0 : 1;
      const bp = b.is_preview ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
  }

  // Hosts
  const hostIds = [...new Set(rows.map((l) => l.host_id))];
  const { data: hosts } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .in("id", hostIds);

  const hostById = new Map<string, BrowseHost>();
  for (const h of hosts || []) hostById.set(h.id, h as BrowseHost);

  // Preserve wishlist order (most recently saved first).
  const orderMap = new Map(
    listingIds.map((id, idx) => [id, idx] as const)
  );

  const hydrated: BrowseListing[] = rows.map((l) => {
    const { meta } = parseListingMeta(l.description);
    const derived = derivedExtras(l.id, l.area_name, {
      bedrooms: meta.bedrooms,
      beds: meta.beds,
      bathrooms: meta.bathrooms,
      lat: meta.address?.lat,
      lng: meta.address?.lng,
    });
    return {
      id: l.id,
      title: l.title,
      area_name: l.area_name,
      property_type: l.property_type,
      description: l.description,
      price_min: l.price_min,
      price_max: l.price_max,
      avg_listing_rating: (l as unknown as { avg_listing_rating: number | null })
        .avg_listing_rating,
      listing_review_count:
        (l as unknown as { listing_review_count: number }).listing_review_count ??
        0,
      created_at: l.created_at,
      photos: photosByListing.get(l.id) || [],
      host: hostById.get(l.host_id) ?? null,
      amenities: l.amenities || [],
      ...derived,
    };
  });

  hydrated.sort(
    (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
  );

  return hydrated;
}
