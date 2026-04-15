import type { BrowseFilters, BrowseListing, SortOption } from "./browse-data";
import type { MockListing } from "./mock-listings";

const PLACEHOLDER_IMG =
  "https://placehold.co/600x400/e2e8f0/475569?text=No+photo";

/** Parse & sanitize URL search params into a BrowseFilters object. */
export function parseBrowseParams(
  searchParams: Record<string, string | string[] | undefined>
): BrowseFilters & { sort: SortOption } {
  const get = (k: string) => {
    const v = searchParams[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const sortRaw = get("sort");
  const sort: SortOption =
    sortRaw === "price_asc" ||
    sortRaw === "price_desc" ||
    sortRaw === "top_rated" ||
    sortRaw === "newest" ||
    sortRaw === "trust_desc"
      ? sortRaw
      : "best_match";

  const num = (k: string): number | undefined => {
    const v = get(k);
    if (!v) return undefined;
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const csv = (k: string): string[] | undefined => {
    const v = get(k);
    if (!v) return undefined;
    const arr = v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return arr.length > 0 ? arr : undefined;
  };

  return {
    location: get("location")?.trim() || undefined,
    from: get("from") || undefined,
    to: get("to") || undefined,
    guests: num("guests"),
    sort,
    priceMin: num("pmin"),
    priceMax: num("pmax"),
    propertyTypes: csv("ptype"),
    bedrooms: num("br"),
    beds: num("bd"),
    bathrooms: num("ba"),
    amenities: csv("am"),
    minTrust: num("trust"),
  };
}

/** Count of active "advanced" filters (excludes core search params). */
export function activeFilterCount(f: BrowseFilters): number {
  let count = 0;
  if (typeof f.priceMin === "number") count++;
  if (typeof f.priceMax === "number") count++;
  if (f.propertyTypes && f.propertyTypes.length > 0) count++;
  if (f.bedrooms) count++;
  if (f.beds) count++;
  if (f.bathrooms) count++;
  if (f.amenities && f.amenities.length > 0) count++;
  if (typeof f.minTrust === "number" && f.minTrust > 0) count++;
  return count;
}

/** Adapt a live DB listing to the MockListing shape consumed by ListingCardB. */
export function adaptListingForCard(
  l: BrowseListing
): MockListing & { href: string } {
  const images = l.photos.length
    ? l.photos.map((p) => p.public_url)
    : [PLACEHOLDER_IMG];

  const price = l.price_min ?? l.price_max ?? 0;

  return {
    id: l.id,
    title: l.title,
    location: l.area_name,
    distance: l.property_type
      ? l.property_type[0].toUpperCase() + l.property_type.slice(1)
      : "",
    dates: l.host ? `Hosted by ${l.host.name}` : "",
    price,
    rating: l.avg_listing_rating ?? 0,
    reviewCount: l.listing_review_count ?? 0,
    images,
    trustScore: 0,
    connectionLabel: null,
    isSuperhost: false,
    category: l.property_type,
    href: `/listings/${l.id}`,
  };
}
