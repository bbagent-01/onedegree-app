/**
 * Shared types for the Alpha-C trust computation engine.
 * Server-side only — never import from client components.
 */

export type VouchType = "standard" | "inner_circle";

export type YearsKnownBucket =
  | "platform_met"
  | "lt1"
  | "1to3"
  | "3to5"
  | "5to10"
  | "10plus";

export type VisibilityMode = "public" | "preview_gated" | "hidden";

/**
 * Access model:
 *
 * - "anyone_anywhere": logged-out viewers included. Only valid on the
 *                      outer `see_preview` gate — the inner
 *                      full_listing_contact gate always requires auth
 *                      (messaging and booking both need an identity).
 * - "anyone":          any signed-in user on the platform
 * - "min_score":       signed-in users whose 1° score ≥ threshold
 * - "max_degrees":     signed-in users within N degrees of the host
 *                      (1°/2°/3°). Re-enabled in CC-C5 Revisit;
 *                      complements min_score, does not replace it.
 * - "specific_people": only the listed user IDs
 */
export type AccessType =
  | "anyone_anywhere"
  | "anyone"
  | "min_score"
  | "max_degrees"
  | "specific_people";

export interface AccessRule {
  type: AccessType;
  /** min_score: minimum 1° score. max_degrees: maximum hops (1–3). */
  threshold?: number;
  user_ids?: string[];
}

/**
 * Two gates + one toggle. The old 6-action model
 * (see_preview, see_full, request_book, message, request_intro,
 * view_host_profile) collapsed down — request_book, message, and
 * view_host_profile all share the same gate as see_full and now live
 * under `full_listing_contact`. Intro requests are always allowed
 * from viewers who can see the preview, modulo the `allow_intro_requests`
 * toggle.
 */
export interface AccessSettings {
  /** Outer ring — who can see the preview card/photos. */
  see_preview: AccessRule;
  /**
   * Inner ring — full listing, direct messaging, and request-to-book
   * are one package. Must be at least as restrictive as see_preview.
   */
  full_listing_contact: AccessRule;
  /** When true, viewers who can see the preview can request an intro. */
  allow_intro_requests: boolean;
  /**
   * Preview content visibility toggles. Controls which pieces of
   * the listing are shown in preview mode (before a viewer unlocks
   * the full listing). Missing fields default to true (show).
   */
  preview_content?: PreviewContentSettings;

  // ── Legacy fields (read-only, retained for backwards compat with
  //    rows written under the old 6-action schema). Normalized into
  //    the collapsed model on read by `normalizeAccessSettings`.
  /** @deprecated — see `full_listing_contact`. */
  see_full?: AccessRule;
  /** @deprecated — see `full_listing_contact`. */
  request_book?: AccessRule;
  /** @deprecated — see `full_listing_contact`. */
  message?: AccessRule;
  /** @deprecated — see `allow_intro_requests` boolean. */
  request_intro?: AccessRule;
  /** @deprecated — always follows `full_listing_contact`. */
  view_host_profile?: AccessRule;
}

export interface PreviewContentSettings {
  /** Show the listing title (otherwise a generic "Private listing in [area]") */
  show_title?: boolean;
  /** Show price range ($min–$max / night) */
  show_price_range?: boolean;
  /** Show preview description (or truncated full description) */
  show_description?: boolean;
  /** Show host first name (otherwise "Hosted by a Trustead member") */
  show_host_first_name?: boolean;
  /** Show host profile photo (otherwise a silhouette placeholder) */
  show_profile_photo?: boolean;
  /** Show neighborhood / city */
  show_neighborhood?: boolean;
  /** Show approximate map area (blurred radius, no pin) */
  show_map_area?: boolean;
  /** Show listing rating and review count */
  show_rating?: boolean;
  /** Show amenities list */
  show_amenities?: boolean;
  /** Show bedroom / bed / bathroom counts */
  show_bed_counts?: boolean;
  /** Show house rules */
  show_house_rules?: boolean;
  /** When true, use the host-written preview_description instead of the
   *  full listing description in preview mode. Sub-option of the
   *  Description toggle in the listing form. */
  use_preview_specific_description?: boolean;
}

export const DEFAULT_PREVIEW_CONTENT: PreviewContentSettings = {
  show_title: true,
  show_price_range: true,
  show_description: true,
  show_host_first_name: true,
  show_profile_photo: true,
  show_neighborhood: true,
  show_map_area: true,
  show_rating: true,
  show_amenities: true,
  show_bed_counts: true,
  show_house_rules: true,
  use_preview_specific_description: false,
};

/**
 * Normalize a persisted access_settings row into the collapsed 2-gate
 * model. Handles both fresh rows (already have `full_listing_contact`)
 * and legacy 6-action rows (map the most restrictive of
 * see_full / message / request_book into full_listing_contact).
 */
