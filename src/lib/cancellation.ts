/**
 * Cancellation policy — preset definitions + pure resolvers.
 *
 * Three-level inheritance: host default → per-listing override →
 * per-reservation snapshot at accept time. The effective policy
 * resolver is a simple coalesce (first non-null wins).
 *
 * A policy JSON shape:
 *   {
 *     preset: 'flexible' | 'moderate' | 'strict' | 'custom',
 *     windows: CancellationWindow[],  // ordered by cutoff desc
 *     custom_note: string | null
 *   }
 *
 * `windows` is the authoritative schedule — the preset name is
 * cosmetic (used for labels + switching). A window reads as:
 *   "if days_until_checkin >= cutoff, the refund is refund_pct%".
 *
 * Schedule windows are always sorted descending by cutoff so the
 * resolver can walk them once and pick the first qualifying entry.
 */

export type CancellationPreset = "flexible" | "moderate" | "strict" | "custom";

export interface CancellationWindow {
  cutoff_days_before_checkin: number;
  refund_pct: number;
}

export interface CancellationPolicy {
  preset: CancellationPreset;
  windows: CancellationWindow[];
  custom_note: string | null;
}

export interface CancellationPresetMeta {
  key: Exclude<CancellationPreset, "custom">;
  label: string;
  summary: string;
  windows: CancellationWindow[];
}

/**
 * Preset library. Borrowed from Airbnb's taxonomy (Flexible /
 * Moderate / Strict) and adapted to an off-platform payment model —
 * the app doesn't actually issue refunds; hosts + guests use the
 * schedule as a shared source of truth when settling up directly.
 */
export const CANCELLATION_PRESETS: CancellationPresetMeta[] = [
  {
    key: "flexible",
    label: "Flexible",
    summary:
      "Full refund up to 24 hours before check-in. After that, no refund.",
    windows: [
      { cutoff_days_before_checkin: 1, refund_pct: 100 },
      { cutoff_days_before_checkin: 0, refund_pct: 0 },
    ],
  },
  {
    key: "moderate",
    label: "Moderate",
    summary:
      "Full refund up to 5 days before check-in, 50% up to 24 hours before, then no refund.",
    windows: [
      { cutoff_days_before_checkin: 5, refund_pct: 100 },
      { cutoff_days_before_checkin: 1, refund_pct: 50 },
      { cutoff_days_before_checkin: 0, refund_pct: 0 },
    ],
  },
  {
    key: "strict",
    label: "Strict",
    summary:
      "Full refund up to 14 days before check-in, 50% up to 7 days before, then no refund.",
    windows: [
      { cutoff_days_before_checkin: 14, refund_pct: 100 },
      { cutoff_days_before_checkin: 7, refund_pct: 50 },
      { cutoff_days_before_checkin: 0, refund_pct: 0 },
    ],
  },
];

export const DEFAULT_CANCELLATION_PRESET: Exclude<
  CancellationPreset,
  "custom"
> = "moderate";

/** Factory: build a full policy JSON from a preset key. */
export function buildPolicyFromPreset(
  preset: Exclude<CancellationPreset, "custom">,
  customNote: string | null = null
): CancellationPolicy {
  const meta = CANCELLATION_PRESETS.find((p) => p.key === preset);
  if (!meta) {
    // Shouldn't happen — fall back to the platform default.
    return buildPolicyFromPreset(DEFAULT_CANCELLATION_PRESET, customNote);
  }
  return {
    preset,
    windows: meta.windows,
    custom_note: customNote,
  };
}

/** Parse a stored JSONB value into a strongly-typed policy. Returns
 *  null if the shape doesn't look like a valid policy. */
