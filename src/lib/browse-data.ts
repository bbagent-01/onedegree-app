import { getSupabaseAdmin } from "./supabase";
import type { ListingPhoto, ListingRow } from "./listing-data";
import { derivedExtras } from "./listing-derived";
import { parseListingMeta } from "./listing-meta";

export interface BrowseHost {
  id: string;
  name: string;
  avatar_url: string | null;
  /** Host's average rating from past stays. null if no reviews yet. */
  host_rating: number | null;
  /** Number of reviews the host has received. */
  host_review_count: number;
  /** Host's platform-wide vouch score (users.vouch_score, 0-10).
   *  Feeds the TrustBadge's vouch chip. */
  vouch_score: number | null;
}

export interface BrowseListing {
  id: string;
  title: string;
  area_name: string;
  property_type: string;
  description: string | null;
  price_min: number | null;
  price_max: number | null;
  avg_listing_rating: number | null;
  listing_review_count: number;
  created_at: string;
  photos: ListingPhoto[];
  host: BrowseHost | null;
  host_id: string;
  /**
   * Host-set trust gate (listings.min_trust_gate). A viewer can see
   * full details only if their computed trust score to the host is
   * >= this value. 0 = visible to the entire network.
   */
  min_trust_gate: number;
  amenities: string[];
  bedrooms: number;
  beds: number;
  bathrooms: number;
  latitude: number;
  longitude: number;
  /** Visibility mode: public | preview_gated | hidden */
  visibility_mode: string;
  /** Host-written preview description (200 char max) */
  preview_description: string | null;
  /** Per-action access rules (JSONB from DB) */
  access_settings: import("./trust/types").AccessSettings | null;
}

export type SortOption =
  | "best_match"
  | "price_asc"
  | "price_desc"
  | "top_rated"
  | "newest"
  | "trust_desc";

export interface BrowseFilters {
  location?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  guests?: number;
  sort?: SortOption;
  priceMin?: number;
  priceMax?: number;
  propertyTypes?: string[];
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
  amenities?: string[];
  /**
   * Minimum viewer trust score to the host. Applied as a client-side
   * filter (after trust paths are computed) because trust is not a
   * column on the listings table.
   */
  minTrust?: number;
  /** When true, only show listings where the viewer has full access. */
  fullAccessOnly?: boolean;
}

/**
 * Fetch all active listings with photos and host profile.
 * Pure Airbnb clone — no visibility gating, no trust scoring.
 * Applies optional filters and sorts the results.
 */
