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
  | "approved"
  | "declined"
  | "cancelled"
  | "payment"
  | "upcoming"
  | "checked_in"
  | "checked_out"
  | "reviewed";

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
}

export interface ResolveInput {
  /** status: pending | accepted | declined | cancelled */
  status: string | null;
  check_in: string | null;
  check_out: string | null;
  created_at: string | null;
  responded_at: string | null;
  /** Viewer's perspective — drives the "reviewed" stage completion. */
  viewer_role: "guest" | "host";
  stay_confirmation: {
    guest_rating: number | null;
    host_rating: number | null;
  } | null;
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
    viewer_role,
    stay_confirmation,
  } = input;

  const today = todayISO();
  const isAccepted = status === "accepted";
  const isDeclined = status === "declined";
  const isCancelled = status === "cancelled";
  const isPending = !status || status === "pending";

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

  // Stage 2: Approved (or terminal decline / cancel).
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
      key: "approved",
      label: "Approved",
      status: "done",
      at: responded_at,
      detail: "Host approved — nice.",
    };
  } else {
    s2 = {
      key: "approved",
      label: "Awaiting approval",
      status: "current",
      detail: "Host hasn't responded yet",
    };
  }

  // Terminal branches short-circuit the rest of the timeline.
  if (isDeclined || isCancelled) {
    return [s1, s2];
  }

  // Stage 3: Payment arrangements (placeholder until Chunk 3).
  const s3: TimelineStage = {
    key: "payment",
    label: "Payment",
    status: "future-feature",
    detail: "Terms + schedule — ships with the payment flow",
  };

  // Stage 4: Upcoming (between approval and check-in).
  const s4: TimelineStage = {
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

  // Stage 5: Checked in (stay in progress).
  const s5: TimelineStage = {
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
  };

  // Stage 6: Checked out (pre-review gap).
  const s6: TimelineStage = {
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
  };

  // Stage 7: Reviewed.
  const s7: TimelineStage = {
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

  return [s1, s2, s3, s4, s5, s6, s7];
}
