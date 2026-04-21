import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  OFF_PLATFORM_PAYMENT_NOTE,
  amountLabel,
  dueAtLabel,
  presetLabel,
  type CancellationPolicy,
  type PaymentScheduleEntry,
} from "@/lib/cancellation";

interface Props {
  policy: CancellationPolicy;
  /** Compact variant drops the header icon + disclaimer so the
   *  card fits in the inbox sidebar. */
  compact?: boolean;
  /** Listing vs reservation context — drives the subtext wording. */
  scope?: "listing" | "reservation";
}

/**
 * Read-only cancellation + payment-schedule renderer. Replaces the
 * old refund-window view — since 1° B&B doesn't process payments,
 * we show WHEN money is due rather than inventing a refund model.
 *
 * Rendered on the listing detail page (full), inbox sidebar
 * (compact), and trip detail (full).
 */
export function CancellationPolicyCard({
  policy,
  compact = false,
  scope = "listing",
}: Props) {
  const hasDeposit = policy.security_deposit.length > 0;

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
              Cancellation &amp; payment schedule — {presetLabel(policy.preset)}
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
          Cancellation &amp; payment — {presetLabel(policy.preset)}
        </div>
      )}

      {/* Payment schedule */}
      <ScheduleTable
        heading="Payment schedule"
        rows={policy.payment_schedule}
        emptyHint="No schedule set."
        compact={compact}
      />

      {/* Security deposit (optional) */}
      {hasDeposit && (
        <ScheduleTable
          heading="Security deposit"
          rows={policy.security_deposit}
          compact={compact}
          className={compact ? "mt-3" : "mt-4"}
        />
      )}

      {/* Custom note from host */}
      {policy.custom_note && (
        <p className={cn("mt-3 text-xs leading-relaxed text-muted-foreground", compact && "text-[11px]")}>
          {policy.custom_note}
        </p>
      )}

      {!compact && (
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          {OFF_PLATFORM_PAYMENT_NOTE}
        </p>
      )}
    </div>
  );
}

function ScheduleTable({
  heading,
  rows,
  compact,
  emptyHint,
  className,
}: {
  heading: string;
  rows: PaymentScheduleEntry[];
  compact: boolean;
  emptyHint?: string;
  className?: string;
}) {
  if (rows.length === 0 && !emptyHint) return null;
  return (
    <div className={cn(className)}>
      <div
        className={cn(
          "mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
          !compact && "mt-3"
        )}
      >
        {heading}
      </div>
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          {emptyHint}
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rows.map((r, i) => (
            <li
              key={i}
              className={cn(
                "flex items-center justify-between gap-3 px-3",
                compact ? "py-1.5 text-xs" : "py-2 text-sm"
              )}
            >
              <span className="min-w-0 truncate text-foreground">
                {dueAtLabel(r)}
              </span>
              <span className="shrink-0 font-semibold text-foreground">
                {amountLabel(r)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
