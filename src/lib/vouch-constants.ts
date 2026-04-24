/**
 * Vouch constants for Alpha-C trust model.
 *
 * Uses the NEW bucket values from migration 014a (lt1, 1to3, etc.).
 * The old values (lt1yr, 1to3yr, etc.) are kept in the DB enum for backward
 * compat but should NOT be used by new code.
 *
 * `YEARS_KNOWN_BUCKETS` below is the *user-selectable* picker list —
 * `platform_met` (0.4×, added in 035a) is intentionally excluded
 * because it's auto-assigned by the post-stay vouch flow and is never
 * a manual choice. Labels + multipliers for the full enum (including
 * platform_met) live in `src/lib/trust/years-known-labels.ts`.
 */

import {
  yearsKnownMultiplier,
  type YearsKnownBucketAny,
} from "@/lib/trust/years-known-labels";

// Display labels were reworded in S8 ("Vouch"/"Vouch+") — the internal
// enum values stay `standard` / `inner_circle` everywhere (migrations,
// queries, RPC params) because a full rename would touch ~50+ sites
// with no functional change. All user-facing copy flows through these
// `label` + `description` fields.
export const VOUCH_TYPES = [
  {
    value: "standard" as const,
    label: "Vouch",
    description: "I know them",
    basePoints: 15,
  },
  {
    value: "inner_circle" as const,
    label: "Vouch+",
    description: "I know them very well",
    basePoints: 25,
  },
] as const;

export const YEARS_KNOWN_BUCKETS = [
  { value: "lt1" as const, label: "Less than 1 year", multiplier: 0.6 },
  { value: "1to3" as const, label: "1\u20133 years", multiplier: 1.0 },
  { value: "3to5" as const, label: "3\u20135 years", multiplier: 1.2 },
  { value: "5to10" as const, label: "5\u201310 years", multiplier: 1.5 },
  { value: "10plus" as const, label: "10+ years", multiplier: 1.8 },
] as const;

export const VOUCH_TYPE_POINTS = {
  standard: 15,
  inner_circle: 25,
} as const;

export type VouchType = "standard" | "inner_circle";
/** User-selectable buckets. DB rows may also carry `platform_met` —
 *  use `YearsKnownBucketAny` from years-known-labels for those. */
export type YearsKnownBucket = (typeof YEARS_KNOWN_BUCKETS)[number]["value"];

/** Map old DB bucket values to new Alpha-C values. `platform_met`
 *  flows through untouched so post-stay rows can round-trip. */
const BUCKET_MAP: Record<string, YearsKnownBucketAny> = {
  platform_met: "platform_met",
  lt1: "lt1",
  lt1yr: "lt1",
  "1to3": "1to3",
  "1to3yr": "1to3",
  "3to5": "3to5",
  "4to7yr": "3to5",
  "5to10": "5to10",
  "8to15yr": "5to10",
  "10plus": "10plus",
  "15plusyr": "10plus",
};

/** Normalize a legacy/canonical bucket to a pickable bucket.
 *  `platform_met` rows land on `lt1` since the picker has no
 *  platform_met slot — callers that need to *preserve* the raw
 *  DB value (e.g. for display) should use
 *  `yearsKnownLabel` from years-known-labels.ts instead. */
export function normalizeBucket(raw: string): YearsKnownBucket {
  const mapped = BUCKET_MAP[raw] ?? "lt1";
  return mapped === "platform_met" ? "lt1" : mapped;
}

/** Compute a vouch score client-side (mirrors the DB trigger logic).
 *  Accepts the full set of DB-origin bucket values so callers that
 *  hand in `platform_met` get the correct 0.4× multiplier. */
export function computeVouchScore(
  type: VouchType,
  bucket: YearsKnownBucketAny
): number {
  const base = VOUCH_TYPE_POINTS[type];
  return base * yearsKnownMultiplier(bucket);
}
