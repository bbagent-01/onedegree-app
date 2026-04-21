/**
 * Cancellation & payment policy.
 *
 * 1° B&B never custodies, processes, or refunds money — every
 * transaction moves host↔guest off-platform. This module encodes
 * the two mental models hosts actually use, and treats the policy
 * as expectation-setting guidance rather than an enforceable
 * contract the app can execute.
 *
 * The two approaches:
 *
 *   A. installments
 *      Host collects in installments on a schedule. Once a
 *      payment is collected, it's implicitly nonrefundable.
 *      "Cancellation policy" = collection timing.
 *
 *   B. refunds
 *      Host collects the full amount up front, then refunds
 *      on a schedule if the guest cancels. Matches the Airbnb
 *      mental model.
 *
 * Both approaches share the same preset labels (Flexible /
 * Moderate / Strict / Custom). Picking a preset applies a
 * template appropriate to the chosen approach.
 *
 * Storage (JSONB):
 *   {
 *     approach: 'installments' | 'refunds',
 *     preset: 'flexible' | 'moderate' | 'strict' | 'custom',
 *     payment_schedule: PaymentScheduleEntry[],   // used by installments
 *     refund_schedule: RefundWindow[],            // used by refunds
 *     security_deposit: PaymentScheduleEntry[],
 *     custom_note: string | null
 *   }
 *
 * Unused fields stay as empty arrays so every parsed policy is
 * self-describing regardless of approach.
 */

export type CancellationApproach = "installments" | "refunds";

export type CancellationPreset = "flexible" | "moderate" | "strict" | "custom";

export type DueAt = "booking" | "days_before_checkin" | "check_in";

export type AmountType = "percentage" | "fixed";

export interface PaymentScheduleEntry {
  due_at: DueAt;
  /** Only meaningful when `due_at === "days_before_checkin"`. */
  days_before_checkin?: number;
  amount_type: AmountType;
  amount: number;
}

export interface RefundWindow {
  cutoff_days_before_checkin: number;
  refund_pct: number;
}

export interface CancellationPolicy {
  approach: CancellationApproach;
  preset: CancellationPreset;
  payment_schedule: PaymentScheduleEntry[];
  refund_schedule: RefundWindow[];
  security_deposit: PaymentScheduleEntry[];
  custom_note: string | null;
}

interface PresetTemplate {
  payment_schedule: PaymentScheduleEntry[];
  refund_schedule: RefundWindow[];
}

/**
 * Preset templates, nested by approach. Each cell is what the
 * settings form should drop in when the host picks a preset.
 *
 * Installments collects over time and says "once paid, done."
 * Refunds collects 100% up front and issues refunds off a
 * cancellation schedule.
 */
const PRESET_TEMPLATES: Record<
  CancellationApproach,
  Record<Exclude<CancellationPreset, "custom">, PresetTemplate>
> = {
  installments: {
    flexible: {
      payment_schedule: [
        { due_at: "check_in", amount_type: "percentage", amount: 100 },
      ],
      refund_schedule: [],
    },
    moderate: {
      payment_schedule: [
        {
          due_at: "days_before_checkin",
          days_before_checkin: 5,
          amount_type: "percentage",
          amount: 50,
        },
        { due_at: "check_in", amount_type: "percentage", amount: 50 },
      ],
      refund_schedule: [],
    },
    strict: {
      payment_schedule: [
        { due_at: "booking", amount_type: "percentage", amount: 100 },
      ],
      refund_schedule: [],
    },
  },
  refunds: {
    flexible: {
      payment_schedule: [
        { due_at: "booking", amount_type: "percentage", amount: 100 },
      ],
      refund_schedule: [
        { cutoff_days_before_checkin: 1, refund_pct: 100 },
        { cutoff_days_before_checkin: 0, refund_pct: 0 },
      ],
    },
    moderate: {
      payment_schedule: [
        { due_at: "booking", amount_type: "percentage", amount: 100 },
      ],
      refund_schedule: [
        { cutoff_days_before_checkin: 5, refund_pct: 100 },
        { cutoff_days_before_checkin: 1, refund_pct: 50 },
        { cutoff_days_before_checkin: 0, refund_pct: 0 },
      ],
    },
    strict: {
      payment_schedule: [
        { due_at: "booking", amount_type: "percentage", amount: 100 },
      ],
      refund_schedule: [
        { cutoff_days_before_checkin: 14, refund_pct: 100 },
        { cutoff_days_before_checkin: 7, refund_pct: 50 },
        { cutoff_days_before_checkin: 0, refund_pct: 0 },
      ],
    },
  },
};

