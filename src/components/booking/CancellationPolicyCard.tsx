import {
  CalendarClock,
  ChevronDown,
  RotateCcw,
  Info,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
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

/**
 * Short, scannable headline for the approach. Shown in the
 * collapsed-state toggle so a guest can read the key commitment
 * without expanding the full details.
 */
const APPROACH_SHORT_HEADLINE: Record<CancellationApproach, string> = {
  installments: "Pay in installments — each nonrefundable",
  refunds: "Pay upfront — refund schedule below",
};

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

  // Compact variant (inbox sidebar) stays as a dense always-visible
  // block. Full variant collapses to a single summary row so the
  // terms_offered / terms_accepted cards don't dominate the thread.
  if (compact) {
    return (
      <div className="rounded-xl border border-border bg-white p-3">
        <div className="mb-3 flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {meta.title}
          </div>
        </div>
        <PaymentTable
          heading={`${preset} · Payment schedule`}
          rows={policy.payment_schedule}
          emptyHint="No schedule set."
          compact
        />
        {showRefunds && (
          <RefundTable
            heading={`${preset} · Refund schedule`}
            rows={policy.refund_schedule}
            compact
            className="mt-3"
          />
        )}
        {hasDeposit && (
          <PaymentTable
            heading="Security deposit"
            rows={policy.security_deposit}
            compact
            className="mt-3"
          />
        )}
      </div>
    );
  }

  // Full variant — the approach description is the only thing that
  // collapses. Schedule / refund / deposit tables and the neutrality
  // disclaimer live OUTSIDE the toggle so the actionable dollar
  // amounts are always visible; only the longer explanatory copy
  // hides behind "tap for details".
  return (
    <div className="space-y-3">
      <details className="group rounded-xl border border-border bg-white">
        <summary
          className={cn(
            "flex cursor-pointer list-none items-center gap-3 rounded-xl p-4",
            "hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">
              {APPROACH_SHORT_HEADLINE[policy.approach]}
            </div>
            <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              {preset} · tap for details
            </div>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              "group-open:rotate-180"
            )}
          />
        </summary>
        <div className="border-t border-border p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {meta.description}
          </p>
          {scope === "reservation" && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Terms locked when the host approved.
            </p>
          )}
        </div>
      </details>

      <PaymentTable
        heading={`${preset} · Payment schedule`}
        rows={policy.payment_schedule}
        emptyHint="No schedule set."
        compact={false}
      />

      {showRefunds && (
        <RefundTable
          heading={`${preset} · Refund schedule`}
          rows={policy.refund_schedule}
          compact={false}
        />
      )}

      {hasDeposit && (
        <PaymentTable
          heading="Security deposit"
          rows={policy.security_deposit}
          compact={false}
        />
      )}

      {policy.custom_note && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {policy.custom_note}
        </p>
      )}

      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        {PLATFORM_NEUTRALITY_NOTE}
      </p>
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
                  ? "text-[var(--tt-mint)]"
                  : r.refund_pct > 0
                    ? "text-amber-200"
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
