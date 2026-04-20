import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  presetLabel,
  type CancellationPolicy,
  type CancellationWindow,
} from "@/lib/cancellation";

interface Props {
  policy: CancellationPolicy;
  /** Optional refund-right-now callout. Pass the RefundQuote from
   *  computeRefund to surface "Cancel now = X% refund" above the
   *  schedule. Typically rendered on the guest-side trip detail
   *  view, not on the host listing page. */
  refundNow?: {
    refund_pct: number;
    days_until_checkin: number;
    past_checkin: boolean;
  } | null;
  /** Compact variant drops the header icon + preset label line so
   *  the card fits the inbox sidebar. */
  compact?: boolean;
  /** Listing-level vs reservation-level context. Drives the heading
   *  wording; the schedule body is identical either way. */
  scope?: "listing" | "reservation";
}

function windowLine(w: CancellationWindow): string {
  if (w.cutoff_days_before_checkin === 0) {
    return "After check-in";
  }
  if (w.cutoff_days_before_checkin === 1) {
    return "Up to 24 hours before";
  }
  return `Up to ${w.cutoff_days_before_checkin} days before`;
}

/**
 * Read-only rendering of a cancellation policy. Used wherever a
 * policy needs to be shown to either side of a reservation — the
 * listing detail page, the inbox reservation sidebar, and the trip
 * detail page.
 */
export function CancellationPolicyCard({
  policy,
  refundNow = null,
  compact = false,
  scope = "listing",
}: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-white",
        compact ? "p-3" : "p-4"
      )}
    >
      {!compact && (
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">
              Cancellation policy — {presetLabel(policy.preset)}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {scope === "reservation"
                ? "Terms locked in when the host approved this request."
                : "Applied to every request on this listing unless overridden."}
            </div>
          </div>
        </div>
      )}
      {compact && (
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Cancellation — {presetLabel(policy.preset)}
        </div>
      )}

      {/* Refund-right-now callout */}
      {refundNow && !refundNow.past_checkin && (
        <div
          className={cn(
            "mt-3 rounded-lg px-3 py-2 text-xs",
            refundNow.refund_pct >= 100
              ? "bg-emerald-50 text-emerald-900"
              : refundNow.refund_pct > 0
                ? "bg-amber-50 text-amber-900"
                : "bg-zinc-100 text-zinc-700"
          )}
        >
          Cancel today →{" "}
          <span className="font-semibold">
            {refundNow.refund_pct}% refund
          </span>
          {refundNow.days_until_checkin > 0 && (
            <span className="text-muted-foreground">
              {" "}
              · {refundNow.days_until_checkin} day
              {refundNow.days_until_checkin === 1 ? "" : "s"} until check-in
            </span>
          )}
        </div>
      )}
      {refundNow?.past_checkin && (
        <div className="mt-3 rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-700">
          Check-in has passed — no refund applies.
        </div>
      )}

      {/* Schedule */}
      <ul
        className={cn(
          "divide-y divide-border border-t border-border",
          compact ? "mt-2" : "mt-3"
        )}
      >
        {policy.windows.map((w, i) => (
          <li
            key={i}
            className="flex items-center justify-between py-2 text-sm"
          >
            <span
              className={cn(
                "text-foreground",
                compact ? "text-xs" : "text-sm"
              )}
            >
              {windowLine(w)}
            </span>
            <span
              className={cn(
                "font-semibold",
                w.refund_pct >= 100
                  ? "text-emerald-700"
                  : w.refund_pct > 0
                    ? "text-amber-700"
                    : "text-muted-foreground",
                compact ? "text-xs" : "text-sm"
              )}
            >
              {w.refund_pct}% refund
            </span>
          </li>
        ))}
      </ul>

      {policy.custom_note && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {policy.custom_note}
        </p>
      )}

      {!compact && (
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          1° B&B doesn&apos;t process payments. Use this schedule to settle
          up directly with your {scope === "reservation" ? "counterpart" : "host"}.
        </p>
      )}
    </div>
  );
}