export async function getBrowseListings(
  filters: BrowseFilters = {}
): Promise<BrowseListing[]> {
  const supabase = getSupabaseAdmin();

  let query = supabase.from("listings").select("*").eq("is_active", true)
    .or("visibility_mode.neq.hidden,visibility_mode.is.null");

  if (filters.location && filters.location.trim().length > 0) {
    const term = filters.location.trim().replace(/[%,]/g, "");
    query = query.or(
      `title.ilike.%${term}%,area_name.ilike.%${term}%,description.ilike.%${term}%`
    );
  }

  if (filters.propertyTypes && filters.propertyTypes.length > 0) {
    query = query.in("property_type", filters.propertyTypes);
  }

  if (typeof filters.priceMin === "number") {
    query = query.gte("price_min", filters.priceMin);
  }
  if (typeof filters.priceMax === "number") {
    query = query.lte("price_min", filters.priceMax);
  }

  if (filters.amenities && filters.amenities.length > 0) {
    query = query.contains("amenities", filters.amenities);
  }

  const { data: listings, error } = await query;
  if (error || !listings) return [];

  let filtered = listings as ListingRow[];

  // Date-range filter: exclude listings with a blocked availability window.
  if (filters.from && filters.to) {
    const { data: blocks } = await supabase
      .from("listing_availability")
      .select("listing_id, start_date, end_date, status")
      .in(
        "listing_id",
        filtered.map((l) => l.id)
      )
      .eq("status", "blocked")
      .lte("start_date", filters.to)
      .gte("end_date", filters.from);

    if (blocks && blocks.length > 0) {
      const blockedIds = new Set(blocks.map((b) => b.listing_id));
      filtered = filtered.filter((l) => !blockedIds.has(l.id));
    }
  }

  if (filtered.length === 0) return [];

  // Photos
  const { data: photoRows } = await supabase
    .from("listing_photos")
    .select("*")
    .in(
      "listing_id",
      filtered.map((l) => l.id)
    )
    .order("sort_order", { ascending: true });

  const photosByListing = new Map<string, ListingPhoto[]>();
  for (const p of (photoRows || []) as ListingPhoto[]) {
    const arr = photosByListing.get(p.listing_id) || [];
    arr.push(p);
    photosByListing.set(p.listing_id, arr);
  }
  // Sort each listing's photos: cover first, then preview photos, then rest.
  for (const arr of photosByListing.values()) {
    arr.sort((a, b) => {
      const ac = a.is_cover ? 0 : 1;
      const bc = b.is_cover ? 0 : 1;
      if (ac !== bc) return ac - bc;
      const ap = a.is_preview ? 0 : 1;
      const bp = b.is_preview ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
  }

  // Hosts
  const hostIds = [...new Set(filtered.map((l) => l.host_id))];
  const { data: hosts } = await supabase
    .from("users")
    .select("id, name, avatar_url, host_rating, host_review_count, vouch_score")
    .in("id", hostIds);

  const hostById = new Map<string, BrowseHost>();
  for (const h of hosts || []) {
    const row = h as {
      id: string;
      name: string;
      avatar_url: string | null;
      host_rating: number | null;
      host_review_count: number | null;
      vouch_score: number | null;
    };
    hostById.set(row.id, {
      id: row.id,
      name: row.name,
      avatar_url: row.avatar_url,
      host_rating: row.host_rating ?? null,
      host_review_count: row.host_review_count ?? 0,
      vouch_score: row.vouch_score ?? null,
    });
  }

  let results: BrowseListing[] = filtered.map((l) => {
    const { meta } = parseListingMeta(l.description);
    // S10.5 (mig 045): prefer the new real columns, fall back to meta.
    const lr = l as unknown as Record<string, unknown>;
    const num = (k: string) =>
      typeof lr[k] === "number"
        ? (lr[k] as number)
        : typeof lr[k] === "string"
          ? Number(lr[k])
          : undefined;
    const derived = derivedExtras(l.id, l.area_name, {
      bedrooms: num("bedrooms") ?? meta.bedrooms,
      beds: num("beds") ?? meta.beds,
      bathrooms: num("bathrooms") ?? meta.bathrooms,
      lat: num("lat") ?? meta.address?.lat,
      lng: num("lng") ?? meta.address?.lng,
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

  // Derived-field filters (bedrooms/beds/bathrooms come from listing-derived).
  if (filters.bedrooms) {
    results = results.filter((r) => r.bedrooms >= filters.bedrooms!);
  }
  if (filters.beds) {
    results = results.filter((r) => r.beds >= filters.beds!);
  }
  if (filters.bathrooms) {
    results = results.filter((r) => r.bathrooms >= filters.bathrooms!);
  }

  // Sort
  const sort = filters.sort ?? "best_match";
  results.sort((a, b) => {
    switch (sort) {
      case "price_asc":
        return (a.price_min ?? Infinity) - (b.price_min ?? Infinity);
      case "price_desc":
        return (b.price_min ?? -Infinity) - (a.price_min ?? -Infinity);
      case "top_rated":
        return (b.avg_listing_rating ?? 0) - (a.avg_listing_rating ?? 0);
      case "newest":
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case "trust_desc":
        // Trust-based sort happens in the server component after we've
        // attached scores — fall through to best_match here as a stable
        // tiebreaker so cards don't jitter when trust ties.
        return 0;
      case "best_match":
      default: {
        const now = Date.now();
        const days = 1000 * 60 * 60 * 24;
        const recencyA = Math.max(
          0,
          20 - (now - new Date(a.created_at).getTime()) / (days * 4.5)
        );
        const recencyB = Math.max(
          0,
          20 - (now - new Date(b.created_at).getTime()) / (days * 4.5)
        );
        const ratingA = (a.avg_listing_rating ?? 0) * 20;
        const ratingB = (b.avg_listing_rating ?? 0) * 20;
        return ratingB + recencyB - (ratingA + recencyA);
      }
    }
  });

  return results;
}

/** Returns distinct area_names and titles for location autocomplete. */
export async function getBrowseSuggestions(): Promise<{
  areas: string[];
  titles: string[];
}> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("listings")
    .select("title, area_name")
    .eq("is_active", true);

  const areas = [
    ...new Set(
      ((data || []) as { area_name: string }[])
        .map((r) => r.area_name)
        .filter(Boolean)
    ),
  ].sort();
  const titles = ((data || []) as { title: string }[])
    .map((r) => r.title)
    .filter(Boolean);

  return { areas, titles };
}

/**
 * Returns the total number of listings that match the given filters.
 * Mirrors getBrowseListings' filtering logic but skips photos/hosts/sort.
 * Used by the filter sheet to show a live "Show N places" count.
 */
export async function countBrowseListings(
  filters: BrowseFilters = {}
): Promise<number> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("listings")
    .select("id, amenities")
    .eq("is_active", true);

  if (filters.location && filters.location.trim().length > 0) {
    const term = filters.location.trim().replace(/[%,]/g, "");
    query = query.or(
      `title.ilike.%${term}%,area_name.ilike.%${term}%,description.ilike.%${term}%`
    );
  }
  if (filters.propertyTypes && filters.propertyTypes.length > 0) {
    query = query.in("property_type", filters.propertyTypes);
  }
  if (typeof filters.priceMin === "number") {
    query = query.gte("price_min", filters.priceMin);
  }
  if (typeof filters.priceMax === "number") {
    query = query.lte("price_min", filters.priceMax);
  }
  if (filters.amenities && filters.amenities.length > 0) {
    query = query.contains("amenities", filters.amenities);
  }

  const { data, error } = await query;
  if (error || !data) return 0;

  // Derived-field filters (bedrooms/beds/bathrooms come from listing-derived).
  let rows = data as { id: string }[];
  if (filters.bedrooms || filters.beds || filters.bathrooms) {
    rows = rows.filter((r) => {
      const d = derivedExtras(r.id, "");
      if (filters.bedrooms && d.bedrooms < filters.bedrooms) return false;
      if (filters.beds && d.beds < filters.beds) return false;
      if (filters.bathrooms && d.bathrooms < filters.bathrooms) return false;
      return true;
    });
  }
  return rows.length;
}

/**
 * Returns price histogram buckets for the current filtered listing set,
 * ignoring the price filter itself so the slider bounds reflect what's
 * actually available after location / property type / amenity filters.
 */
export async function getBrowsePriceRange(
  filters: BrowseFilters = {}
): Promise<{
  min: number;
  max: number;
  histogram: number[];
}> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("listings")
    .select("price_min")
    .eq("is_active", true);

  if (filters.location && filters.location.trim().length > 0) {
    const term = filters.location.trim().replace(/[%,]/g, "");
    query = query.or(
      `title.ilike.%${term}%,area_name.ilike.%${term}%,description.ilike.%${term}%`
    );
  }
  if (filters.propertyTypes && filters.propertyTypes.length > 0) {
    query = query.in("property_type", filters.propertyTypes);
  }
  if (filters.amenities && filters.amenities.length > 0) {
    query = query.contains("amenities", filters.amenities);
  }

  const { data } = await query;

  const prices = ((data || []) as { price_min: number | null }[])
    .map((r) => r.price_min)
    .filter((p): p is number => typeof p === "number" && p > 0);

  if (prices.length === 0) {
    return { min: 10, max: 1000, histogram: new Array(30).fill(0) };
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const buckets = 30;
  const histogram = new Array(buckets).fill(0);
  const span = Math.max(1, max - min);
  for (const p of prices) {
    const idx = Math.min(buckets - 1, Math.floor(((p - min) / span) * buckets));
    histogram[idx]++;
  }
  return { min, max, histogram };
}