export function parsePolicy(raw: unknown): CancellationPolicy | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const preset = obj.preset as CancellationPreset | undefined;
  if (
    preset !== "flexible" &&
    preset !== "moderate" &&
    preset !== "strict" &&
    preset !== "custom"
  ) {
    return null;
  }
  const windows = Array.isArray(obj.windows) ? (obj.windows as unknown[]) : [];
  const parsedWindows: CancellationWindow[] = windows
    .map((w) => {
      if (!w || typeof w !== "object") return null;
      const o = w as Record<string, unknown>;
      const cutoff = Number(o.cutoff_days_before_checkin);
      const refund = Number(o.refund_pct);
      if (!Number.isFinite(cutoff) || !Number.isFinite(refund)) return null;
      return {
        cutoff_days_before_checkin: Math.max(0, Math.floor(cutoff)),
        refund_pct: Math.max(0, Math.min(100, Math.floor(refund))),
      };
    })
    .filter((x): x is CancellationWindow => x !== null)
    // Force descending cutoff ordering — required by computeRefund.
    .sort(
      (a, b) => b.cutoff_days_before_checkin - a.cutoff_days_before_checkin
    );

  // A preset row with no windows is valid (we'll expand from the
  // preset library). A custom preset with no windows isn't useful
  // but we'll let it through and return 0 refund for everything.
  if (parsedWindows.length === 0 && preset !== "custom") {
    const fromPreset = CANCELLATION_PRESETS.find((p) => p.key === preset);
    if (fromPreset) {
      parsedWindows.push(...fromPreset.windows);
    }
  }

  return {
    preset,
    windows: parsedWindows,
    custom_note:
      typeof obj.custom_note === "string"
        ? (obj.custom_note as string)
        : null,
  };
}

/**
 * Pick the effective policy for a reservation given the three
 * possible layers. Most specific wins:
 *   reservation snapshot > listing override > host default > platform default.
 */
export function resolveEffectivePolicy(args: {
  hostDefault: unknown;
  listingOverride: unknown;
  reservationSnapshot: unknown;
}): CancellationPolicy {
  return (
    parsePolicy(args.reservationSnapshot) ??
    parsePolicy(args.listingOverride) ??
    parsePolicy(args.hostDefault) ??
    buildPolicyFromPreset(DEFAULT_CANCELLATION_PRESET)
  );
}

/** Days from `asOf` to `checkIn`, in whole days. Negative when
 *  check-in has already passed. YYYY-MM-DD strings only. */
export function daysUntilCheckIn(
  checkIn: string,
  asOf: string = new Date().toISOString().slice(0, 10)
): number {
  const [y1, m1, d1] = asOf.slice(0, 10).split("-").map(Number);
  const [y2, m2, d2] = checkIn.slice(0, 10).split("-").map(Number);
  const a = Date.UTC(y1, (m1 ?? 1) - 1, d1 ?? 1);
  const b = Date.UTC(y2, (m2 ?? 1) - 1, d2 ?? 1);
  return Math.round((b - a) / 86400000);
}

export interface RefundQuote {
  refund_pct: number;
  window_matched: CancellationWindow | null;
  days_until_checkin: number;
  past_checkin: boolean;
}

/**
 * Given a policy + a check-in date + today, return the refund
 * percentage that applies if the guest cancels right now. Walks
 * the windows from highest cutoff down and returns the first one
 * whose cutoff is still in the future; otherwise returns 0.
 */
export function computeRefund(
  policy: CancellationPolicy,
  checkIn: string | null,
  asOf: string = new Date().toISOString().slice(0, 10)
): RefundQuote {
  if (!checkIn) {
    return {
      refund_pct: 100,
      window_matched: null,
      days_until_checkin: Infinity,
      past_checkin: false,
    };
  }
  const days = daysUntilCheckIn(checkIn, asOf);
  if (days < 0) {
    // Stay already started — cancellation past check-in has no
    // refund by convention on every preset.
    return {
      refund_pct: 0,
      window_matched: null,
      days_until_checkin: days,
      past_checkin: true,
    };
  }
  // Windows sorted desc by cutoff. Pick the first that `days`
  // still exceeds.
  for (const w of policy.windows) {
    if (days >= w.cutoff_days_before_checkin) {
      return {
        refund_pct: w.refund_pct,
        window_matched: w,
        days_until_checkin: days,
        past_checkin: false,
      };
    }
  }
  return {
    refund_pct: 0,
    window_matched: null,
    days_until_checkin: days,
    past_checkin: false,
  };
}

/** Human label for the preset. */
export function presetLabel(preset: CancellationPreset): string {
  if (preset === "custom") return "Custom";
  const meta = CANCELLATION_PRESETS.find((p) => p.key === preset);
  return meta?.label ?? preset;
}
