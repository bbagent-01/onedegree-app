import { CalendarClock, RotateCcw, Info, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  OFF_PLATFORM_PAYMENT_NOTE,
  PLATFORM_NEUTRALITY_NOTE,
  amountLabel,
  approachMeta,
  dueAtLabel,
  presetLabel,
  refundCutoffLabel,
  type CancellationApproach,
  type CancellationPolicy,
  type PaymentScheduleEntry,
  type RefundWindow,
} from "@/lib/cancellation";

interface Props {
  policy: CancellationPolicy;
  /** Compact variant strips the approach box + disclaimers so the
   *  card fits in the inbox sidebar. */
  compact?: boolean;
  /** Listing vs reservation context — drives the subtext wording. */
  scope?: "listing" | "reservation";
}

const APPROACH_ICON: Record<CancellationApproach, LucideIcon> = {
  installments: CalendarClock,
  refunds: RotateCcw,
};

/**
 * Read-only cancellation + payment policy renderer. Layout mirrors
 * the editor: an approach callout up top (icon + description that
 * matches the selector cards in the settings form), then a preset-
 * prefixed schedule heading ("Moderate · Payment schedule") and the
 * table rows. Security deposit, custom note, and disclaimers follow.
 */
export function CancellationPolicyCard({
  policy,
  compact = false,
  scope = "listing",
}: Props) {
  const meta = approachMeta(policy.approach);
  const Icon = APPROACH_ICON[policy.approach];
  const preset = presetLabel(policy.preset);
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
      {compact ? (
        // Sidebar variant: one tight header line. The approach box
        // would swallow too much vertical space in the inbox.
        <div className="mb-3 flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {meta.title}
          </div>
        </div>
      ) : (
        // Full variant: approach callout matches the selector cards
        // on /settings/hosting so the preview feels continuous with
        // the picker.
        <div className="rounded-xl border-2 border-border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-foreground shadow-sm">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{meta.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {meta.description}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {scope === "reservation"
                  ? "Terms locked when the host approved."
                  : "Applied to every request on this listing."}
              </p>
            </div>
          </div>
        </div>
      )}

      <PaymentTable
        heading={`${preset} · Payment schedule`}
        rows={policy.payment_schedule}
        emptyHint="No schedule set."
        compact={compact}
        className={compact ? undefined : "mt-4"}
      />

      {showRefunds && (
        <RefundTable
          heading={`${preset} · Refund schedule`}
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
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
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
  heading,
  rows,
  compact,
  className,
}: {
  heading: string;
  rows: RefundWindow[];
  compact: boolean;
  className?: string;
}) {
  return (
    <div className={cn(className)}>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {heading}
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
