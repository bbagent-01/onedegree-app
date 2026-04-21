"use client";

/**
 * Thread card for the `__type:intro_request__` structured message.
 * Posted by /api/trust/request-intro when a guest routes an intro
 * request through a mutual connector. Renders with a clear
 * "Introduce them" action for the connector — declining is just
 * closing the thread.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface Props {
  /** Set to true once the connector forwarded the intro — freezes the card. */
  introMade: boolean;
  /** Only the connector sees the action button; other viewers see
   *  the card as a read-only status. */
  canIntroduce: boolean;
  connectorThreadId: string;
  guestFirstName: string;
  hostFirstName: string;
  listingTitle: string;
}

export function IntroRequestCard({
  introMade,
  canIntroduce,
  connectorThreadId,
  guestFirstName,
  hostFirstName,
  listingTitle,
}: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const introduce = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/trust/introduce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectorThreadId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        threadId?: string;
        error?: string;
      };
      if (!res.ok || !data.threadId) {
        toast.error(data.error || "Couldn't make the intro");
        return;
      }
      toast.success(`Introduced ${guestFirstName} to ${hostFirstName}`);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border-2 border-border bg-white shadow-sm">
      <div className="flex items-start gap-3 p-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
          <UserPlus className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Intro request
          </div>
          <div className="mt-0.5 text-sm font-semibold">
            {canIntroduce
              ? `${guestFirstName} is asking if you'd introduce them to ${hostFirstName} for a possible stay`
              : `You asked ${canIntroduce ? "" : "a mutual"} to introduce you to ${hostFirstName}`}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Listing: {listingTitle}
          </div>
        </div>
      </div>
      {canIntroduce && !introMade && (
        <div className="flex items-center gap-2 border-t border-border bg-muted/30 p-3">
          <button
            type="button"
            onClick={introduce}
            disabled={submitting}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserPlus className="h-3.5 w-3.5" />
            )}
            Introduce them
          </button>
        </div>
      )}
      {introMade && (
        <div className="flex items-center gap-2 border-t border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900">
          <Check className="h-3.5 w-3.5" />
          Introduction made
        </div>
      )}
      {!canIntroduce && !introMade && (
        <div className="border-t border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
          Waiting for the connector to introduce you.
        </div>
      )}
    </div>
  );
}
