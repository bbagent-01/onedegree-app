/**
 * Booking / stay timeline resolver.
 *
 * Pure function — given a contact_request + optional stay_confirmation,
 * produces the ordered list of timeline stages with each stage's
 * status (done / current / upcoming / skipped) so the TripTimeline
 * component can render a vertical stepper.
 *
 * Stages 3–4 (payment + terms) render as "coming soon" placeholders
 * until BOOKING_FLOW_V2_PLAN.md Chunks 3–4 land. The resolver's
 * shape is future-proofed so wiring them up later is a matter of
 * filling in the condition predicates, not restructuring output.
 */

export type StageStatus =
  | "done"
  | "current"
  | "upcoming"
  | "skipped"
  | "future-feature";

export type StageKey =
  | "requested"
  | "terms_sent"
  | "terms_accepted"
  | "declined"
  | "cancelled"
  | "payment"
  | "upcoming"
  | "checked_in"
  | "checked_out"
  | "reviewed";

/**
 * Minimal payment_events shape the resolver needs. Matches the
 * subset selected by ThreadDetail / TripTimeline callers.
 */
export interface PaymentEventForStage {
  id: string;
  schedule_index: number;
  amount_cents: number;
  due_at: string;
  status: "scheduled" | "claimed" | "confirmed" | "waived" | "refunded";
}

export interface TimelineStage {
  key: StageKey;
  label: string;
  status: StageStatus;
  /** ISO timestamp the stage was reached. Rendered as a relative or
   *  absolute date on the stepper. */
  at?: string | null;
  /** Short per-stage detail line (e.g. "Payment arranged directly",
   *  "Stay ends Mon, Apr 28"). */
  detail?: string | null;
  /** Render a red-dot badge beside the stage label. Used by the
   *  S4 Chunk 5 "open issue" surface to flag during-stay stages. */
  badge?: "alert" | null;
}

export interface ResolveInput {
  /** status: pending | accepted | declined | cancelled */
  status: string | null;
  check_in: string | null;
  check_out: string | null;
  created_at: string | null;
  responded_at: string | null;
  /** When the guest clicked "Accept terms" after the host sent the
   *  offer. Null = offer has not been confirmed yet. Drives the
   *  "Terms accepted" stage. */
  terms_accepted_at?: string | null;
  /** Viewer's perspective — drives the "reviewed" stage completion. */
  viewer_role: "guest" | "host";
  stay_confirmation: {
    guest_rating: number | null;
    host_rating: number | null;
  } | null;
  /** Per-payment rows — when present, the single "Payment" stage
   *  expands into one stage per event. Ordered by schedule_index. */
  payment_events?: PaymentEventForStage[] | null;
  /** True when there's at least one `open` issue_report on the
   *  booking. Drives the alert badge on the during-stay / checked-
   *  out stages. */
  has_open_issue?: boolean;
}

/** Today in YYYY-MM-DD (UTC — matches how the DB stores dates). */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Formats a date column like "2026-04-28" as "Mon, Apr 28". Safe on
 * nulls. Edge runtime: we avoid the Intl date pipeline mismatches
 * by constructing a UTC date from the YYYY-MM-DD pieces directly.
 */
