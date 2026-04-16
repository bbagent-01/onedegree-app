// Track B listing metadata helper.
//
// The shared `listings` table has no columns for guests/bedrooms/beds/baths,
// street address, lat/lng, place kind, cleaning fee, etc. Rather than alter
// the Track A schema, we encode those Airbnb-clone-only fields as a small
// JSON blob inside an HTML comment at the top of `description`.
//
// Format: <!--meta:{...}-->\n\nactual description
//
// This is Track B only and never leaks to Track A reads because Track A
// strips/ignores the comment when rendering.

export interface ListingMeta {
  placeKind?: "entire" | "private" | "shared";
  propertyLabel?: string; // "House" | "Apartment" | "Condo" | ...
  guests?: number;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    lat?: number;
    lng?: number;
  };
  cleaningFee?: number;
  // Extended description sections (Airbnb-style)
  propertyOverview?: string;
  guestAccess?: string;
  interactionWithGuests?: string;
  otherDetails?: string;
  // Pricing extras
  weeklyDiscount?: number; // percentage
  monthlyDiscount?: number; // percentage
  // Default availability behavior (CC-C3)
  defaultAvailability?: "available" | "unavailable" | "possibly";
}

const META_RE = /^<!--meta:(\{.*?\})-->\s*\n?/;

export function parseListingMeta(
  description: string | null | undefined
): { meta: ListingMeta; body: string } {
  if (!description) return { meta: {}, body: "" };
  const m = description.match(META_RE);
  if (!m) return { meta: {}, body: description };
  try {
    const meta = JSON.parse(m[1]) as ListingMeta;
    return { meta, body: description.slice(m[0].length) };
  } catch {
    return { meta: {}, body: description };
  }
}

export function encodeListingMeta(meta: ListingMeta, body: string): string {
  const clean: ListingMeta = {};
  for (const [k, v] of Object.entries(meta)) {
    if (v === undefined || v === null || v === "") continue;
    (clean as Record<string, unknown>)[k] = v;
  }
  if (Object.keys(clean).length === 0) return body || "";
  return `<!--meta:${JSON.stringify(clean)}-->\n\n${body || ""}`;
}

// Map a UI-facing property label to the DB constraint value.
// Schema only allows: 'apartment' | 'house' | 'room' | 'other'
export function propertyTypeToDb(
  label: string,
  placeKind?: "entire" | "private" | "shared"
): "apartment" | "house" | "room" | "other" {
  if (placeKind === "private" || placeKind === "shared") return "room";
  const l = label.toLowerCase();
  if (l === "apartment" || l === "condo") return "apartment";
  if (l === "house" || l === "townhouse" || l === "cabin") return "house";
  return "other";
}
