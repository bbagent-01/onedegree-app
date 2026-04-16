/**
 * Shared types for the Alpha-C trust computation engine.
 * Server-side only — never import from client components.
 */

export type VouchType = "standard" | "inner_circle";

export type YearsKnownBucket = "lt1" | "1to3" | "3to5" | "5to10" | "10plus";

export type VisibilityMode = "public" | "preview_gated" | "hidden";

export type AccessType = "anyone" | "min_score" | "max_degrees" | "specific_people";

export interface AccessRule {
  type: AccessType;
  threshold?: number;
  user_ids?: string[];
}

export interface AccessSettings {
  see_preview: AccessRule;
  see_full: AccessRule;
  request_book: AccessRule;
  message: AccessRule;
  request_intro: AccessRule;
  view_host_profile: AccessRule;
  /**
   * Preview content visibility toggles. Controls which pieces of
   * the listing are shown in preview mode (before a viewer unlocks
   * the full listing). Missing fields default to true (show).
   */
  preview_content?: PreviewContentSettings;
}

export interface PreviewContentSettings {
  /** Show the listing title (otherwise a generic "Private listing in [area]") */
  show_title?: boolean;
  /** Show price range ($min–$max / night) */
  show_price_range?: boolean;
  /** Show preview description (or truncated full description) */
  show_description?: boolean;
  /** Show host first name (otherwise "Hosted by a verified member") */
  show_host_first_name?: boolean;
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
   *  full listing description in preview mode. */
  use_preview_specific_description?: boolean;
}

export const DEFAULT_PREVIEW_CONTENT: PreviewContentSettings = {
  show_title: true,
  show_price_range: true,
  show_description: true,
  show_host_first_name: true,
  show_neighborhood: true,
  show_map_area: true,
  show_rating: true,
  show_amenities: true,
  show_bed_counts: true,
  show_house_rules: true,
  use_preview_specific_description: false,
};

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
  can_see_full: boolean;
  can_request_book: boolean;
  can_message: boolean;
  can_request_intro: boolean;
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
  see_full: { type: "min_score", threshold: 10 },
  request_book: { type: "min_score", threshold: 20 },
  message: { type: "min_score", threshold: 10 },
  request_intro: { type: "anyone" },
  view_host_profile: { type: "anyone" },
  preview_content: DEFAULT_PREVIEW_CONTENT,
};
