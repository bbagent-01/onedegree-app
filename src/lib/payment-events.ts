/**
 * Payment event helpers — per-reservation scheduled payment rows
 * live in the `payment_events` table (migration 030). This module
 * owns event creation, amount resolution, and date resolution.
 *
 * Booking-flow v2 Chunk 4.75 (thread-as-timeline).
 */

import { getSupabaseAdmin } from "./supabase";
import {
  parsePolicy,
  type CancellationPolicy,
  type PaymentScheduleEntry,
} from "./cancellation";

export type PaymentEventStatus =
  | "scheduled"
  | "claimed"
  | "confirmed"
  | "waived"
  | "refunded";

export interface PaymentEvent {
  id: string;
  contact_request_id: string;
  schedule_index: number;
  amount_cents: number;
  due_at: string;
  status: PaymentEventStatus;
  method: string | null;
  claimed_at: string | null;
  confirmed_at: string | null;
  note: string | null;
}

/** Today's date as YYYY-MM-DD in UTC — matches how contact_requests stores dates. */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Subtract N days from a YYYY-MM-DD date string. Returns YYYY-MM-DD.
 * Safe on Edge runtime — avoids Intl/TZ pipeline quirks.
 */
function shiftDate(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + deltaDays);
  return base.toISOString().slice(0, 10);
}

/**
 * Given a schedule entry + reservation context, compute the
 * concrete calendar date the payment is expected on.
 *
 *   booking              → today (the moment terms are accepted)
 *   days_before_checkin  → check_in − N days (clamped to today so
 *                          entries whose window already closed
 *                          still fire immediately)
 *   check_in             → check_in
 *
 * Falls back to today if check_in is missing for an entry that
 * needs it — graceful degradation over blowing up.
 */
export function resolveDueAt(
  entry: PaymentScheduleEntry,
  checkIn: string | null,
  acceptedOnISO: string = todayISO()
): string {
  if (entry.due_at === "booking") return acceptedOnISO;
  if (entry.due_at === "check_in") return checkIn ?? acceptedOnISO;
  // days_before_checkin
  if (!checkIn) return acceptedOnISO;
  const days = Math.max(0, entry.days_before_checkin ?? 0);
  const resolved = shiftDate(checkIn, -days);
  // Window already closed at accept-time (accepted super close to
  // check-in) — bring it forward to today so it's not stuck
  // perpetually "overdue" in the past.
  return resolved < acceptedOnISO ? acceptedOnISO : resolved;
}

/**
 * Resolve a schedule entry's amount to cents against the locked-in
 * reservation total. Percentages are rounded to the nearest cent.
 * Returns null when the entry can't be resolved (missing total for
 * a percentage row).
 */
export function resolveAmountCents(
  entry: PaymentScheduleEntry,
  totalEstimate: number | null
): number | null {
  if (entry.amount_type === "fixed") {
    return Math.max(0, Math.round(entry.amount * 100));
  }
  // percentage
  if (typeof totalEstimate !== "number" || totalEstimate <= 0) return null;
  const pct = Math.max(0, Math.min(100, entry.amount));
  return Math.max(0, Math.round(totalEstimate * 100 * (pct / 100)));
}

export interface CreateEventsResult {
  createdIds: string[];
  skipped: "already_exists" | "no_schedule" | "no_total" | null;
}

/**
 * Create `payment_events` rows for a reservation. Idempotent — if
 * events already exist for the contact_request, we return early
 * and report `skipped: "already_exists"`. Meant to be called from
 * accept-terms (once the guest confirms the snapshot).
 *
 * Pulls the snapshotted `cancellation_policy.payment_schedule` off
 * the contact_request. Skipping rules:
 *  - no payment_schedule at all → nothing to track (refunds-only
 *    policy or "handle myself") — treat as success with skipped.
 *  - percentage schedule but no total_estimate → can't resolve
 *    amounts, skip with a flag so caller can warn.
 */
export async function createPaymentEventsForRequest(
  contactRequestId: string
): Promise<CreateEventsResult> {
  const supabase = getSupabaseAdmin();

  // Check idempotency first — cheapest possible guard.
  const { data: existing } = await supabase
    .from("payment_events")
    .select("id")
    .eq("contact_request_id", contactRequestId)
    .limit(1);
  if (existing && existing.length > 0) {
    return { createdIds: [], skipped: "already_exists" };
  }

  const { data: request } = await supabase
    .from("contact_requests")
    .select("id, check_in, total_estimate, cancellation_policy, terms_accepted_at")
    .eq("id", contactRequestId)
    .maybeSingle();

  if (!request) return { createdIds: [], skipped: "no_schedule" };

  const policy: CancellationPolicy | null = parsePolicy(
    (request as { cancellation_policy?: unknown }).cancellation_policy ?? null
  );
  const schedule = policy?.payment_schedule ?? [];
  if (schedule.length === 0) {
    return { createdIds: [], skipped: "no_schedule" };
  }

  const total = (request as { total_estimate?: number | null }).total_estimate ?? null;
  const checkIn = (request as { check_in?: string | null }).check_in ?? null;
  const acceptedISO = (
    (request as { terms_accepted_at?: string | null }).terms_accepted_at ?? null
  )?.slice(0, 10) ?? todayISO();

  const rows = schedule
    .map((entry, i) => {
      const cents = resolveAmountCents(entry, total);
      if (cents === null) return null;
      return {
        contact_request_id: contactRequestId,
        schedule_index: i,
        amount_cents: cents,
        due_at: resolveDueAt(entry, checkIn, acceptedISO),
        status: "scheduled" as const,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) {
    return { createdIds: [], skipped: "no_total" };
  }

  const { data: inserted, error } = await supabase
    .from("payment_events")
    .insert(rows)
    .select("id");

  if (error) {
    // Race: another concurrent accept-terms beat us. The unique
    // constraint on (contact_request_id, schedule_index) will
    // reject duplicates — treat that as an idempotent success.
    if (error.code === "23505") {
      return { createdIds: [], skipped: "already_exists" };
    }
    throw error;
  }

  return {
    createdIds: (inserted || []).map((r) => r.id as string),
    skipped: null,
  };
}

/**
 * Fetch payment_events for a reservation, ordered by schedule_index
 * (which mirrors due_at for well-formed schedules).
 */
export async function getPaymentEventsForRequest(
  contactRequestId: string
): Promise<PaymentEvent[]> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("payment_events")
    .select(
      "id, contact_request_id, schedule_index, amount_cents, due_at, status, method, claimed_at, confirmed_at, note"
    )
    .eq("contact_request_id", contactRequestId)
    .order("schedule_index", { ascending: true });
  return (data || []) as PaymentEvent[];
}

/** "$1,234" from cents. Drops trailing zeros when whole dollars. */
export function formatCents(cents: number): string {
  const dollars = cents / 100;
  const whole = Number.isInteger(dollars);
  return `$${dollars.toLocaleString(undefined, {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
