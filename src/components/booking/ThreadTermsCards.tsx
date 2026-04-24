"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronDown as ChevronDownIcon,
  Copy,
  DollarSign,
  Loader2,
  MessageSquare,
  Pencil,
  Receipt,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { HostReviewTermsInline } from "./HostReviewTermsInline";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// Import aliases used by the S7 edit-terms dialog (host edit pending
// terms). Reuses the existing Dialog primitives — keeping the aliases
// lets callers below stay readable.
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CancellationPolicyCard } from "./CancellationPolicyCard";
import { policiesEqual, type CancellationPolicy } from "@/lib/cancellation";
import {
  displayHandle,
  paymentMethodMeta,
  paymentMethodUrl,
  type PaymentMethod,
} from "@/lib/payment-methods";

/**
 * Structured-message prefix constants + helpers live in a
 * server-safe module so edge routes / cron handlers can import
 * them safely. Re-exported here for component-side callers.
 */
export {
  TERMS_OFFERED_PREFIX,
  TERMS_ACCEPTED_PREFIX,
  PAYMENT_DUE_PREFIX,
  PAYMENT_CLAIMED_PREFIX,
  PAYMENT_CONFIRMED_PREFIX,
  paymentDueMessage,
  paymentClaimedMessage,
  paymentConfirmedMessage,
  parsePaymentEventId,
  isStructuredMessage,
  structuredMessageLabel,
  friendlyMessagePreview,
} from "@/lib/structured-messages";

