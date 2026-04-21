import { ShieldCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  OFF_PLATFORM_PAYMENT_NOTE,
  PLATFORM_NEUTRALITY_NOTE,
  amountLabel,
  approachLabel,
  dueAtLabel,
  presetLabel,
  refundCutoffLabel,
  type CancellationPolicy,
  type PaymentScheduleEntry,
  type RefundWindow,
} from "@/lib/cancellation";

interface Props {
  policy: CancellationPolicy;
  /** Compact variant strips the header icon + disclaimers so the
   *  card fits in the inbox sidebar. */
  compact?: boolean;
  /** Listing vs reservation context — drives the subtext wording. */
  scope?: "listing" | "reservation";
}

/**
 * Read-only cancellation + payment renderer. The approach flag on
 * the policy drives which tables render:
 *   - installments → Payment schedule only
 *   - refunds      → Payment schedule + Refund schedule
 * Security deposit + custom note show for either approach.
 */
export function CancellationPolicyCard({
  policy,
  compact = false,
  scope = "listing",
}: Props) {
  const hasDeposit = policy.security_deposit.length > 0;
  const showRefunds =
    policy.approach === "refunds" && policy.refund_schedule.length > 0;

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
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">
              Cancellation &amp; payment schedule — {presetLabel(policy.preset)}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {approachLabel(policy.approach)}
              </span>
              {" · "}
              {scope === "reservation"
                ? "Terms locked when the host approved."
                : "Applied to every request on this listing."}
            </div>
          </div>
        </div>
      )}
      {compact && (
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Cancellation &amp; payment — {presetLabel(policy.preset)}
          <span className="ml-1 font-normal normal-case text-muted-foreground">
            ({policy.approach === "installments"
              ? "installments"
              : "refundable"})
          </span>
        </div>
      )}

      <PaymentTable
        heading="Payment schedule"
        rows={policy.payment_schedule}
        emptyHint="No schedule set."
        compact={compact}
      />

      {showRefunds && (
        <RefundTable
          rows={policy.refund_schedule}
          compact={compact}
          className={compact ? "mt-3" : "mt-4"}
        />
      )}

      {hasDeposit && (
        <PaymentTable
          heading="Security deposit"
          rows={policy.security_deposit}
          compact={compact}
          className={compact ? "mt-3" : "mt-4"}
        />
      )}

      {policy.custom_note && (
        <p
          className={cn(
            "mt-3 text-xs leading-relaxed text-muted-foreground",
            compact && "text-[11px]"
          )}
        >
          {policy.custom_note}
        </p>
      )}

      {!compact && (
        <div className="mt-4 space-y-1 border-t border-border pt-3">
          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            {PLATFORM_NEUTRALITY_NOTE}
          </p>
          {policy.approach === "installments" && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {OFF_PLATFORM_PAYMENT_NOTE}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PaymentTable({
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

function RefundTable({
  rows,
  compact,
  className,
}: {
  rows: RefundWindow[];
  compact: boolean;
  className?: string;
}) {
  return (
    <div className={cn(className)}>
      <div
        className={cn(
          "mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
          !compact && "mt-3"
        )}
      >
        Refund schedule
      </div>
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
              {refundCutoffLabel(r)}
            </span>
            <span
              className={cn(
                "shrink-0 font-semibold",
                r.refund_pct >= 100
                  ? "text-emerald-700"
                  : r.refund_pct > 0
                    ? "text-amber-700"
                    : "text-muted-foreground"
              )}
            >
              {r.refund_pct}% refund
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
