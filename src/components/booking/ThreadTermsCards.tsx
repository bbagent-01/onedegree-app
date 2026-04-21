"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ShieldCheck, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CancellationPolicyCard } from "./CancellationPolicyCard";
import type { CancellationPolicy } from "@/lib/cancellation";

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

export function isStructuredMessage(content: string): boolean {
  return (
    content.startsWith(TERMS_OFFERED_PREFIX) ||
    content.startsWith(TERMS_ACCEPTED_PREFIX)
  );
}

interface TermsOfferedProps {
  bookingId: string;
  totalEstimate: number | null;
  policy: CancellationPolicy;
  viewerRole: "guest" | "host";
  termsAcceptedAt: string | null;
  hostFirstName: string;
  guestFirstName: string;
}

/**
 * Rich inline card posted when the host approves a request — with
 * their final price + cancellation policy snapshot. Guest viewers
 * who haven't acknowledged get a prominent Accept button right in
 * the thread. Host viewers see the same terms for reference.
 */
export function TermsOfferedCard({
  bookingId,
  totalEstimate,
  policy,
  viewerRole,
  termsAcceptedAt,
  hostFirstName,
  guestFirstName,
}: TermsOfferedProps) {
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
          </div>
        </div>
      </div>

      {typeof totalEstimate === "number" && totalEstimate > 0 && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Receipt className="h-3.5 w-3.5" />
            Total
          </div>
          <div className="text-base font-bold">
            ${totalEstimate.toLocaleString()}
          </div>
        </div>
      )}

      <div className="p-4">
        <CancellationPolicyCard policy={policy} scope="reservation" />
      </div>

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
  acceptedAt: string;
  guestFirstName: string;
}

/**
 * Posted after the guest confirms. Spells out the locked terms in
 * the thread one more time so both sides have a scannable record of
 * what was agreed and when.
 */
export function TermsAcceptedCard({
  totalEstimate,
  policy,
  acceptedAt,
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
    </div>
  );
}
