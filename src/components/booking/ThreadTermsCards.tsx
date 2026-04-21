"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  Copy,
  DollarSign,
  Loader2,
  Receipt,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CancellationPolicyCard } from "./CancellationPolicyCard";
import type { CancellationPolicy } from "@/lib/cancellation";
import {
  displayHandle,
  paymentMethodMeta,
  type PaymentMethod,
} from "@/lib/payment-methods";

/**
 * Structured-message prefixes. Posted by the contact-request PATCH
 * and accept-terms endpoints so the thread renderer can pull booking
 * context and render rich cards inline instead of a plain text line.
 *
 *   __type:terms_offered__   — host approved (possibly with edits)
 *   __type:terms_accepted__  — guest acknowledged the snapshot
 *
 * Both cards read policy + price data from the thread's current
 * booking prop — the one-message-per-transition convention means
 * there's no drift between the message and the live state.
 */
export const TERMS_OFFERED_PREFIX = "__type:terms_offered__";
export const TERMS_ACCEPTED_PREFIX = "__type:terms_accepted__";
/** Payment prefixes embed the event id so the renderer can find
 *  the corresponding payment_events row without scanning the
 *  whole list. Format: `__type:payment_due:<uuid>__` */
export const PAYMENT_DUE_PREFIX = "__type:payment_due:";
export const PAYMENT_CLAIMED_PREFIX = "__type:payment_claimed:";
export const PAYMENT_CONFIRMED_PREFIX = "__type:payment_confirmed:";
const PAYMENT_SUFFIX = "__";

/** Build a payment structured-message prefix for a given event. */
export function paymentDueMessage(eventId: string): string {
  return `${PAYMENT_DUE_PREFIX}${eventId}${PAYMENT_SUFFIX}`;
}
export function paymentClaimedMessage(eventId: string): string {
  return `${PAYMENT_CLAIMED_PREFIX}${eventId}${PAYMENT_SUFFIX}`;
}
export function paymentConfirmedMessage(eventId: string): string {
  return `${PAYMENT_CONFIRMED_PREFIX}${eventId}${PAYMENT_SUFFIX}`;
}

/**
 * Pull the event id out of a payment_* structured message. Returns
 * null if the content isn't a payment message or the suffix is
 * malformed.
 */
export function parsePaymentEventId(content: string): {
  kind: "due" | "claimed" | "confirmed";
  eventId: string;
} | null {
  for (const [prefix, kind] of [
    [PAYMENT_DUE_PREFIX, "due"],
    [PAYMENT_CLAIMED_PREFIX, "claimed"],
    [PAYMENT_CONFIRMED_PREFIX, "confirmed"],
  ] as const) {
    if (content.startsWith(prefix)) {
      const rest = content.slice(prefix.length);
      const end = rest.indexOf(PAYMENT_SUFFIX);
      if (end <= 0) return null;
      return { kind, eventId: rest.slice(0, end) };
    }
  }
  return null;
}

export function isStructuredMessage(content: string): boolean {
  return (
    content.startsWith(TERMS_OFFERED_PREFIX) ||
    content.startsWith(TERMS_ACCEPTED_PREFIX) ||
    content.startsWith(PAYMENT_DUE_PREFIX) ||
    content.startsWith(PAYMENT_CLAIMED_PREFIX) ||
    content.startsWith(PAYMENT_CONFIRMED_PREFIX)
  );
}

/**
 * Friendly label for a structured message — used anywhere the raw
 * content would leak (inbox list preview, thread-view fallback,
 * any legacy surface that sees the text). The DB trigger on
 * `messages` writes the raw content into
 * message_threads.last_message_preview, so without this translator
 * users see "__type:terms_offered__" in their inbox.
 */
export function structuredMessageLabel(content: string): string | null {
  if (content.startsWith(TERMS_OFFERED_PREFIX)) return "Terms sent";
  if (content.startsWith(TERMS_ACCEPTED_PREFIX)) return "Terms accepted";
  if (content.startsWith(PAYMENT_DUE_PREFIX)) return "Payment due";
  if (content.startsWith(PAYMENT_CLAIMED_PREFIX)) return "Payment sent";
  if (content.startsWith(PAYMENT_CONFIRMED_PREFIX)) return "Payment confirmed";
  return null;
}

/**
 * Render-ready preview — use anywhere you'd show a raw message
 * content but want the friendly version for structured prefixes.
 */
export function friendlyMessagePreview(
  content: string | null | undefined
): string {
  if (!content) return "";
  return structuredMessageLabel(content) ?? content;
}