interface TermsOfferedProps {
  bookingId: string;
  threadId: string;
  checkIn: string | null;
  checkOut: string | null;
  guestCount: number | null;
  totalEstimate: number | null;
  /** Original-request values — used to flag "Host updated" on the
   *  relevant section. When null, treat as "unchanged". */
  originalCheckIn: string | null;
  originalCheckOut: string | null;
  originalGuestCount: number | null;
  originalTotalEstimate: number | null;
  policy: CancellationPolicy;
  /** Original snapshot of the cancellation policy at submission
   *  time — drives the "Host updated" pill on the policy section
   *  when the host counter-offers. Null for legacy rows that
   *  predate Migration 031. */
  originalPolicy: CancellationPolicy | null;
  /** Host's enabled off-platform methods. Shown only to the guest
   *  so they know where to send money after confirming. Host
   *  already knows their own handles. */
  paymentMethods: PaymentMethod[];
  /** Listing's nightly rate + cleaning fee — used as the comparison
   *  baseline in the breakdown ("normally $220/night"). Both can be
   *  null for legacy listings that don't have them. */
  nightlyRate: number | null;
  cleaningFee: number | null;
  /** S7/040: host-offered per-line breakdown. When set we render
   *  these as the primary nightly × N + cleaning lines on the card,
   *  with optional sublines showing the listing baseline for
   *  comparison. Null on legacy rows → derive from listing values. */
  offeredNightlyRate: number | null;
  offeredCleaningFee: number | null;
  viewerRole: "guest" | "host";
  termsAcceptedAt: string | null;
  /** Set when either party declined the offered terms before the
   *  guest accepted. Drives the red "declined" footer. */
  termsDeclinedAt: string | null;
  termsDeclinedBy: "guest" | "host" | null;
  /** S7: guest asked for edits without declining. Card stays pending;
   *  host's Edit button picks up an amber accent + the header shows
   *  an "Edits requested" chip. Cleared when host edits. */
  editsRequestedAt: string | null;
  hostFirstName: string;
  guestFirstName: string;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  // check_in / check_out arrive as bare YYYY-MM-DD strings. Passing
  // that straight to `new Date()` coerces the ISO to UTC-midnight,
  // which then reformats in the viewer's local TZ — so a Jul 10
  // stay renders as Jul 9 in anything west of UTC. Parse the pieces
  // manually and construct a local-date to match the thread header
  // and sidebar renderers.
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "—";
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
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
  threadId,
  checkIn,
  checkOut,
  guestCount,
  totalEstimate,
  originalCheckIn,
  originalCheckOut,
  originalGuestCount,
  originalTotalEstimate,
  policy,
  originalPolicy,
  paymentMethods,
  nightlyRate,
  cleaningFee,
  offeredNightlyRate,
  offeredCleaningFee,
  viewerRole,
  termsAcceptedAt,
  termsDeclinedAt,
  termsDeclinedBy,
  editsRequestedAt,
  hostFirstName,
  guestFirstName,
}: TermsOfferedProps) {
  // Section-level diff flags. Dates + guests collapse into one
  // "details" section; total and policy each get their own. We
  // only show the pill when we have an original to compare.
  const detailsChanged =
    (originalCheckIn !== null && originalCheckIn !== checkIn) ||
    (originalCheckOut !== null && originalCheckOut !== checkOut) ||
    (originalGuestCount !== null && originalGuestCount !== guestCount);
  const totalChanged =
    originalTotalEstimate !== null &&
    totalEstimate !== null &&
    originalTotalEstimate !== totalEstimate;
  const policyChanged =
    originalPolicy !== null && !policiesEqual(originalPolicy, policy);
  const anyChanged = detailsChanged || totalChanged || policyChanged;
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [acceptedAt, setAcceptedAt] = useState<string | null>(termsAcceptedAt);
  const [declinedAt, setDeclinedAt] = useState<string | null>(termsDeclinedAt);
  const [declinedBy, setDeclinedBy] = useState<"guest" | "host" | null>(
    termsDeclinedBy
  );
  // Decline confirmation dialog. Decline endpoint differs by viewer:
  // guest → /decline-terms, host → /decline-reservation. The reason
  // textarea is local-only — flows into terms_decline_reason on the
  // contact_request and stays private to the declining user.
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);
  // S7: host-side Edit dialog + guest-side Request Edits button.
  const [editOpen, setEditOpen] = useState(false);
  const [requestingEdits, setRequestingEdits] = useState(false);
  const pending = !acceptedAt && !declinedAt;
  const hasEditsRequest = Boolean(editsRequestedAt);

  const requestEdits = async () => {
    if (requestingEdits) return;
    setRequestingEdits(true);
    try {
      const res = await fetch(
        `/api/contact-requests/${bookingId}/request-edits`,
        { method: "POST" }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Couldn't send edit request");
        return;
      }
      // Navigate the guest into the composer with a prefilled stub so
      // they can spell out what they want changed. The prefill URL
      // param is one-shot — ThreadView only seeds it when messages
      // are empty, so we bypass that by focusing the composer
      // directly and setting its value via a DOM event.
      const composer = document.querySelector(
        "textarea[placeholder^='Type']"
      ) as HTMLTextAreaElement | null;
      if (composer) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          "value"
        )?.set;
        nativeSetter?.call(composer, "Requested edits on terms: ");
        composer.dispatchEvent(new Event("input", { bubbles: true }));
        composer.focus();
        composer.scrollIntoView({ behavior: "smooth", block: "center" });
        // Move cursor to end so the guest types directly after the
        // prefill stub.
        const endPos = composer.value.length;
        composer.setSelectionRange(endPos, endPos);
      }
      toast.success("Edit request noted — send your message below");
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("inbox:thread-refresh"));
      }
    } catch {
      toast.error("Network error");
    } finally {
      setRequestingEdits(false);
    }
  };

  const declineEndpoint =
    viewerRole === "guest" ? "decline-terms" : "decline-reservation";

  const decline = async () => {
    if (declining) return;
    setDeclining(true);
    try {
      const res = await fetch(
        `/api/contact-requests/${bookingId}/${declineEndpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: declineReason || null }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        terms_declined_at?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      const at = data.terms_declined_at ?? new Date().toISOString();
      setDeclinedAt(at);
      setDeclinedBy(viewerRole);
      setDeclineOpen(false);
      toast.success(
        viewerRole === "guest"
          ? "Terms declined — the host has been notified"
          : "Reservation withdrawn — the guest has been notified"
      );
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("inbox:thread-refresh"));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't decline");
    } finally {
      setDeclining(false);
    }
  };

  const accept = async () => {
    if (submitting || acceptedAt || declinedAt) return;
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
      toast.success("Terms accepted — you're connected");
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

  // Header tone shifts to red when declined — same shell, same
  // collapsible behaviour, just an alarm-flavoured icon chip so the
  // declined state reads at a glance from the timeline.
  const headerIconClasses = declinedAt
    ? "bg-red-100 text-red-700"
    : "bg-emerald-100 text-emerald-700";

  // Once the guest has accepted (or either party has declined), the
  // big middle (dates tiles, total breakdown, policy block, payment
  // methods) auto-collapses so the thread reads as a compact
  // "header + footer" timeline entry. Clicking the header opens it
  // back up.
  const headerRow = (
    <div className="flex items-start gap-3 p-4">
      <div
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          headerIconClasses
        )}
      >
        {declinedAt ? (
          <X className="h-4 w-4" />
        ) : (
          <ShieldCheck className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-semibold">{title}</div>
          {/* S7 — pending + guest asked for edits. Shown on both
              sides so the host knows an edit was asked for and the
              guest sees their own ask acknowledged. */}
          {pending && hasEditsRequest && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              <MessageSquare className="h-3 w-3" />
              Edits requested
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {declinedAt
            ? declinedBy === "host"
              ? "The host withdrew this offer."
              : "These terms were declined."
            : anyChanged && viewerRole === "guest" && !acceptedAt
              ? `${hostFirstName} updated some details before approving — look for the red pills below.`
              : "Here are the full terms for this reservation."}
        </div>
      </div>
      {(acceptedAt || declinedAt) && (
        <ChevronDownIcon className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      )}
    </div>
  );

  const detailsBody = (
    <>
      <SectionHeader
        label="Trip details"
        changed={detailsChanged && viewerRole === "guest"}
      />
      <div className="grid grid-cols-1 divide-y divide-border border-b border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <FieldTile
          icon={CalendarDays}
          label="Check-in"
          value={fmtDate(checkIn)}
        />
        <FieldTile
          icon={CalendarDays}
          label="Checkout"
          value={fmtDate(checkOut)}
        />
        <FieldTile
          icon={Users}
          label="Guests"
          value={
            guestCount !== null
              ? `${guestCount} guest${guestCount === 1 ? "" : "s"}`
              : "—"
          }
        />
      </div>

      {typeof totalEstimate === "number" && totalEstimate > 0 && (
        <>
          <SectionHeader
            label="Total"
            changed={totalChanged && viewerRole === "guest"}
          />
          <PriceBreakdown
            checkIn={checkIn}
            checkOut={checkOut}
            totalEstimate={totalEstimate}
            nightlyRate={nightlyRate}
            cleaningFee={cleaningFee}
            offeredNightlyRate={offeredNightlyRate}
            offeredCleaningFee={offeredCleaningFee}
          />
        </>
      )}

      <SectionHeader
        label="Cancellation policy"
        changed={policyChanged && viewerRole === "guest"}
      />
      <div className="p-4">
        <CancellationPolicyCard policy={policy} scope="reservation" />
      </div>

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
    </>
  );

  // Declined footer copy mirrors the accepted footer's anatomy
  // (icon chip + headline + dated subline) so the timeline reads
  // consistently. Wording branches on who declined to avoid
  // shaming either side — soft language only.
  const declinedFooter = declinedAt && (
    <div className="flex items-center gap-3 border-t border-red-200 bg-red-50 px-4 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-sm">
        <X className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-red-900">
          {declinedBy === "host"
            ? "Reservation withdrawn"
            : "Terms declined"}
        </div>
        <div className="text-xs text-red-800/80">
          {(() => {
            const who =
              declinedBy === "guest"
                ? viewerRole === "guest"
                  ? "You"
                  : guestFirstName
                : viewerRole === "host"
                  ? "You"
                  : hostFirstName;
            const verb =
              declinedBy === "host" ? "withdrew" : "declined";
            const when = new Date(declinedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            return `${who} ${verb} on ${when}. You can still message each other.`;
          })()}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl border-2 border-border bg-white shadow-sm">
      {acceptedAt || declinedAt ? (
        // Accepted or declined — collapsible shell. Header + footer
        // stay visible; middle body hides until tapped.
        <details className="group">
          <summary className="cursor-pointer list-none border-b border-border focus-visible:outline-none">
            {headerRow}
          </summary>
          {detailsBody}
        </details>
      ) : (
        // Pending acceptance — full card, no toggle. Guest needs
        // to see every detail before hitting Accept.
        <>
          <div className="border-b border-border">{headerRow}</div>
          {detailsBody}
        </>
      )}

      {declinedFooter}

      {!declinedAt &&
        viewerRole === "guest" &&
        (acceptedAt ? (
          <div className="flex items-center gap-3 border-t border-emerald-200 bg-emerald-50 px-4 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
              <Check className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-emerald-900">
                You&rsquo;re connected
              </div>
              <div className="text-xs text-emerald-800/80">
                You accepted these terms on{" "}
                {new Date(acceptedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                .
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 border-t border-border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">
              Accepting confirms you&apos;ve read and agree to these terms.
              Payment and refunds happen directly with {hostFirstName} —
              1° B&amp;B doesn&apos;t process payments.
            </p>
            {/* Guest actions — two secondary buttons on top (Decline
                + Request edits) with the primary Accept button on its
                own row below, full-width. Keeps "Accept terms &
                confirm reservation" on one line instead of wrapping
                when it has to share a row with two siblings. */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeclineOpen(true)}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                >
                  <X className="h-4 w-4" />
                  Decline
                </button>
                {/* S7 Task 4 — secondary ask-for-edits action. */}
                <button
                  type="button"
                  onClick={requestEdits}
                  disabled={submitting || requestingEdits}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-50 disabled:opacity-60"
                >
                  {requestingEdits ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                  Request edits
                </button>
              </div>
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
                    <Loader2 className="h-4 w-4 animate-spin" /> Connecting…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Accept terms &amp; connect
                  </>
                )}
              </button>
            </div>
          </div>
        ))}

      {!declinedAt && viewerRole === "host" && !acceptedAt && (
        <div className="flex flex-col-reverse items-stretch gap-2 border-t border-border bg-muted/30 p-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            {hasEditsRequest
              ? `${guestFirstName} asked for edits — check their message and update the terms below.`
              : `Waiting for ${guestFirstName} to confirm these terms.`}
          </span>
          <div className="flex items-center gap-2 sm:shrink-0">
            {/* S7 Task 3 — host Edit button. Amber-accented when the
                guest has an open edit request; neutral otherwise. */}
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              disabled={submitting}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-xs font-semibold shadow-sm transition disabled:opacity-60",
                hasEditsRequest
                  ? "border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100"
                  : "border-border bg-white text-foreground hover:bg-muted"
              )}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit terms
            </button>
            <button
              type="button"
              onClick={() => setDeclineOpen(true)}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
            >
              <X className="h-3.5 w-3.5" />
              Withdraw offer
            </button>
          </div>
        </div>
      )}
      {!declinedAt && viewerRole === "host" && acceptedAt && (
        <div className="flex items-center gap-3 border-t border-emerald-200 bg-emerald-50 px-4 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
            <Check className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-emerald-900">
              You&rsquo;re connected
            </div>
            <div className="text-xs text-emerald-800/80">
              {guestFirstName} accepted these terms on{" "}
              {new Date(acceptedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              .
            </div>
          </div>
        </div>
      )}

      {/* S7 Task 3 — host edit dialog. Reuses HostReviewTermsInline
          in edit mode: same compose UI, "Save changes" button,
          PATCH without status flip. Server stamps last_edited_at +
          clears edits_requested_*. */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit terms for {guestFirstName}</DialogTitle>
            <DialogDescription>
              These updates repost in the thread — {guestFirstName} sees a
              &ldquo;terms updated&rdquo; note and the card below refreshes.
            </DialogDescription>
          </DialogHeader>
          <HostReviewTermsInline
            bookingId={bookingId}
            initialTotal={totalEstimate}
            initialPolicy={policy}
            checkIn={checkIn}
            checkOut={checkOut}
            guestCount={guestCount ?? 1}
            nightlyRate={nightlyRate}
            cleaningFee={cleaningFee}
            offeredNightlyRate={offeredNightlyRate}
            offeredCleaningFee={offeredCleaningFee}
            guestFirstName={guestFirstName}
            submitMode="edit"
            onDone={() => {
              setEditOpen(false);
              router.refresh();
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("inbox:thread-refresh")
                );
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {viewerRole === "guest"
                ? "Decline these terms?"
                : "Withdraw this reservation?"}
            </DialogTitle>
            <DialogDescription>
              The other party will be notified. Anything you write below
              is sent to them as a message in this thread.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label
              htmlFor="decline-reason"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Message to {viewerRole === "guest" ? hostFirstName : guestFirstName}{" "}
              (optional)
            </label>
            <textarea
              id="decline-reason"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value.slice(0, 500))}
              placeholder={`Tell ${viewerRole === "guest" ? hostFirstName : guestFirstName} what's going on — sent as a thread message.`}
              rows={3}
              className="w-full rounded-lg border-2 border-border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setDeclineOpen(false)}
              disabled={declining}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={decline}
              disabled={declining}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
            >
              {declining ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {viewerRole === "guest" ? "Declining…" : "Withdrawing…"}
                </>
              ) : viewerRole === "guest" ? (
                "Decline terms"
              ) : (
                "Withdraw offer"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TermsAcceptedProps {
  checkIn: string | null;
  checkOut: string | null;
  totalEstimate: number | null;
  policy: CancellationPolicy;
  /** Host's enabled off-platform methods. Shown only to the guest
   *  viewer; host hides (they know their own handles). */
  paymentMethods: PaymentMethod[];
  /** Listing's nightly rate + cleaning fee. Drives the total
   *  breakdown on the receipt card. */
  nightlyRate: number | null;
  cleaningFee: number | null;
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
  checkIn,
  checkOut,
  totalEstimate,
  policy,
  paymentMethods,
  nightlyRate,
  cleaningFee,
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
            You&rsquo;re connected
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
        <div className="border-b border-emerald-200">
          <PriceBreakdown
            checkIn={checkIn}
            checkOut={checkOut}
            totalEstimate={totalEstimate}
            nightlyRate={nightlyRate}
            cleaningFee={cleaningFee}
            tone="emerald"
          />
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

/**
 * Nights × nightly + cleaning fee + adjustment = total. When the
 * host manually overrode the total (total_estimate differs from
 * nights × rate + cleaning), surface the delta as an "Adjustment"
 * line so the numbers reconcile instead of silently not summing.
 */
function PriceBreakdown({
  checkIn,
  checkOut,
  totalEstimate,
  nightlyRate,
  cleaningFee,
  offeredNightlyRate,
  offeredCleaningFee,
  tone = "default",
}: {
  checkIn: string | null;
  checkOut: string | null;
  totalEstimate: number;
  /** Listing baseline — used for the "normally $X" comparison
   *  sublines when the host offered something different. */
  nightlyRate: number | null;
  cleaningFee: number | null;
  /** S7/040 offered breakdown. When present the card shows these as
   *  the primary rows; the baseline values only appear as muted
   *  comparison text beneath when they differ. */
  offeredNightlyRate?: number | null;
  offeredCleaningFee?: number | null;
  tone?: "default" | "emerald";
}) {
  const nights = (() => {
    if (!checkIn || !checkOut) return null;
    const a = new Date(checkIn);
    const b = new Date(checkOut);
    const ms = b.getTime() - a.getTime();
    const n = Math.round(ms / 86_400_000);
    return n > 0 ? n : null;
  })();

  // Prefer the host-offered breakdown when we have it (migration 040+).
  // Fall back to the listing baseline on legacy rows so pre-migration
  // reservations still render something sensible.
  const effectiveNightly =
    typeof offeredNightlyRate === "number" ? offeredNightlyRate : nightlyRate;
  const effectiveCleaning =
    typeof offeredCleaningFee === "number"
      ? offeredCleaningFee
      : (cleaningFee ?? 0);

  const haveRate =
    typeof effectiveNightly === "number" && effectiveNightly > 0;
  const nightsSubtotal =
    nights !== null && haveRate ? nights * effectiveNightly! : null;
  const cleaningAmount = Math.max(0, effectiveCleaning ?? 0);
  const sumKnown = (nightsSubtotal ?? 0) + cleaningAmount;
  const adjustment =
    nightsSubtotal !== null ? totalEstimate - sumKnown : 0;

  // Optional comparison sublines — shown only when the host offered
  // something different from the listing baseline. Keeps the guest
  // oriented ("this is a discount from the listing rate") without
  // forcing a confusing "Discount" row that doesn't explain where the
  // delta came from.
  const showNightlyCompare =
    typeof offeredNightlyRate === "number" &&
    typeof nightlyRate === "number" &&
    offeredNightlyRate !== nightlyRate;
  const nightlyDelta = showNightlyCompare
    ? nightlyRate! - offeredNightlyRate!
    : 0;
  const showCleaningCompare =
    typeof offeredCleaningFee === "number" &&
    typeof cleaningFee === "number" &&
    offeredCleaningFee !== cleaningFee;
  const cleaningDelta = showCleaningCompare
    ? cleaningFee! - offeredCleaningFee!
    : 0;

  const labelTone =
    tone === "emerald" ? "text-emerald-900/70" : "text-muted-foreground";
  const valueTone = tone === "emerald" ? "text-emerald-900" : "";
  const totalTone =
    tone === "emerald" ? "text-emerald-900" : "text-foreground";

  return (
    <div className="px-4 py-3">
      {nightsSubtotal !== null && (
        <div className="py-1 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className={labelTone}>
              {nights} night{nights === 1 ? "" : "s"} × $
              {effectiveNightly!.toLocaleString()}
            </span>
            <span className={cn("font-medium", valueTone)}>
              ${nightsSubtotal.toLocaleString()}
            </span>
          </div>
          {showNightlyCompare && nightlyDelta !== 0 && (
            <div className={cn("text-[11px]", labelTone)}>
              {nightlyDelta > 0
                ? `Listing rate $${nightlyRate!.toLocaleString()}/night — saving $${nightlyDelta.toLocaleString()}/night`
                : `Listing rate $${nightlyRate!.toLocaleString()}/night — $${Math.abs(nightlyDelta).toLocaleString()}/night premium`}
            </div>
          )}
        </div>
      )}
      {(cleaningAmount > 0 || showCleaningCompare) && (
        <div className="py-1 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className={labelTone}>
              {cleaningAmount > 0 ? "Cleaning fee" : "Cleaning fee waived"}
            </span>
            <span className={cn("font-medium", valueTone)}>
              ${cleaningAmount.toLocaleString()}
            </span>
          </div>
          {showCleaningCompare && cleaningDelta !== 0 && (
            <div className={cn("text-[11px]", labelTone)}>
              {cleaningAmount === 0
                ? `Normally $${cleaningFee!.toLocaleString()} — waived by the host`
                : cleaningDelta > 0
                  ? `Normally $${cleaningFee!.toLocaleString()} — saving $${cleaningDelta.toLocaleString()}`
                  : `Normally $${cleaningFee!.toLocaleString()} — +$${Math.abs(cleaningDelta).toLocaleString()}`}
            </div>
          )}
        </div>
      )}
      {nightsSubtotal !== null && Math.abs(adjustment) >= 1 && (
        // Remaining residual after the per-line breakdown accounts for
        // nightly + cleaning. Only renders when the host set a total
        // that doesn't match nightly × N + cleaning (rare — typically
        // a rounding quirk or legacy row without offered values).
        <div className="flex items-start justify-between gap-3 py-1 text-sm">
          <span className={labelTone}>
            {adjustment > 0 ? "Adjustment" : "Discount"}
          </span>
          <span className={cn("shrink-0 font-medium", valueTone)}>
            {adjustment > 0 ? "+" : "−"}$
            {Math.abs(adjustment).toLocaleString()}
          </span>
        </div>
      )}
      <div
        className={cn(
          "mt-1 flex items-center justify-between gap-3 border-t pt-2 text-sm",
          tone === "emerald" ? "border-emerald-200" : "border-border"
        )}
      >
        <span
          className={cn(
            "flex items-center gap-2 text-xs font-semibold uppercase tracking-wide",
            labelTone
          )}
        >
          <Receipt className="h-3.5 w-3.5" />
          Estimated total
        </span>
        <span className={cn("text-base font-bold", totalTone)}>
          ${totalEstimate.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

function FieldTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}

/**
 * Small section header used on the terms_offered card — shows a
 * section label and, if the host changed anything in that section
 * since the original request, a red "Host updated" pill. Keeps
 * the diff surface scannable without per-field amber tinting.
 */
function SectionHeader({
  label,
  changed,
}: {
  label: string;
  changed: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/20 px-4 py-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {changed && (
        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-800">
          Host updated
        </span>
      )}
    </div>
  );
}

function TermsPaymentMethodRow({ method }: { method: PaymentMethod }) {
  const meta = paymentMethodMeta(method.type);
  const url = paymentMethodUrl(method);
  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(displayHandle(method));
      toast.success(`${meta.label} handle copied`);
    } catch {
      toast.error("Couldn't copy");
    }
  };
  // When the method has a deep-link URL (Venmo, PayPal, Wise,
  // Zelle-with-email), the whole row is a clickable anchor that
  // opens the payment app. The copy button still works but is
  // stopPropagation'd so a click there doesn't also navigate.
  const contents = (
    <>
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
    </>
  );
  const base =
    "flex items-center justify-between gap-2 rounded-lg border border-border bg-white p-2.5";
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(base, "transition hover:border-foreground/40 hover:bg-muted/40")}
      >
        {contents}
      </a>
    );
  }
  return <div className={base}>{contents}</div>;
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

  // "Coming up" vs "due now" gates copy + CTA. Computed UTC-midnight
  // so the calendar boundary matches the due_at DATE column.
  const daysUntilDue = (() => {
    const today = new Date();
    const todayUtc = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    );
    const [y, m, d] = event.due_at.slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return 0;
    const due = new Date(Date.UTC(y, m - 1, d));
    return Math.round((due.getTime() - todayUtc.getTime()) / 86_400_000);
  })();
  const isUpcoming = daysUntilDue > 0;
  const dueCopy = isUpcoming
    ? daysUntilDue === 1
      ? "due tomorrow"
      : `due in ${daysUntilDue} days`
    : daysUntilDue === 0
      ? "due today"
      : "past due";

  // Upcoming payments collapse by default so the thread timeline
  // isn't swamped with payment option lists. Due-now (and past-due)
  // payments open by default — the ask is current so the action
  // should be one click away.
  const [open, setOpen] = useState(!isUpcoming);

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

  // Visual tone flips with the state — muted slate for upcoming,
  // amber for due/past-due so the thread hierarchy matches urgency.
  const iconBg =
    isUpcoming && !pastScheduled
      ? "bg-slate-100 text-slate-600"
      : "bg-amber-100 text-amber-700";

  const canPayNow =
    viewerRole === "guest" && !pastScheduled;

  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border-2 border-border bg-white shadow-sm">
      {/* Summary row — always visible. Stays the "timeline of record"
          entry so past payments remain readable after confirmation. */}
      <div className="flex items-start gap-3 p-4">
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            iconBg
          )}
        >
          <DollarSign className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {paymentOrdinal(event.schedule_index, totalEvents)}
            </span>
            {isUpcoming && !pastScheduled && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                Coming up
              </span>
            )}
          </div>
          <div className="mt-0.5 text-sm font-semibold">
            {formatCentsDisplay(event.amount_cents)} {dueCopy} ·{" "}
            {fmtDueDate(event.due_at)}
          </div>
          {viewerRole === "host" && (
            <div className="mt-0.5 text-xs text-muted-foreground">
              {isUpcoming
                ? `${guestFirstName} will see this in their thread.`
                : `Waiting on ${guestFirstName} to send this payment.`}
            </div>
          )}
        </div>
        {canPayNow && isUpcoming && (
          // Upcoming → single top-line "Pay early" toggle. Expanded
          // state shows the methods + actual mark-as-paid commit.
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted/50"
            )}
          >
            {open ? "Close" : "Pay early"}
            <ChevronDownIcon
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        )}
      </div>

      {/* Expanded body — payment method links + mark-as-paid commit.
          Default-open for due/past-due, default-closed for upcoming. */}
      {canPayNow && open && (
        <div className="space-y-3 border-t border-border bg-muted/30 p-4">
          {paymentMethods.length > 0 && (
            <div>
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
                Mark as paid — {formatCentsDisplay(event.amount_cents)}
              </>
            )}
          </button>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {isUpcoming
              ? `No rush — this isn't due yet. Only mark it paid once you've actually sent ${hostFirstName} the money.`
              : `Send ${hostFirstName} the money using one of the methods above, then mark it paid so they can confirm receipt.`}
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
  const [unmarking, setUnmarking] = useState(false);
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

  const unmarkPaid = async () => {
    if (unmarking) return;
    setUnmarking(true);
    try {
      const res = await fetch(
        `/api/payment-events/${event.id}/unmark-paid`,
        { method: "POST" }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      toast.success("Unmarked — payment is scheduled again");
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("inbox:thread-refresh"));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't unmark");
    } finally {
      setUnmarking(false);
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
        <div className="flex items-center justify-between gap-2 border-t border-sky-200 bg-white/40 px-4 py-3">
          <div className="text-xs text-sky-900/80">
            {hostFirstName} will confirm once it lands.
          </div>
          <button
            type="button"
            onClick={unmarkPaid}
            disabled={unmarking}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-sky-900 shadow-sm transition hover:bg-sky-50 disabled:opacity-60"
            )}
          >
            {unmarking ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Unmarking…
              </>
            ) : (
              "Unmark as paid"
            )}
          </button>
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
 * Receipt card for a confirmed payment — the thread's permanent
 * record. Top row mirrors the PaymentDueCard layout (ordinal + amount
 * + date) so the timeline reads as a single payment block that just
 * transitioned to confirmed. Bottom row is the big blue check
 * equivalent of the reservation_confirmed moment on the terms card.
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
    <div className="mx-auto w-full max-w-xl rounded-2xl border-2 border-border bg-white shadow-sm">
      <div className="flex items-start gap-3 p-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
          <DollarSign className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {paymentOrdinal(event.schedule_index, totalEvents)}
          </div>
          <div className="mt-0.5 text-sm font-semibold">
            {formatCentsDisplay(event.amount_cents)}
            {methodLabel ? ` · ${methodLabel}` : ""}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {fmtDueDate(event.due_at)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-sky-200 bg-sky-50 px-4 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white shadow-sm">
          <Check className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-sky-900">
            Payment completed
          </div>
          <div className="text-xs text-sky-800/80">
            {viewerRole === "host"
              ? `You confirmed ${guestFirstName}'s payment${confirmedOn ? ` on ${confirmedOn}` : ""}.`
              : `${hostFirstName} confirmed your payment${confirmedOn ? ` on ${confirmedOn}` : ""}.`}
          </div>
        </div>
      </div>
    </div>
  );
}
