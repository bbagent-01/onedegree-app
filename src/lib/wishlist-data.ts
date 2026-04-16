import { getSupabaseAdmin } from "./supabase";
import type { BrowseListing, BrowseHost } from "./browse-data";
import type { ListingPhoto, ListingRow } from "./listing-data";
import { derivedExtras } from "./listing-derived";
import { parseListingMeta } from "./listing-meta";

export interface WishlistSummary {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  item_count: number;
  cover_photos: string[]; // up to 4 preview photos for the collection card
}

export interface WishlistWithItems {
  wishlist: WishlistSummary;
  items: BrowseListing[];
}

/**
 * Ensure the given user has a default "Saved" wishlist. Returns the
 * default list's id. Called lazily the first time a user hearts
 * something post-migration-012.
 */
export async function ensureDefaultWishlist(userId: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data: created, error } = await supabase
    .from("wishlists")
    .insert({ user_id: userId, name: "Saved", is_default: true })
    .select("id")
    .single();
  if (error || !created) throw new Error("Failed to create default wishlist");
  return created.id as string;
}

/**
 * Listing IDs the user has saved anywhere — across all wishlists.
 * Used to render the "any list contains this" heart fill state.
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
 * All wishlists owned by the user with a live item count and up to 4
 * cover photos drawn from the most-recently-saved items.
 */
export async function getUserWishlists(
  userId: string
): Promise<WishlistSummary[]> {
  const supabase = getSupabaseAdmin();

  const { data: lists } = await supabase
    .from("wishlists")
    .select("id, name, is_default, created_at, updated_at")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (!lists || lists.length === 0) return [];

  const listIds = lists.map((l) => l.id as string);

  const { data: savedRows } = await supabase
    .from("saved_listings")
    .select("wishlist_id, listing_id, created_at")
    .in("wishlist_id", listIds)
    .order("created_at", { ascending: false });

  const rowsByList = new Map<
    string,
    { listing_id: string; created_at: string }[]
  >();
  for (const row of (savedRows || []) as {
    wishlist_id: string;
    listing_id: string;
    created_at: string;
  }[]) {
    const arr = rowsByList.get(row.wishlist_id) || [];
    arr.push({ listing_id: row.listing_id, created_at: row.created_at });
    rowsByList.set(row.wishlist_id, arr);
  }

  // Collect all listing IDs we need cover photos for (max 4 per list).
  const coverListingIds = new Set<string>();
  for (const rows of rowsByList.values()) {
    for (const r of rows.slice(0, 4)) coverListingIds.add(r.listing_id);
  }

  const coverByListing = new Map<string, string>();
  if (coverListingIds.size > 0) {
    const { data: photos } = await supabase
      .from("listing_photos")
      .select("listing_id, public_url, is_preview, sort_order")
      .in("listing_id", [...coverListingIds])
      .order("sort_order", { ascending: true });

    for (const p of (photos || []) as {
      listing_id: string;
      public_url: string;
      is_preview: boolean;
    }[]) {
      if (!coverByListing.has(p.listing_id)) {
        coverByListing.set(p.listing_id, p.public_url);
      }
      if (p.is_preview) {
        coverByListing.set(p.listing_id, p.public_url);
      }
    }
  }

  return lists.map((l) => {
    const rows = rowsByList.get(l.id as string) || [];
    const covers = rows
      .slice(0, 4)
      .map((r) => coverByListing.get(r.listing_id))
      .filter((x): x is string => typeof x === "string" && x.length > 0);
    return {
      id: l.id as string,
      name: l.name as string,
      is_default: !!l.is_default,
      created_at: l.created_at as string,
      updated_at: l.updated_at as string,
      item_count: rows.length,
      cover_photos: covers,
    };
  });
}

/** For a specific listing, return the set of wishlist IDs that contain it. */
export async function getWishlistsContainingListing(
  userId: string,
  listingId: string
): Promise<Set<string>> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("saved_listings")
    .select("wishlist_id")
    .eq("user_id", userId)
    .eq("listing_id", listingId);
  return new Set((data || []).map((r) => r.wishlist_id as string));
}

/**
 * Fetch a single wishlist with all its items hydrated for the grid.
 */
export async function getWishlistWithItems(
  userId: string,
  wishlistId: string
): Promise<WishlistWithItems | null> {
  const supabase = getSupabaseAdmin();

  const { data: list } = await supabase
    .from("wishlists")
    .select("id, name, is_default, created_at, updated_at")
    .eq("id", wishlistId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!list) return null;

  const { data: savedRows } = await supabase
    .from("saved_listings")
    .select("listing_id, created_at")
    .eq("wishlist_id", wishlistId)
    .order("created_at", { ascending: false });

  const listingIds = (savedRows || []).map((r) => r.listing_id as string);

  let items: BrowseListing[] = [];
  let coverPhotos: string[] = [];

  if (listingIds.length > 0) {
    items = await hydrateListings(listingIds);
    coverPhotos = items
      .slice(0, 4)
      .map((i) => i.photos[0]?.public_url)
      .filter((x): x is string => typeof x === "string");
  }

  return {
    wishlist: {
      id: list.id as string,
      name: list.name as string,
      is_default: !!list.is_default,
      created_at: list.created_at as string,
      updated_at: list.updated_at as string,
      item_count: listingIds.length,
      cover_photos: coverPhotos,
    },
    items,
  };
}

/**
 * Hydrate a set of listing IDs into BrowseListing shape for grid cards.
 * Preserves input ordering.
 */
async function hydrateListings(
  listingIds: string[]
): Promise<BrowseListing[]> {
  if (listingIds.length === 0) return [];
  const supabase = getSupabaseAdmin();

  const { data: listings } = await supabase
    .from("listings")
    .select("*")
    .in("id", listingIds)
    .eq("is_active", true);

  if (!listings || listings.length === 0) return [];
  const rows = listings as ListingRow[];

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

  const hostIds = [...new Set(rows.map((l) => l.host_id))];
  const { data: hosts } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .in("id", hostIds);
  const hostById = new Map<string, BrowseHost>();
  for (const h of hosts || []) hostById.set(h.id, h as BrowseHost);

  const orderMap = new Map(listingIds.map((id, idx) => [id, idx] as const));

  const hydrated: BrowseListing[] = rows.map((l) => {
    const { meta } = parseListingMeta(l.description);
    const derived = derivedExtras(l.id, l.area_name, {
      bedrooms: meta.bedrooms,
      beds: meta.beds,
      bathrooms: meta.bathrooms,
      lat: meta.address?.lat,
      lng: meta.address?.lng,
    });
    const extras = l as unknown as {
      avg_listing_rating: number | null;
      listing_review_count: number;
      min_trust_gate: number | null;
      visibility_mode: string | null;
      preview_description: string | null;
      access_settings: import("./trust/types").AccessSettings | null;
    };
    return {
      id: l.id,
      title: l.title,
      area_name: l.area_name,
      property_type: l.property_type,
      description: l.description,
      price_min: l.price_min,
      price_max: l.price_max,
      avg_listing_rating: extras.avg_listing_rating,
      listing_review_count: extras.listing_review_count ?? 0,
      created_at: l.created_at,
      photos: photosByListing.get(l.id) || [],
      host: hostById.get(l.host_id) ?? null,
      host_id: l.host_id,
      min_trust_gate: extras.min_trust_gate ?? 0,
      amenities: l.amenities || [],
      visibility_mode: extras.visibility_mode ?? "preview_gated",
      preview_description: extras.preview_description ?? null,
      access_settings: extras.access_settings ?? null,
      ...derived,
    };
  });

  hydrated.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
  return hydrated;
}