interface TermsOfferedProps {
  bookingId: string;
  checkIn: string | null;
  checkOut: string | null;
  guestCount: number | null;
  totalEstimate: number | null;
  /** Original-request values — used to highlight what the host
   *  counter-offered on. When null, treat as "unchanged". */
  originalCheckIn: string | null;
  originalCheckOut: string | null;
  originalGuestCount: number | null;
  originalTotalEstimate: number | null;
  policy: CancellationPolicy;
  /** Host's enabled off-platform methods. Shown only to the guest
   *  so they know where to send money after confirming. Host
   *  already knows their own handles. */
  paymentMethods: PaymentMethod[];
  viewerRole: "guest" | "host";
  termsAcceptedAt: string | null;
  hostFirstName: string;
  guestFirstName: string;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Rich inline card posted when the host approves a request — with
 * their final price + cancellation policy snapshot. Guest viewers
 * who haven't acknowledged get a prominent Accept button right in
 * the thread. Host viewers see the same terms for reference.
 */
export function TermsOfferedCard({
  bookingId,
  checkIn,
  checkOut,
  guestCount,
  totalEstimate,
  originalCheckIn,
  originalCheckOut,
  originalGuestCount,
  originalTotalEstimate,
  policy,
  paymentMethods,
  viewerRole,
  termsAcceptedAt,
  hostFirstName,
  guestFirstName,
}: TermsOfferedProps) {
  // Diff flags — only surface a "Changed from X" hint when the
  // original value actually differs (and was captured).
  const datesChanged =
    (originalCheckIn && originalCheckIn !== checkIn) ||
    (originalCheckOut && originalCheckOut !== checkOut);
  const guestsChanged =
    originalGuestCount !== null && originalGuestCount !== guestCount;
  const totalChanged =
    originalTotalEstimate !== null &&
    totalEstimate !== null &&
    originalTotalEstimate !== totalEstimate;
  const anyChanged = datesChanged || guestsChanged || totalChanged;
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [acceptedAt, setAcceptedAt] = useState<string | null>(termsAcceptedAt);

  const accept = async () => {
    if (submitting || acceptedAt) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/contact-requests/${bookingId}/accept-terms`,
        { method: "POST" }
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        terms_accepted_at?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      setAcceptedAt(data.terms_accepted_at ?? new Date().toISOString());
      toast.success("Terms accepted — reservation confirmed");
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("inbox:thread-refresh"));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't accept");
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    viewerRole === "guest"
      ? `${hostFirstName} approved your stay`
      : `You approved ${guestFirstName}'s stay`;

  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border-2 border-border bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-border p-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Here are the full terms for this reservation.
            {anyChanged && viewerRole === "guest" && (
              <>
                {" "}
                <span className="font-medium text-amber-800">
                  Some fields have been changed from your original
                  request — look for the amber highlights.
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Dates + guests row — with diff highlighting when the host
          counter-offered. */}
      <div className="grid grid-cols-1 divide-y divide-border border-b border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <FieldTile
          icon={CalendarDays}
          label="Check-in"
          value={fmtDate(checkIn)}
          changed={Boolean(
            originalCheckIn && originalCheckIn !== checkIn
          )}
          originalLabel={
            originalCheckIn && originalCheckIn !== checkIn
              ? `was ${fmtDate(originalCheckIn)}`
              : null
          }
        />
        <FieldTile
          icon={CalendarDays}
          label="Checkout"
          value={fmtDate(checkOut)}
          changed={Boolean(
            originalCheckOut && originalCheckOut !== checkOut
          )}
          originalLabel={
            originalCheckOut && originalCheckOut !== checkOut
              ? `was ${fmtDate(originalCheckOut)}`
              : null
          }
        />
        <FieldTile
          icon={Users}
          label="Guests"
          value={
            guestCount !== null
              ? `${guestCount} guest${guestCount === 1 ? "" : "s"}`
              : "—"
          }
          changed={guestsChanged}
          originalLabel={
            guestsChanged && originalGuestCount !== null
              ? `was ${originalGuestCount}`
              : null
          }
        />
      </div>

      {typeof totalEstimate === "number" && totalEstimate > 0 && (
        <div
          className={cn(
            "flex items-center justify-between gap-3 border-b border-border px-4 py-3",
            totalChanged && "bg-amber-50"
          )}
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Receipt className="h-3.5 w-3.5" />
            Total
          </div>
          <div className="text-right">
            <div className="text-base font-bold">
              ${totalEstimate.toLocaleString()}
            </div>
            {totalChanged && originalTotalEstimate !== null && (
              <div className="text-[11px] font-medium text-amber-800">
                was ${originalTotalEstimate.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="p-4">
        <CancellationPolicyCard policy={policy} scope="reservation" />
      </div>

      {/* Host payment methods — shown to the guest so the terms they
          acknowledge include where money actually goes. Host side
          hides this (they know their own handles). */}
      {viewerRole === "guest" && paymentMethods.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Wallet className="h-3 w-3" />
            How to pay {hostFirstName}
          </div>
          <div className="space-y-1.5">
            {paymentMethods.map((m, i) => (
              <TermsPaymentMethodRow key={`${m.type}-${i}`} method={m} />
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Payment happens directly between you and {hostFirstName}.
            1° B&amp;B doesn&apos;t process payments.
          </p>
        </div>
      )}

      {viewerRole === "guest" &&
        (acceptedAt ? (
          <div className="flex items-center gap-2 border-t border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            <Check className="h-4 w-4" />
            You accepted these terms on{" "}
            {new Date(acceptedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        ) : (
          <div className="space-y-2 border-t border-border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">
              Accepting confirms you&apos;ve read and agree to these terms.
              Payment and refunds happen directly with {hostFirstName} —
              1° B&amp;B doesn&apos;t process payments.
            </p>
            <button
              type="button"
              onClick={accept}
              disabled={submitting}
              className={cn(
                "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Confirming…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Accept terms &amp; confirm reservation
                </>
              )}
            </button>
          </div>
        ))}

      {viewerRole === "host" && !acceptedAt && (
        <div className="border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          Waiting for {guestFirstName} to confirm these terms.
        </div>
      )}
      {viewerRole === "host" && acceptedAt && (
        <div className="flex items-center gap-2 border-t border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900">
          <Check className="h-3.5 w-3.5" />
          {guestFirstName} accepted these terms on{" "}
          {new Date(acceptedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      )}
    </div>
  );
}

interface TermsAcceptedProps {
  totalEstimate: number | null;
  policy: CancellationPolicy;
  /** Host's enabled off-platform methods. Shown only to the guest
   *  viewer; host hides (they know their own handles). */
  paymentMethods: PaymentMethod[];
  viewerRole: "guest" | "host";
  acceptedAt: string;
  hostFirstName: string;
  guestFirstName: string;
}

/**
 * Posted after the guest confirms. Spells out the locked terms in
 * the thread one more time so both sides have a scannable record of
 * what was agreed and when, plus the host's payment handles so the
 * guest knows where the money goes.
 */
export function TermsAcceptedCard({
  totalEstimate,
  policy,
  paymentMethods,
  viewerRole,
  acceptedAt,
  hostFirstName,
  guestFirstName,
}: TermsAcceptedProps) {
  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border-2 border-emerald-200 bg-emerald-50 shadow-sm">
      <div className="flex items-start gap-3 border-b border-emerald-200 p-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
          <Check className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-emerald-900">
            Reservation confirmed
          </div>
          <div className="mt-0.5 text-xs text-emerald-800/80">
            {guestFirstName} accepted the terms on{" "}
            {new Date(acceptedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            .
          </div>
        </div>
      </div>

      {typeof totalEstimate === "number" && totalEstimate > 0 && (
        <div className="flex items-center justify-between gap-3 border-b border-emerald-200 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-900/70">
            <Receipt className="h-3.5 w-3.5" />
            Total
          </div>
          <div className="text-base font-bold text-emerald-900">
            ${totalEstimate.toLocaleString()}
          </div>
        </div>
      )}

      <div className="p-4">
        <CancellationPolicyCard policy={policy} scope="reservation" />
      </div>

      {viewerRole === "guest" && paymentMethods.length > 0 && (
        <div className="border-t border-emerald-200 px-4 py-3">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-900/70">
            <Wallet className="h-3 w-3" />
            How to pay {hostFirstName}
          </div>
          <div className="space-y-1.5">
            {paymentMethods.map((m, i) => (
              <TermsPaymentMethodRow key={`${m.type}-${i}`} method={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldTile({
  icon: Icon,
  label,
  value,
  changed,
  originalLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  changed: boolean;
  originalLabel: string | null;
}) {
  return (
    <div className={cn("px-4 py-3", changed && "bg-amber-50")}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
      {changed && originalLabel && (
        <div className="mt-0.5 text-[11px] font-medium text-amber-800">
          {originalLabel}
        </div>
      )}
    </div>
  );
}

function TermsPaymentMethodRow({ method }: { method: PaymentMethod }) {
  const meta = paymentMethodMeta(method.type);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(displayHandle(method));
      toast.success(`${meta.label} handle copied`);
    } catch {
      toast.error("Couldn't copy");
    }
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-white p-2.5">
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {meta.label}
        </div>
        <div className="truncate text-xs font-medium">
          {displayHandle(method)}
        </div>
        {method.note && (
          <div className="mt-0.5 whitespace-pre-wrap text-[11px] text-muted-foreground">
            {method.note}
          </div>
        )}
      </div>
      {method.handle && (
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Copy ${meta.label} handle`}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Payment event cards ─────────────────────────────────────────
//
// One card per payment_events row. The row's `status` drives which
// card gets posted into the thread:
//   scheduled → payment_due    (cron posts when due_at opens)
//   claimed   → payment_claimed (guest clicked "Mark as paid")
//   confirmed → payment_confirmed (host clicked "Confirm received")
//
// The renderer re-reads the current event status from ThreadDetail
// so the action buttons only appear on the *latest* relevant card
// — if the guest has already marked paid, the due card becomes
// read-only even though the due message is still in the thread.

export interface PaymentEventForCard {
  id: string;
  schedule_index: number;
  amount_cents: number;
  due_at: string;
  status: "scheduled" | "claimed" | "confirmed" | "waived" | "refunded";
  method: string | null;
  claimed_at: string | null;
  confirmed_at: string | null;
}

function formatCentsDisplay(cents: number): string {
  const dollars = cents / 100;
  const whole = Number.isInteger(dollars);
  return `$${dollars.toLocaleString(undefined, {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDueDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function paymentOrdinal(index: number, total: number): string {
  return total > 1 ? `Payment ${index + 1} of ${total}` : "Payment";
}

interface PaymentDueCardProps {
  event: PaymentEventForCard;
  totalEvents: number;
  viewerRole: "guest" | "host";
  paymentMethods: PaymentMethod[];
  hostFirstName: string;
  guestFirstName: string;
}

/**
 * Posted by the cron when a scheduled payment's due window opens.
 * Guest sees "Mark as paid" (with a method picker). Host sees a
 * read-only reminder. If the event has already progressed past
 * scheduled (guest beat the cron and marked paid via the terms
 * card flow, or this card was left behind by a state change), the
 * button collapses to a status line.
 */
export function PaymentDueCard({
  event,
  totalEvents,
  viewerRole,
  paymentMethods,
  hostFirstName,
  guestFirstName,
}: PaymentDueCardProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [method, setMethod] = useState<string>(
    paymentMethods[0]?.type ?? "offline_other"
  );
  const pastScheduled = event.status !== "scheduled";

  const markPaid = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/payment-events/${event.id}/mark-paid`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      toast.success(`Marked ${formatCentsDisplay(event.amount_cents)} as paid`);
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("inbox:thread-refresh"));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't mark paid");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border-2 border-border bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-border p-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <DollarSign className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {paymentOrdinal(event.schedule_index, totalEvents)}
          </div>
          <div className="mt-0.5 text-sm font-semibold">
            {formatCentsDisplay(event.amount_cents)} due{" "}
            {fmtDueDate(event.due_at)}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {viewerRole === "guest"
              ? `Send to ${hostFirstName} off-platform, then mark it paid here.`
              : `Waiting on ${guestFirstName} to send this payment.`}
          </div>
        </div>
      </div>

      {viewerRole === "guest" && paymentMethods.length > 0 && (
        <div className="border-b border-border px-4 py-3">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Wallet className="h-3 w-3" />
            How to pay {hostFirstName}
          </div>
          <div className="space-y-1.5">
            {paymentMethods.map((m, i) => (
              <TermsPaymentMethodRow key={`${m.type}-${i}`} method={m} />
            ))}
          </div>
        </div>
      )}

      {viewerRole === "guest" && !pastScheduled && (
        <div className="space-y-2 border-t border-border bg-muted/30 p-4">
          {paymentMethods.length > 1 && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                How are you paying?
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full rounded-lg border-2 border-border bg-white px-3 py-2 text-sm font-medium shadow-sm"
              >
                {paymentMethods.map((m) => (
                  <option key={m.type} value={m.type}>
                    {paymentMethodMeta(m.type).label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="button"
            onClick={markPaid}
            disabled={submitting}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Marking paid…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                I&apos;ve paid {formatCentsDisplay(event.amount_cents)}
              </>
            )}
          </button>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Marking paid sends {hostFirstName} a confirmation message so they
            can confirm they received it. 1° B&amp;B doesn&apos;t move money.
          </p>
        </div>
      )}

      {pastScheduled && (
        <div className="flex items-center gap-2 border-t border-border bg-muted/40 px-4 py-3 text-xs font-medium text-muted-foreground">
          <Check className="h-3.5 w-3.5" />
          {event.status === "claimed"
            ? `${guestFirstName} marked this paid — waiting on ${hostFirstName} to confirm.`
            : event.status === "confirmed"
              ? "Payment confirmed."
              : event.status === "waived"
                ? "Waived."
                : "Refunded."}
        </div>
      )}
    </div>
  );
}

interface PaymentClaimedCardProps {
  event: PaymentEventForCard;
  totalEvents: number;
  viewerRole: "guest" | "host";
  hostFirstName: string;
  guestFirstName: string;
}

/**
 * Posted when the guest clicks "Mark as paid". Host sees
 * "Confirm received" / "Dispute" buttons (dispute just opens a
 * message composer — no automated resolution yet). Guest sees the
 * pending status. Once the host confirms, the action row collapses.
 */
export function PaymentClaimedCard({
  event,
  totalEvents,
  viewerRole,
  hostFirstName,
  guestFirstName,
}: PaymentClaimedCardProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const confirmed = event.status === "confirmed";
  const methodLabel = event.method
    ? paymentMethodMeta(
        event.method as PaymentMethod["type"]
      ).label
    : null;

  const confirmReceived = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/payment-events/${event.id}/confirm-received`,
        { method: "POST" }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      toast.success("Payment confirmed");
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("inbox:thread-refresh"));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't confirm");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border-2 border-sky-200 bg-sky-50 shadow-sm">
      <div className="flex items-start gap-3 border-b border-sky-200 p-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white">
          <DollarSign className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-sky-900/70">
            {paymentOrdinal(event.schedule_index, totalEvents)}
          </div>
          <div className="mt-0.5 text-sm font-semibold text-sky-900">
            {guestFirstName} sent {formatCentsDisplay(event.amount_cents)}
            {methodLabel ? ` via ${methodLabel}` : ""}
          </div>
          <div className="mt-0.5 text-xs text-sky-800/80">
            {event.claimed_at
              ? `Marked paid on ${new Date(event.claimed_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}`
              : "Awaiting confirmation"}
          </div>
        </div>
      </div>

      {viewerRole === "host" && !confirmed && (
        <div className="flex flex-wrap items-center gap-2 border-t border-sky-200 bg-white/40 p-4">
          <button
            type="button"
            onClick={confirmReceived}
            disabled={submitting}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Confirming…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Confirm received
              </>
            )}
          </button>
        </div>
      )}

      {viewerRole === "guest" && !confirmed && (
        <div className="border-t border-sky-200 bg-white/40 px-4 py-3 text-xs text-sky-900/80">
          {hostFirstName} will confirm once it lands.
        </div>
      )}

      {confirmed && (
        <div className="flex items-center gap-2 border-t border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900">
          <Check className="h-3.5 w-3.5" />
          {hostFirstName} confirmed this payment
          {event.confirmed_at
            ? ` on ${new Date(event.confirmed_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}`
            : ""}
          .
        </div>
      )}
    </div>
  );
}

interface PaymentConfirmedCardProps {
  event: PaymentEventForCard;
  totalEvents: number;
  viewerRole: "guest" | "host";
  hostFirstName: string;
  guestFirstName: string;
}

/**
 * Acknowledgement block. Both sides see the same friendly receipt
 * so the thread has a permanent record of the confirmed payment.
 */
export function PaymentConfirmedCard({
  event,
  totalEvents,
  viewerRole,
  hostFirstName,
  guestFirstName,
}: PaymentConfirmedCardProps) {
  const methodLabel = event.method
    ? paymentMethodMeta(
        event.method as PaymentMethod["type"]
      ).label
    : null;
  const confirmedOn = event.confirmed_at
    ? new Date(event.confirmed_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border-2 border-emerald-200 bg-emerald-50 shadow-sm">
      <div className="flex items-start gap-3 p-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
          <Check className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-900/70">
            {paymentOrdinal(event.schedule_index, totalEvents)}
          </div>
          <div className="mt-0.5 text-sm font-semibold text-emerald-900">
            {formatCentsDisplay(event.amount_cents)} confirmed
            {methodLabel ? ` · ${methodLabel}` : ""}
          </div>
          <div className="mt-0.5 text-xs text-emerald-800/80">
            {viewerRole === "host"
              ? `You confirmed ${guestFirstName}'s payment${confirmedOn ? ` on ${confirmedOn}` : ""}.`
              : `${hostFirstName} confirmed your payment${confirmedOn ? ` on ${confirmedOn}` : ""}.`}
          </div>
        </div>
      </div>
    </div>
  );
}
