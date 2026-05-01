"use client";

/**
 * Thread card for the `__type:review_prompt__` structured message.
 * Posted by the review cron when a stay ends; renders inline in
 * the thread with a "Leave a review" button for whichever side
 * hasn't reviewed yet. Opens the unified ReviewFlowDialog in
 * place so the reviewer never has to leave the thread.
 */

import { useState } from "react";
import { Check, ChevronDown, MessageSquareHeart } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReviewFlowDialog } from "./ReviewFlowDialog";

interface Props {
  viewerRole: "guest" | "host";
  bookingId: string;
  stayConfirmationId: string | null;
  reviewedByMe: boolean;
  otherUser: { id: string; name: string };
  listingTitle: string;
  alreadyVouched: boolean;
}

export function ReviewPromptCard({
  viewerRole,
  bookingId,
  stayConfirmationId,
  reviewedByMe,
  otherUser,
  listingTitle,
  alreadyVouched,
}: Props) {
  const [open, setOpen] = useState(false);
  const otherFirst = otherUser.name.split(" ")[0] || "them";

  // Summary header — always visible.
  const summary = (
    <div className="flex items-start gap-3 p-4">
      <div
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          reviewedByMe
            ? "bg-[var(--tt-mint-mid)]/20 text-[var(--tt-mint)]"
            : "bg-violet-100 text-violet-700"
        )}
      >
        <MessageSquareHeart className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Stay ended
        </div>
        <div className="mt-0.5 text-sm font-semibold">
          {reviewedByMe
            ? viewerRole === "guest"
              ? `You reviewed ${otherFirst} and the stay`
              : `You reviewed ${otherFirst}`
            : viewerRole === "guest"
              ? `How was your stay with ${otherFirst}?`
              : `How was ${otherFirst} as a guest?`}
        </div>
        {!reviewedByMe && (
          <div className="mt-0.5 text-xs text-muted-foreground">
            Your review helps the next person deciding whether to trust them.
          </div>
        )}
      </div>
      {reviewedByMe && (
        <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      )}
    </div>
  );

  // Single top-level tree so the ReviewFlowDialog stays mounted
  // across reviewedByMe transitions. Previously the card had two
  // separate return branches, each rendering its own dialog —
  // React unmounted the dialog during the transition and the
  // post-review vouch step never appeared. The card itself
  // branches inline; the dialog is a stable sibling.
  return (
    <>
      {reviewedByMe ? (
        <details className="group mx-auto w-full max-w-xl overflow-hidden rounded-2xl border-2 border-border bg-white shadow-sm">
          <summary className="cursor-pointer list-none focus-visible:outline-none">
            {summary}
          </summary>
          <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            Thanks — reviews strengthen the whole network.
          </div>
          <div className="flex items-center gap-2 border-t border-[var(--tt-mint-mid)]/40 bg-[var(--tt-mint-mid)]/10 px-4 py-3 text-xs font-semibold text-[var(--tt-mint)]">
            <Check className="h-3.5 w-3.5" />
            Review submitted
          </div>
        </details>
      ) : (
        <div className="mx-auto w-full max-w-xl rounded-2xl border-2 border-border bg-white shadow-sm">
          {summary}
          <div className="border-t border-border bg-muted/30 p-4">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn(
                "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
              )}
            >
              Leave a review
            </button>
          </div>
        </div>
      )}
      <ReviewFlowDialog
        open={open}
        onOpenChange={setOpen}
        viewerRole={viewerRole}
        bookingId={bookingId}
        stayConfirmationId={stayConfirmationId}
        otherUser={otherUser}
        listingTitle={listingTitle}
        alreadyVouched={alreadyVouched}
      />
    </>
  );
}
