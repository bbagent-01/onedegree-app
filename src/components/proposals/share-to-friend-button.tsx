"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { ShareToFriendModal } from "./share-to-friend-modal";

interface Props {
  proposalId: string;
  proposalTitle: string;
  kindLabel: "Trip Wish" | "Host Offer";
}

/**
 * S9e: "Share with a friend" CTA on /proposals/[id].
 *
 * Opens a recipient picker; on select, find-or-create a 2-party DM
 * with the recipient and prefill the composer with the proposal
 * link + nudge. The user can edit before sending.
 */
export function ShareToFriendButton({
  proposalId,
  proposalTitle,
  kindLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-semibold hover:bg-muted"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Share with a friend
      </button>
      <ShareToFriendModal
        open={open}
        onOpenChange={setOpen}
        proposalId={proposalId}
        proposalTitle={proposalTitle}
        kindLabel={kindLabel}
      />
    </>
  );
}
