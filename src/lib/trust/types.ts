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
  path_strength: number;
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

/** Default access_settings for new listings */
export const DEFAULT_ACCESS_SETTINGS: AccessSettings = {
  see_preview: { type: "anyone" },
  see_full: { type: "min_score", threshold: 10 },
  request_book: { type: "min_score", threshold: 20 },
  message: { type: "min_score", threshold: 10 },
  request_intro: { type: "anyone" },
  view_host_profile: { type: "anyone" },
};