export interface CancellationPresetMeta {
  key: Exclude<CancellationPreset, "custom">;
  label: string;
  /** Approach-specific summary — the same preset name means
   *  different collection timing under installments vs refunds. */
  summary: Record<CancellationApproach, string>;
}

export const CANCELLATION_PRESETS: CancellationPresetMeta[] = [
  {
    key: "flexible",
    label: "Flexible",
    summary: {
      installments:
        "Collect the full amount at check-in. Nothing is due before the guest arrives.",
      refunds:
        "Collect full payment up front. Full refund up to 24 hours before check-in.",
    },
  },
  {
    key: "moderate",
    label: "Moderate",
    summary: {
      installments:
        "Half a few days before check-in, the rest on arrival.",
      refunds:
        "Collect full payment up front. Full refund up to 5 days before; 50% up to 24 hours before.",
    },
  },
  {
    key: "strict",
    label: "Strict",
    summary: {
      installments:
        "Full payment at time of booking. Treat each payment as nonrefundable once collected.",
      refunds:
        "Collect full payment up front. Full refund up to 14 days before; 50% up to 7 days before.",
    },
  },
];

export const DEFAULT_CANCELLATION_APPROACH: CancellationApproach =
  "installments";
export const DEFAULT_CANCELLATION_PRESET: Exclude<
  CancellationPreset,
  "custom"
> = "moderate";

/** Factory: build a full policy from an approach + preset. */
export function buildPolicyFromPreset(
  approach: CancellationApproach,
  preset: Exclude<CancellationPreset, "custom">,
  opts: {
    customNote?: string | null;
    securityDeposit?: PaymentScheduleEntry[];
  } = {}
): CancellationPolicy {
  const tpl = PRESET_TEMPLATES[approach][preset];
  return {
    approach,
    preset,
    payment_schedule: tpl.payment_schedule.map((e) => ({ ...e })),
    refund_schedule: tpl.refund_schedule.map((e) => ({ ...e })),
    security_deposit: (opts.securityDeposit ?? []).map((e) => ({ ...e })),
    custom_note:
      typeof opts.customNote === "string" ? opts.customNote : null,
  };
}

// ── Parsers ──

function parsePaymentEntry(raw: unknown): PaymentScheduleEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const dueAt = o.due_at;
  if (
    dueAt !== "booking" &&
    dueAt !== "days_before_checkin" &&
    dueAt !== "check_in"
  ) {
    return null;
  }
  const amountType = o.amount_type;
  if (amountType !== "percentage" && amountType !== "fixed") return null;
  const amount = Number(o.amount);
  if (!Number.isFinite(amount)) return null;
  const entry: PaymentScheduleEntry = {
    due_at: dueAt as DueAt,
    amount_type: amountType as AmountType,
    amount:
      amountType === "percentage"
        ? Math.max(0, Math.min(100, amount))
        : Math.max(0, amount),
  };
  if (dueAt === "days_before_checkin") {
    const days = Number(o.days_before_checkin);
    entry.days_before_checkin = Number.isFinite(days)
      ? Math.max(0, Math.floor(days))
      : 0;
  }
  return entry;
}

function parseRefundWindow(raw: unknown): RefundWindow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const cutoff = Number(o.cutoff_days_before_checkin);
  const refund = Number(o.refund_pct);
  if (!Number.isFinite(cutoff) || !Number.isFinite(refund)) return null;
  return {
    cutoff_days_before_checkin: Math.max(0, Math.floor(cutoff)),
    refund_pct: Math.max(0, Math.min(100, Math.floor(refund))),
  };
}