export function normalizeAccessSettings(
  raw: Partial<AccessSettings> | null | undefined
): AccessSettings {
  const seePreview = normalizeRule(raw?.see_preview) ?? {
    type: "anyone",
  };

  // Already migrated — use as-is.
  if (raw?.full_listing_contact) {
    return {
      see_preview: seePreview,
      full_listing_contact:
        normalizeRule(raw.full_listing_contact) ??
        ({ type: "min_score", threshold: 10 } as AccessRule),
      allow_intro_requests: raw.allow_intro_requests ?? true,
      preview_content: raw.preview_content,
    };
  }

  // Legacy row — collapse see_full + message + request_book into the
  // most restrictive rule so no permission is accidentally granted.
  const legacyRules = [
    normalizeRule(raw?.see_full),
    normalizeRule(raw?.message),
    normalizeRule(raw?.request_book),
  ].filter((r): r is AccessRule => Boolean(r));
  const collapsedInner =
    legacyRules.reduce<AccessRule | null>(
      (acc, r) => (acc == null ? r : mostRestrictive(acc, r)),
      null
    ) ?? ({ type: "min_score", threshold: 10 } as AccessRule);

  return {
    see_preview: seePreview,
    full_listing_contact: collapsedInner,
    // Legacy request_intro rule present with anything other than
    // explicit "specific_people: []" counts as allowed.
    allow_intro_requests: raw?.request_intro
      ? !(
          raw.request_intro.type === "specific_people" &&
          (raw.request_intro.user_ids?.length ?? 0) === 0
        )
      : true,
    preview_content: raw?.preview_content,
  };
}

function normalizeRule(rule: AccessRule | undefined): AccessRule | undefined {
  if (!rule) return undefined;
  // max_degrees is live again — clamp threshold to [1, 3].
  if (rule.type === "max_degrees") {
    const raw = rule.threshold ?? 2;
    const clamped = Math.max(1, Math.min(3, Math.round(raw)));
    return { type: "max_degrees", threshold: clamped };
  }
  return rule;
}

/** The more restrictive of two rules. Used when collapsing legacy
 *  6-action settings into the 2-gate model. */
function mostRestrictive(a: AccessRule, b: AccessRule): AccessRule {
  const rank = (r: AccessRule) => {
    if (r.type === "anyone") return 0;
    if (r.type === "min_score") return 1 + (r.threshold ?? 0);
    // max_degrees: tighter = smaller N. Rank 1°→100, 2°→50, 3°→25
    // so it outranks any practical min_score threshold.
    if (r.type === "max_degrees")
      return 25 * (4 - Math.max(1, Math.min(3, r.threshold ?? 2)));
    if (r.type === "specific_people") return 9999;
    return 0;
  };
  return rank(a) >= rank(b) ? a : b;
}

export interface HydratedConnector {
  id: string;
  name: string;
  avatar_url: string | null;
}

export interface TrustPath {
  connector_id: string;
  connector?: HydratedConnector;
  viewer_vouch_score: number;
  connector_vouch_score: number;
  connector_vouch_power: number;
  /** link_a = viewer's vouch score for the connector (same as viewer_vouch_score) */
  link_a: number;
  /** link_b = connector_vouch_score × connector_vouch_power */
  link_b: number;
  /** path_strength = avg(link_a, link_b) */
  path_strength: number;
  /** 1-based rank after sorting all paths descending by path_strength */
  rank: number;
  /** Harmonic weight = 1 / rank */
  weight: number;
  /** weighted_score = path_strength × weight */
  weighted_score: number;
}

export interface DegreesResult {
  degrees: number | null;
}

export interface BatchDegreesResult {
  target_id: string;
  degrees: number | null;
}

export interface OneDegreeResult {
  score: number;
  paths: TrustPath[];
  connection_count: number;
}

export interface ListingAccessResult {
  can_see_preview: boolean;
  /** Full listing + direct message + request to book — one package. */
  can_see_full: boolean;
  /**
   * True when the viewer can request an intro from the host
   * (host toggle + can_see_preview).
   */
  can_request_intro: boolean;

  // ── Derived aliases kept for backwards compatibility with call
  //    sites that still read the old 6-field result. They mirror
  //    can_see_full verbatim.
  can_request_book: boolean;
  can_message: boolean;
  can_view_host_profile: boolean;
}

export interface VouchPowerResult {
  vouch_power: number;
  vouchee_count: number;
  avg_guest_rating: number | null;
}

/** Vouch score constants */
export const VOUCH_BASE_POINTS: Record<VouchType, number> = {
  standard: 15,
  inner_circle: 25,
};

export const YEARS_MULTIPLIER: Record<string, number> = {
  // Platform-originated post-stay vouches (migration 035a). Smaller
  // than lt1's 0.6× so "Met on Trustead" doesn't masquerade as a
  // genuine sub-1-year IRL relationship.
  platform_met: 0.4,
  lt1: 0.6,
  "1to3": 1.0,
  "3to5": 1.2,
  "5to10": 1.5,
  "10plus": 1.8,
  // Legacy bucket values (from migration 001) — mapped to nearest new bracket
  lt1yr: 0.6,
  "1to3yr": 1.0,
  "4to7yr": 1.2,
  "8to15yr": 1.5,
  "15plusyr": 1.8,
};

/**
 * Default access_settings for new listings.
 * Preview is open to everyone; full listing and actions are gated by
 * 1° vouch score so the visibility mechanic is visible from day one.
 */
export const DEFAULT_ACCESS_SETTINGS: AccessSettings = {
  see_preview: { type: "anyone" },
  full_listing_contact: { type: "min_score", threshold: 15 },
  allow_intro_requests: true,
  preview_content: DEFAULT_PREVIEW_CONTENT,
};
