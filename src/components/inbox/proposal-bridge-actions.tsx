"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, SendHorizonal, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { HostListingPicker } from "@/components/proposals/host-listing-picker";

interface Props {
  threadId: string;
  currentUserId: string;
  /** Thread participants (from ThreadDetail). Used to gate which side
   *  sees which button. */
  hostId: string;
  guestId: string;
  /** From thread.origin_proposal hydrated by getThreadDetail. */
  proposal: {
    id: string;
    kind: "trip_wish" | "host_offer";
    title: string;
    listing_id: string | null;
    status: "active" | "expired" | "closed";
    isAvailable: boolean;
  };
  /** Drives the "thread already has an active terms flow" guard.
   *  Mirrors thread.contact_request_id from getThreadDetail. */
  hasActiveTermsFlow: boolean;
  /** When false, the listing-scoped thread already exists between
   *  these parties about the picked listing OR the host has zero
   *  active listings — the picker handles its own empty state. */
}

/**
 * S9d bridge action row that sits in the thread between the listing
 * context card and the message scroller. Decides which side gets
 * which CTA based on viewer role + proposal kind.
 *
 *   - TW viewed by the host → "Send stay terms" (opens picker, then
 *     POSTs from-proposal with the chosen listing_id).
 *   - HO viewed by the guest → "Request these terms" (one-tap POST
 *     using HO's pinned listing_id).
 *
 * Hidden in three cases:
 *   - Proposal no longer available (closed/expired/deleted).
 *   - The thread already has an active contact_request_id.
 *   - Viewer role doesn't match the proposal's expected actor.
 */
export function ProposalBridgeActions({
  threadId,
  currentUserId,
  hostId,
  guestId,
  proposal,
  hasActiveTermsFlow,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const isHost = currentUserId === hostId;
  const isGuest = currentUserId === guestId;
  const isTW = proposal.kind === "trip_wish";
  const isHO = proposal.kind === "host_offer";

  // Role/kind gating — only the actor whose action makes sense gets
  // the button. Wrong-side viewers (e.g. TW author looking at their
  // own thread) see nothing here.
  const showSendTerms = isTW && isHost;
  const showRequestTerms = isHO && isGuest;
  if (!showSendTerms && !showRequestTerms) return null;

  const callFromProposal = async (listingId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/contact-requests/from-proposal/${threadId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listing_id: listingId,
            proposal_id: proposal.id,
          }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        threadId?: string;
        contactRequestId?: string;
        error?: string;
        info?: string;
      };
      if (!res.ok || !data.ok || !data.threadId) {
        toast.error(data.error || "Couldn't start stay terms.");
        return;
      }
      if (data.info === "existing-flow") {
        toast.info("Stay terms already started — opening that thread.");
      }
      // For TW the target thread is usually a NEW listing-scoped
      // one, so route there. For HO it's the same thread but a
      // refresh is still needed so the new contact_request hydrates
      // (HostReviewTermsInline / TermsOfferedCard etc).
      if (data.threadId !== threadId) {
        router.push(`/inbox/${data.threadId}`);
      } else {
        router.refresh();
      }
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
      setPickerOpen(false);
    }
  };

  // Disabled-button helper: explain WHY the action is unavailable
  // instead of just hiding the CTA. Hidden CTAs train users that the
  // bridge doesn't exist; disabled-with-tooltip teaches them.
  const disabledReason = (() => {
    if (!proposal.isAvailable) {
      return isTW
        ? "This Trip Wish is closed or expired."
        : "This Host Offer is closed or expired.";
    }
    if (hasActiveTermsFlow) {
      return "Stay terms have already been started in this thread.";
    }
    return null;
  })();
  const disabled = !!disabledReason || busy;

  if (showSendTerms) {
    return (
      <>
        <div className="shrink-0 border-b border-border bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={disabled}
            title={disabledReason ?? undefined}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizonal className="h-4 w-4" />
            )}
            Send stay terms
          </button>
          {disabledReason && (
            <div className="mt-1.5 text-xs text-muted-foreground">
              {disabledReason}
            </div>
          )}
        </div>
        <HostListingPicker
          isOpen={pickerOpen}
          onClose={() => {
            if (!busy) setPickerOpen(false);
          }}
          onSelect={(listingId) => callFromProposal(listingId)}
        />
      </>
    );
  }

  // showRequestTerms — guest side of an HO. No picker; HO already
  // pins the listing. One tap → POST.
  const hoListingId = proposal.listing_id;
  return (
    <div className="shrink-0 border-b border-border bg-white px-4 py-3">
      <button
        type="button"
        onClick={() => {
          if (!hoListingId) {
            toast.error(
              "This Host Offer has no listing attached — request can't be sent."
            );
            return;
          }
          callFromProposal(hoListingId);
        }}
        disabled={disabled || !hoListingId}
        title={
          disabledReason ??
          (!hoListingId
            ? "This Host Offer has no listing attached."
            : undefined)
        }
        className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Request these terms
      </button>
      {disabledReason && (
        <div className="mt-1.5 text-xs text-muted-foreground">
          {disabledReason}
        </div>
      )}
    </div>
  );
}