function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function resolveStages(input: ResolveInput): TimelineStage[] {
  const {
    status,
    check_in,
    check_out,
    created_at,
    responded_at,
    terms_accepted_at,
    viewer_role,
    stay_confirmation,
  } = input;

  const today = todayISO();
  const isAccepted = status === "accepted";
  const isDeclined = status === "declined";
  const isCancelled = status === "cancelled";
  const isPending = !status || status === "pending";
  const termsAccepted = Boolean(terms_accepted_at);

  // Date-derived flags. Guarded with isAccepted — only accepted
  // requests move through the stay-in-progress stages.
  const checkInDate = check_in ?? null;
  const checkOutDate = check_out ?? null;
  const preCheckIn =
    isAccepted && checkInDate !== null && today < checkInDate;
  const inStay =
    isAccepted &&
    checkInDate !== null &&
    checkOutDate !== null &&
    today >= checkInDate &&
    today <= checkOutDate;
  const postStay =
    isAccepted && checkOutDate !== null && today > checkOutDate;

  // stay_confirmations column semantics (not obvious from names):
  //   - host_rating  = the guest's rating of the host (stored as
  //                    "host_rating" because that's what it rates)
  //   - guest_rating = the host's rating of the guest
  // So the viewer's own submitted review lands in the opposite
  // column from their role.
  const myRating =
    viewer_role === "guest"
      ? stay_confirmation?.host_rating ?? null
      : stay_confirmation?.guest_rating ?? null;
  const otherRating =
    viewer_role === "guest"
      ? stay_confirmation?.guest_rating ?? null
      : stay_confirmation?.host_rating ?? null;

  // Stage 1: Requested — always done once the request exists.
  const s1: TimelineStage = {
    key: "requested",
    label: "Request sent",
    status: "done",
    at: created_at,
    detail: isPending ? "Waiting on host response" : null,
  };

  // Stage 2: Terms sent (was "Approved" — renamed to match the
  // flow where host approval IS the terms offer to the guest).
  let s2: TimelineStage;
  if (isDeclined) {
    s2 = {
      key: "declined",
      label: "Declined",
      status: "done",
      at: responded_at,
      detail: "Host declined this request",
    };
  } else if (isCancelled) {
    s2 = {
      key: "cancelled",
      label: "Cancelled",
      status: "done",
      at: responded_at,
      detail: "Request was cancelled",
    };
  } else if (isAccepted) {
    s2 = {
      key: "terms_sent",
      label: "Terms sent",
      status: "done",
      at: responded_at,
      detail: termsAccepted
        ? "Host sent their offer"
        : viewer_role === "guest"
          ? "Review and accept to confirm your stay"
          : "Waiting on guest to accept",
    };
  } else {
    s2 = {
      key: "terms_sent",
      label: "Awaiting host",
      status: "current",
      detail: "Host hasn't sent terms yet",
    };
  }

  // Terminal branches short-circuit the rest of the timeline.
  if (isDeclined || isCancelled) {
    return [s1, s2];
  }

  // Stage 3: Terms accepted — guest confirms the host's offer.
  const s3: TimelineStage = {
    key: "terms_accepted",
    label: "Terms accepted",
    status: termsAccepted
      ? "done"
      : isAccepted
        ? "current"
        : "upcoming",
    at: terms_accepted_at ?? null,
    detail: termsAccepted
      ? "Reservation confirmed"
      : isAccepted
        ? viewer_role === "guest"
          ? "Your turn — accept the offered terms"
          : "Waiting on guest confirmation"
        : null,
  };

  // Stage 4: Payment — expands into one stage per event when the
  // reservation has materialized payment_events (after guest
  // accepts terms). Falls back to the original "future feature"
  // placeholder for legacy rows that were accepted before Chunk
  // 4.75 landed, and for reservations whose policy has no
  // payment_schedule (refunds-only or "handle myself").
  const events = input.payment_events ?? [];
  const s4List: TimelineStage[] = [];
  if (events.length > 0) {
    const total = events.length;
    for (const ev of events) {
      const dollars = (ev.amount_cents / 100).toLocaleString(undefined, {
        minimumFractionDigits: Number.isInteger(ev.amount_cents / 100) ? 0 : 2,
        maximumFractionDigits: 2,
      });
      const label =
        total > 1
          ? `Payment ${ev.schedule_index + 1} of ${total} — $${dollars}`
          : `Payment — $${dollars}`;
      let status: StageStatus;
      let detail: string | null;
      if (ev.status === "confirmed") {
        status = "done";
        detail = "Confirmed";
      } else if (ev.status === "waived") {
        status = "done";
        detail = "Waived";
      } else if (ev.status === "refunded") {
        status = "done";
        detail = "Refunded";
      } else if (ev.status === "claimed") {
        status = "current";
        detail = "Awaiting host confirmation";
      } else {
        // scheduled
        const dueOpen = today >= ev.due_at;
        status = dueOpen ? "current" : "upcoming";
        detail = dueOpen
          ? `Due ${fmtDate(ev.due_at)}`
          : `Due ${fmtDate(ev.due_at)}`;
      }
      s4List.push({
        key: "payment",
        label,
        status,
        at: ev.due_at,
        detail,
      });
    }
  } else {
    s4List.push({
      key: "payment",
      label: "Payment",
      status: "future-feature",
      detail: "Each scheduled payment will appear here",
    });
  }

  // Stage 5: Upcoming (between terms acceptance and check-in).
  const s5: TimelineStage = {
    key: "upcoming",
    label: "Upcoming",
    status: !isAccepted
      ? "upcoming"
      : preCheckIn
        ? "current"
        : inStay || postStay
          ? "done"
          : "upcoming",
    at: checkInDate,
    detail: checkInDate
      ? preCheckIn
        ? `Check-in ${fmtDate(checkInDate)}`
        : inStay || postStay
          ? `Checked in ${fmtDate(checkInDate)}`
          : null
      : null,
  };

  // Stage 6: Checked in (stay in progress).
  const s6: TimelineStage = {
    key: "checked_in",
    label: "During stay",
    status: !isAccepted
      ? "upcoming"
      : inStay
        ? "current"
        : postStay
          ? "done"
          : "upcoming",
    detail: inStay
      ? `Check-out ${fmtDate(checkOutDate)}`
      : postStay
        ? `Stayed through ${fmtDate(checkOutDate)}`
        : checkInDate && checkOutDate
          ? `${fmtDate(checkInDate)} → ${fmtDate(checkOutDate)}`
          : null,
    badge: input.has_open_issue && (inStay || postStay) ? "alert" : null,
  };

  // Stage 7: Checked out (pre-review gap).
  const s7: TimelineStage = {
    key: "checked_out",
    label: "Checked out",
    status: !isAccepted
      ? "upcoming"
      : postStay
        ? myRating === null
          ? "current"
          : "done"
        : "upcoming",
    at: postStay ? checkOutDate : null,
    detail:
      postStay && myRating === null ? "Time to leave a review" : null,
    badge: input.has_open_issue && postStay ? "alert" : null,
  };

  // Stage 8: Reviewed.
  const s8: TimelineStage = {
    key: "reviewed",
    label: "Reviewed",
    status:
      myRating !== null && otherRating !== null
        ? "done"
        : myRating !== null
          ? "current" // I rated, waiting on the other side
          : "upcoming",
    detail:
      myRating !== null && otherRating === null
        ? viewer_role === "guest"
          ? "Waiting on the host's review of you"
          : "Waiting on the guest's review of their stay"
        : myRating !== null && otherRating !== null
          ? "Both reviews posted"
          : null,
  };

  return [s1, s2, s3, ...s4List, s5, s6, s7, s8];
}
