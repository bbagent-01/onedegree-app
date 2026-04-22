/**
 * Canonical label + multiplier map for `years_known_bucket`.
 *
 * Covers every DB enum value, including `platform_met` — a
 * non-selectable bucket auto-assigned to post-stay "Met on 1° B&B"
 * vouches. The user-facing picker in VouchModal still shows only
 * the five IRL buckets (lt1 → 10plus); platform_met is locked in
 * by ReviewFlowDialog / VouchModal-post-stay under the hood.
 */

export type YearsKnownBucketAny =
  | "platform_met"
  | "lt1"
  | "1to3"
  | "3to5"
  | "5to10"
  | "10plus";

export const YEARS_KNOWN_LABELS: Record<YearsKnownBucketAny, string> = {
  platform_met: "Met through this platform",
  lt1: "Less than 1 year",
  "1to3": "1\u20133 years",
  "3to5": "3\u20135 years",
  "5to10": "5\u201310 years",
  "10plus": "10+ years",
};

export const YEARS_KNOWN_MULTIPLIERS: Record<YearsKnownBucketAny, number> = {
  platform_met: 0.4,
  lt1: 0.6,
  "1to3": 1.0,
  "3to5": 1.2,
  "5to10": 1.5,
  "10plus": 1.8,
};

/** Map the old legacy enum values (pre-014a) to their modern equivalents. */
const LEGACY_ALIASES: Record<string, YearsKnownBucketAny> = {
  lt1yr: "lt1",
  "1to3yr": "1to3",
  "4to7yr": "3to5",
  "8to15yr": "5to10",
  "15plusyr": "10plus",
};

function canonicalize(raw: string): YearsKnownBucketAny | null {
  if (raw in YEARS_KNOWN_LABELS) return raw as YearsKnownBucketAny;
  if (raw in LEGACY_ALIASES) return LEGACY_ALIASES[raw];
  return null;
}

export function yearsKnownLabel(raw: string | null | undefined): string {
  if (!raw) return "";
  const key = canonicalize(raw);
  return key ? YEARS_KNOWN_LABELS[key] : raw;
}

export function yearsKnownMultiplier(
  raw: string | null | undefined
): number {
  if (!raw) return 1.0;
  const key = canonicalize(raw);
  return key ? YEARS_KNOWN_MULTIPLIERS[key] : 1.0;
}
