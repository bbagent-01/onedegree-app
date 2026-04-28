"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Lock, MessageCircle, UserPlus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RequestIntroDialog } from "@/components/trust/request-intro-dialog";
import type { TrustPathUser } from "@/lib/trust-data";

/**
 * Sender-side pill summary for an intro request on the listing
 * preview. Drives every "already in flight / already accepted /
 * declined / ignored" state so the Request Intro button never shows
 * when an outstanding thread already exists.
 */
export interface PendingIntroSummary {
  threadId: string;
  status: "pending" | "accepted" | "declined" | "ignored";
  decidedAt: string | null;
  /** True iff the recipient has posted a non-system message in the
   *  thread. While status === "pending", this flips the pill from
   *  "Waiting" to "Conversation started — awaiting their decision". */
  recipientReplied: boolean;
}

interface Props {
  listingId: string;
  listingTitle: string;
  hostName: string;
  isSignedIn: boolean;
  /** Whether the viewer can message the host directly (full-gate open). */
  canMessage: boolean;
  /** Host's allow_intro_requests toggle. */
  canRequestIntro: boolean;
  mutualConnections: TrustPathUser[];
  /** Any intro state this viewer has on this listing — flips the CTA
   *  into the appropriate pill rather than re-prompting. */
  pendingIntro?: PendingIntroSummary | null;
}

/**
 * Primary CTA block on the gated listing preview. A preview is never
 * a dead end — the viewer always has at least one action:
 *
 *   - Full contact unlocked  → "Message host"
 *   - Intro already in flight → appropriate pill (waiting, accepted,
 *                                declined, ended)
 *   - Intro requests allowed → "Request intro" opens the modal
 *   - Intro requests disabled → "Private listing" state, no CTA
 */
export function GatedListingCTA({
  listingId,
  listingTitle: _listingTitle,
  hostName,
  isSignedIn,
  canMessage,
  canRequestIntro,
  mutualConnections,
  pendingIntro,
}: Props) {
  const router = useRouter();
  const [introOpen, setIntroOpen] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const hostFirst = hostName.split(" ")[0];

  if (!isSignedIn) {
    return null;
  }

  // Any intro state in flight takes priority — the viewer already
  // has a thread open, so the sidebar should route them to it.
  if (pendingIntro) {
    const { status, recipientReplied, threadId } = pendingIntro;
    // Accepted: listing flips to full view elsewhere (access unlock);
    // keep a small pill here for continuity so the sidebar doesn't
    // go blank during transition renders.
    if (status === "accepted") {
      return (
        <div className="mt-3 rounded-lg border-2 border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">
                Access unlocked
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                You and {hostFirst} can see each other&rsquo;s full listings.
              </p>
            </div>
          </div>
          <Link
            href={`/inbox/${threadId}`}
            className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border-2 border-border bg-white font-semibold text-foreground transition hover:bg-muted"
          >
            <MessageCircle className="h-4 w-4" />
            Open conversation
          </Link>
        </div>
      );
    }

    // Declined (or revoked-after-accepted, which writes declined too).
    if (status === "declined") {
      const revoked =
        pendingIntro.decidedAt &&
        // If decidedAt exists and there was a prior accept state, the
        // grant was revoked. We can't distinguish without an extra
        // lookup; the soft copy works for both cases.
        true;
      return (
        <div className="mt-3 rounded-lg border-2 border-zinc-200 bg-zinc-50 p-3">
          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">
                {revoked ? "Access ended" : "Not available right now"}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                You can try again in 30 days.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Pending or ignored — both show as waiting from the sender's
    // side. Copy differs based on whether the recipient has replied.
    const label = recipientReplied
      ? "Conversation started"
      : `Waiting for ${hostFirst}`;
    const sub = recipientReplied
      ? `Awaiting ${hostFirst}'s decision. Keep the conversation going in the thread.`
      : `${hostFirst} will see your profile and decide whether to engage.`;
    return (
      <>
        <div className="mt-3 rounded-lg border-2 border-violet-200 bg-violet-50/60 p-3">
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">
                {label}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
            </div>
          </div>
        </div>
        <Link
          href={`/inbox/${threadId}`}
          className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border-2 border-border bg-white font-semibold text-foreground transition hover:bg-muted"
        >
          <MessageCircle className="h-4 w-4" />
          Open conversation
        </Link>
      </>
    );
  }

  const messageHost = async () => {
    if (messaging) return;
    setMessaging(true);
    try {
      const res = await fetch("/api/message-threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        threadId?: string;
        error?: string;
      };
      if (!res.ok || !data.threadId) {
        toast.error(data.error || "Couldn't open conversation");
        return;
      }
      router.push(`/inbox/${data.threadId}`);
    } catch {
      toast.error("Network error");
    } finally {
      setMessaging(false);
    }
  };

  if (canMessage) {
    return (
      <>
        <p className="mt-2 text-sm text-foreground">
          Message {hostFirst} directly about this listing.
        </p>
        <Button
          type="button"
          onClick={messageHost}
          disabled={messaging}
          className="mt-4 flex h-10 w-full gap-2 rounded-lg bg-brand font-semibold hover:bg-brand-600"
        >
          <MessageCircle className="h-4 w-4" />
          {messaging ? "Opening…" : `Message ${hostFirst}`}
        </Button>
      </>
    );
  }

  if (canRequestIntro) {
    const helper =
      mutualConnections.length > 0
        ? `You share ${mutualConnections.length} mutual connection${mutualConnections.length === 1 ? "" : "s"} with ${hostFirst}. They'll see how you're linked.`
        : `Introduce yourself directly. ${hostFirst} will see your full profile and decide whether to engage.`;

    return (
      <>
        <p className="mt-2 text-sm text-foreground">{helper}</p>
        <Button
          type="button"
          onClick={() => setIntroOpen(true)}
          className="mt-4 flex h-10 w-full gap-2 rounded-lg bg-brand font-semibold hover:bg-brand-600"
        >
          <UserPlus className="h-4 w-4" />
          Request intro
        </Button>

        <RequestIntroDialog
          open={introOpen}
          onOpenChange={setIntroOpen}
          listingId={listingId}
          recipientFirstName={hostFirst}
        />
      </>
    );
  }

  return (
    <p className="mt-2 text-sm text-muted-foreground">
      This host isn&apos;t accepting introduction requests right now.
    </p>
  );
}
