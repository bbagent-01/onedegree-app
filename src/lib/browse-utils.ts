import type { BrowseListing, SortOption } from "./browse-data";
import type { MockListing } from "./mock-listings";

const PLACEHOLDER_IMG =
  "https://placehold.co/600x400/e2e8f0/475569?text=No+photo";

/** Parse & sanitize URL search params into a BrowseFilters object. */
export function parseBrowseParams(
  searchParams: Record<string, string | string[] | undefined>
): {
  location?: string;
  from?: string;
  to?: string;
  guests?: number;
  sort: SortOption;
} {
  const get = (k: string) => {
    const v = searchParams[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const sortRaw = get("sort");
  const sort: SortOption =
    sortRaw === "price_asc" ||
    sortRaw === "price_desc" ||
    sortRaw === "top_rated" ||
    sortRaw === "newest"
      ? sortRaw
      : "best_match";

  const guestsRaw = get("guests");
  const guests = guestsRaw ? Math.max(0, parseInt(guestsRaw, 10) || 0) : undefined;

  return {
    location: get("location")?.trim() || undefined,
    from: get("from") || undefined,
    to: get("to") || undefined,
    guests,
    sort,
  };
}

/** Adapt a live DB listing to the MockListing shape consumed by ListingCardB. */
export function adaptListingForCard(l: BrowseListing): MockListing & { href: string } {
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
