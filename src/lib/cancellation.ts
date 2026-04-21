/**
 * Cancellation + payment schedule.
 *
 * 1° B&B doesn't hold or refund money — every payment moves host↔
 * guest off-platform. "Cancellation policy" is therefore expressed
 * as a PAYMENT SCHEDULE: when the host collects money from the
 * guest. The implicit contract is that money already collected is
 * nonrefundable unless the host chooses otherwise. Hosts pick a
 * preset as a template, then edit rows directly.
 *
 * Three-level inheritance: host default → per-listing override →
 * per-reservation snapshot at accept time. Resolver returns the
 * first non-null layer, falling back to the Moderate template as
 * the platform default.
 *
 * Storage shape (JSONB):
 *   {
 *     preset: 'flexible' | 'moderate' | 'strict' | 'custom',
 *     payment_schedule: PaymentScheduleEntry[],
 *     security_deposit: PaymentScheduleEntry[],  // optional, usually []
 *     custom_note: string | null
 *   }
 *
 * A PaymentScheduleEntry has:
 *   - due_at: "booking" | "days_before_checkin" | "check_in"
 *   - days_before_checkin?: number (only when due_at = 'days_before_checkin')
 *   - amount_type: "percentage" | "fixed"
 *   - amount: number (0-100 if percentage, dollars if fixed)
 */

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

export interface CancellationPolicy {
  preset: CancellationPreset;
  payment_schedule: PaymentScheduleEntry[];
  security_deposit: PaymentScheduleEntry[];
  custom_note: string | null;
}

export interface CancellationPresetMeta {
  key: Exclude<CancellationPreset, "custom">;
  label: string;
  summary: string;
  payment_schedule: PaymentScheduleEntry[];
}

/**
 * Preset library. Each preset is a template — hosts can edit the
 * rows after applying it, which is why the UI treats the preset
 * name as a label rather than the source of truth.
 *
 * The thesis: since payment moves off-platform, "cancellation
 * terms" are really a collection schedule. Collect early = strict,
 * late = flexible.
 */
export const CANCELLATION_PRESETS: CancellationPresetMeta[] = [
  {
    key: "flexible",
    label: "Flexible",
    summary:
      "Collect the full amount at check-in. Guests aren't on the hook for anything until they arrive.",
    payment_schedule: [
      { due_at: "check_in", amount_type: "percentage", amount: 100 },
    ],
  },
  {
    key: "moderate",
    label: "Moderate",
    summary:
      "Half up front a few days before check-in, the rest at arrival.",
    payment_schedule: [
      {
        due_at: "days_before_checkin",
        days_before_checkin: 5,
        amount_type: "percentage",
        amount: 50,
      },
      { due_at: "check_in", amount_type: "percentage", amount: 50 },
    ],
  },
  {
    key: "strict",
    label: "Strict",
    summary:
      "Full amount at time of booking. Nothing is refundable once collected.",
    payment_schedule: [
      { due_at: "booking", amount_type: "percentage", amount: 100 },
    ],
  },
];

export const DEFAULT_CANCELLATION_PRESET: Exclude<
  CancellationPreset,
  "custom"
> = "moderate";

/** Factory: build a full policy from a preset key. */
export function buildPolicyFromPreset(
  preset: Exclude<CancellationPreset, "custom">,
  opts: {
    customNote?: string | null;
    securityDeposit?: PaymentScheduleEntry[];
  } = {}
): CancellationPolicy {
  const meta = CANCELLATION_PRESETS.find((p) => p.key === preset);
  const scheduleRef = meta?.payment_schedule ?? [];
  // Clone so downstream mutations don't leak back into the const.
  return {
    preset,
    payment_schedule: scheduleRef.map((e) => ({ ...e })),
    security_deposit: (opts.securityDeposit ?? []).map((e) => ({ ...e })),
    custom_note:
      typeof opts.customNote === "string" ? opts.customNote : null,
  };
}

/** Validate + normalize a single schedule row. Returns null if the
 *  row is unusable (unknown due_at, NaN amount, etc.). */
function parseEntry(raw: unknown): PaymentScheduleEntry | null {
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

/** Parse a stored JSONB policy into a strongly-typed shape.
 *  Returns null if the shape is unrecognizable. */
export function parsePolicy(raw: unknown): CancellationPolicy | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const preset = obj.preset;
  if (
    preset !== "flexible" &&
    preset !== "moderate" &&
    preset !== "strict" &&
    preset !== "custom"
  ) {
    return null;
  }

  const scheduleRaw = Array.isArray(obj.payment_schedule)
    ? (obj.payment_schedule as unknown[])
    : [];
  const depositRaw = Array.isArray(obj.security_deposit)
    ? (obj.security_deposit as unknown[])
    : [];

  let payment_schedule = scheduleRaw
    .map(parseEntry)
    .filter((x): x is PaymentScheduleEntry => x !== null);

  // Preset row with no valid schedule — expand from the template
  // library so downstream rendering always has something to show.
  if (payment_schedule.length === 0 && preset !== "custom") {
    const meta = CANCELLATION_PRESETS.find((p) => p.key === preset);
    if (meta) payment_schedule = meta.payment_schedule.map((e) => ({ ...e }));
  }

  const security_deposit = depositRaw
    .map(parseEntry)
    .filter((x): x is PaymentScheduleEntry => x !== null);

  return {
    preset: preset as CancellationPreset,
    payment_schedule,
    security_deposit,
    custom_note:
      typeof obj.custom_note === "string" ? (obj.custom_note as string) : null,
  };
}

/**
 * Pick the effective policy for a reservation. Most specific wins:
 * reservation snapshot > listing override > host default >
 * platform default (Moderate).
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

// ── Rendering helpers ────────────────────────────────────────

export function presetLabel(preset: CancellationPreset): string {
  if (preset === "custom") return "Custom";
  const meta = CANCELLATION_PRESETS.find((p) => p.key === preset);
  return meta?.label ?? preset;
}

/** Human phrase for the due_at column on a schedule row. */
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

/** Platform disclaimer, kept in one place so every surface that
 *  renders a policy uses the same language. */
export const OFF_PLATFORM_PAYMENT_NOTE =
  "Because payment is handled off-platform, we recommend collecting money whenever it should be nonrefundable.";
