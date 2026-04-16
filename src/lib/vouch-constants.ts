/**
 * Vouch constants for Alpha-C trust model.
 *
 * Uses the NEW bucket values from migration 014a (lt1, 1to3, etc.).
 * The old values (lt1yr, 1to3yr, etc.) are kept in the DB enum for backward
 * compat but should NOT be used by new code.
 */

export const VOUCH_TYPES = [
  {
    value: "standard" as const,
    label: "Standard",
    description: "I know them and would trust them in my home",
    basePoints: 15,
  },
  {
    value: "inner_circle" as const,
    label: "Inner Circle",
    description: "They're basically family",
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
export type YearsKnownBucket = (typeof YEARS_KNOWN_BUCKETS)[number]["value"];

/** Map old DB bucket values to new Alpha-C values. */
const BUCKET_MAP: Record<string, YearsKnownBucket> = {
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

export function normalizeBucket(raw: string): YearsKnownBucket {
  return BUCKET_MAP[raw] ?? "lt1";
}

/** Compute a vouch score client-side (mirrors the DB trigger logic). */
export function computeVouchScore(
  type: VouchType,
  bucket: YearsKnownBucket
): number {
  const base = VOUCH_TYPE_POINTS[type];
  const mult =
    YEARS_KNOWN_BUCKETS.find((b) => b.value === bucket)?.multiplier ?? 1.0;
  return base * mult;
}
