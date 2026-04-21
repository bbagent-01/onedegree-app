"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  bookingId: string;
  initialAcceptedAt: string | null;
  /**
   * Optional compact variant for the inbox sidebar. Full variant is
   * used on the trip detail page.
   */
  compact?: boolean;
}

/**
 * Guest-only "I've read and accept these terms" acknowledgement for
 * a snapshotted cancellation & payment policy. Posts to
 * POST /api/contact-requests/[id]/accept-terms.
 *
 * Not a legal gate — the platform doesn't enforce contracts. But
 * having the acknowledgement tracked gives both sides a common
 * timestamp for when the snapshot was seen and agreed to.
 */
export function AcceptTermsCheckbox({
  bookingId,
  initialAcceptedAt,
  compact = false,
}: Props) {
  const router = useRouter();
  const [acceptedAt, setAcceptedAt] = useState<string | null>(
    initialAcceptedAt
  );
  const [submitting, setSubmitting] = useState(false);

  const accept = async () => {
    if (acceptedAt || submitting) return;
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
      if (!res.ok) {
        throw new Error(data.error ?? `Failed (${res.status})`);
      }
      setAcceptedAt(data.terms_accepted_at ?? new Date().toISOString());
      toast.success("Terms accepted");
      // Refresh so the sidebar / trip page re-render with the new state.
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSubmitting(false);
    }
  };

  if (acceptedAt) {
    const when = new Date(acceptedAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return (
      <div
        className={cn(
          "rounded-lg border border-emerald-200 bg-emerald-50 p-3",
          compact ? "text-[11px]" : "text-xs"
        )}
      >
        <div className="flex items-center gap-2 font-semibold text-emerald-900">
          <Check className="h-3.5 w-3.5" />
          You accepted these terms on {when}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border-2 border-amber-300 bg-amber-50 p-3",
        compact ? "space-y-2" : "space-y-2.5"
      )}
    >
      <p
        className={cn(
          "font-semibold text-amber-900",
          compact ? "text-xs" : "text-sm"
        )}
      >
        Action needed: accept these terms
      </p>
      <p
        className={cn(
          "leading-relaxed text-amber-900/80",
          compact ? "text-[11px]" : "text-xs"
        )}
      >
        Review the cancellation &amp; payment schedule above, then
        check the box to confirm you&apos;ve read and accept the terms.
        They&apos;re locked to this reservation — later edits to the
        host&apos;s defaults won&apos;t change what applies here.
      </p>
      <button
        type="button"
        onClick={accept}
        disabled={submitting}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-amber-400 bg-white font-semibold text-amber-900 shadow-sm transition hover:bg-amber-100 disabled:opacity-60",
          compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
        )}
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-amber-500 bg-white" />
        )}
        I&rsquo;ve read and accept these terms
      </button>
    </div>
  );
}