/** Parse a stored JSONB policy into a strongly-typed shape. */
export function parsePolicy(raw: unknown): CancellationPolicy | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const approach =
    obj.approach === "installments" || obj.approach === "refunds"
      ? (obj.approach as CancellationApproach)
      : DEFAULT_CANCELLATION_APPROACH;

  const preset =
    obj.preset === "flexible" ||
    obj.preset === "moderate" ||
    obj.preset === "strict" ||
    obj.preset === "custom"
      ? (obj.preset as CancellationPreset)
      : DEFAULT_CANCELLATION_PRESET;

  let payment_schedule = Array.isArray(obj.payment_schedule)
    ? (obj.payment_schedule as unknown[])
        .map(parsePaymentEntry)
        .filter((x): x is PaymentScheduleEntry => x !== null)
    : [];

  let refund_schedule = Array.isArray(obj.refund_schedule)
    ? (obj.refund_schedule as unknown[])
        .map(parseRefundWindow)
        .filter((x): x is RefundWindow => x !== null)
        .sort(
          (a, b) => b.cutoff_days_before_checkin - a.cutoff_days_before_checkin
        )
    : [];

  // Expand an empty non-custom preset from the template library so
  // downstream rendering always has something to show.
  if (
    preset !== "custom" &&
    payment_schedule.length === 0 &&
    refund_schedule.length === 0
  ) {
    const tpl = PRESET_TEMPLATES[approach][preset];
    payment_schedule = tpl.payment_schedule.map((e) => ({ ...e }));
    refund_schedule = tpl.refund_schedule.map((e) => ({ ...e }));
  }

  const security_deposit = Array.isArray(obj.security_deposit)
    ? (obj.security_deposit as unknown[])
        .map(parsePaymentEntry)
        .filter((x): x is PaymentScheduleEntry => x !== null)
    : [];

  return {
    approach,
    preset,
    payment_schedule,
    refund_schedule,
    security_deposit,
    custom_note:
      typeof obj.custom_note === "string" ? (obj.custom_note as string) : null,
  };
}

/**
 * Pick the effective policy for a reservation. Most specific wins:
 * reservation snapshot > listing override > host default >
 * platform default (installments / Moderate).
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
    buildPolicyFromPreset(
      DEFAULT_CANCELLATION_APPROACH,
      DEFAULT_CANCELLATION_PRESET
    )
  );
}

// ── Rendering helpers ────────────────────────────────────────

export function presetLabel(preset: CancellationPreset): string {
  if (preset === "custom") return "Custom";
  const meta = CANCELLATION_PRESETS.find((p) => p.key === preset);
  return meta?.label ?? preset;
}

export function approachLabel(approach: CancellationApproach): string {
  return approach === "installments"
    ? "Collect in installments"
    : "Collect up front, refund on cancellation";
}

/** Human phrase for the due_at column on a payment schedule row. */
export function dueAtLabel(entry: PaymentScheduleEntry): string {
  if (entry.due_at === "booking") return "At time of booking";
  if (entry.due_at === "check_in") return "At check-in";
  const days = entry.days_before_checkin ?? 0;
  if (days === 0) return "Day of check-in";
  if (days === 1) return "1 day before check-in";
  return `${days} days before check-in`;
}

/** Human phrase for an amount row ("50%", "$200"). */
export function amountLabel(entry: PaymentScheduleEntry): string {
  if (entry.amount_type === "percentage") {
    return `${Math.round(entry.amount)}%`;
  }
  return `$${Math.round(entry.amount).toLocaleString()}`;
}

/** Human phrase for a refund-window cutoff. */
export function refundCutoffLabel(w: RefundWindow): string {
  const d = w.cutoff_days_before_checkin;
  if (d === 0) return "Day of check-in onward";
  if (d === 1) return "Up to 24 hours before check-in";
  return `Up to ${d} days before check-in`;
}

/** Platform disclaimers. Used in one or more places everywhere
 *  the policy surfaces, so copy stays consistent. */
export const PLATFORM_NEUTRALITY_NOTE =
  "1° B&B doesn't process payments or manage refunds. This is guidance to help you and your counterpart set expectations.";

export const OFF_PLATFORM_PAYMENT_NOTE =
  "Because payment is handled off-platform, we recommend collecting money whenever it should be nonrefundable.";
