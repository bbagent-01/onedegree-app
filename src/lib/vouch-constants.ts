export const YEARS_KNOWN_BUCKETS = [
  { value: "lt1yr", label: "Less than 1 year", multiplier: 0.6 },
  { value: "1to3yr", label: "1–3 years", multiplier: 0.8 },
  { value: "4to7yr", label: "4–7 years", multiplier: 1.0 },
  { value: "8to15yr", label: "8–15 years", multiplier: 1.4 },
  { value: "15plusyr", label: "15+ years", multiplier: 1.8 },
] as const;

export const VOUCH_TYPE_POINTS = {
  standard: 15,
  inner_circle: 25,
} as const;

export type VouchType = keyof typeof VOUCH_TYPE_POINTS;
export type YearsKnownBucket = (typeof YEARS_KNOWN_BUCKETS)[number]["value"];
