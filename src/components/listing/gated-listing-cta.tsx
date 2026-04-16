"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RequestIntroDialog } from "@/components/trust/request-intro-dialog";
import type { TrustPathUser } from "@/lib/trust-data";

interface Props {
  listingId: string;
  listingTitle: string;
  hostName: string;
  isSignedIn: boolean;
  canMessage: boolean;
  canRequestIntro: boolean;
  mutualConnections: TrustPathUser[];
}

/**
 * Primary CTA block on the gated listing preview. Decides between:
 *   - Request introduction  (when request_intro is allowed + has mutuals)
 *   - Message host          (when message is allowed)
 *   - Grow your network     (else)
 *   - Sign in               (anonymous viewers)
 *
 * Guarantees a preview is never a dead end: there's always a next step.
 */
export function GatedListingCTA({
  listingId,
  listingTitle,
  hostName,
  isSignedIn,
  canMessage,
  canRequestIntro,
  mutualConnections,
}: Props) {
  const router = useRouter();
  const [introOpen, setIntroOpen] = useState(false);
  const [messaging, setMessaging] = useState(false);

  const hostFirst = hostName.split(" ")[0];
  const canShowIntro = canRequestIntro && mutualConnections.length > 0;

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

  if (!isSignedIn) {
    return (
      <>
        <p className="mt-2 text-sm text-foreground">
          Sign in to see your connection to this host. If you share friends,
          the listing unlocks automatically.
        </p>
        <Link
          href="/sign-in"
          className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90"
        >
          Sign in
        </Link>
      </>
    );
  }

  if (canShowIntro) {
    return (
      <>
        <p className="mt-2 text-sm text-foreground">
          Ask a mutual connection to introduce you to {hostFirst}. One warm
          intro usually unlocks access.
        </p>
        <Button
          type="button"
          onClick={() => setIntroOpen(true)}
          className="mt-4 flex h-10 w-full gap-2 rounded-lg bg-brand font-semibold hover:bg-brand-600"
        >
          <UserPlus className="h-4 w-4" />
          Request introduction
        </Button>
        {canMessage && (
          <button
            type="button"
            onClick={messageHost}
            disabled={messaging}
            className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
          >
            <MessageCircle className="h-4 w-4" />
            {messaging ? "Opening…" : `Message ${hostFirst} directly`}
          </button>
        )}
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {mutualConnections.length} mutual connection
          {mutualConnections.length === 1 ? "" : "s"} available
        </p>

        <RequestIntroDialog
          open={introOpen}
          onOpenChange={setIntroOpen}
          listingId={listingId}
          listingTitle={listingTitle}
          hostName={hostName}
          mutualConnections={mutualConnections}
        />
      </>
    );
  }

  if (canMessage) {
    return (
      <>
        <p className="mt-2 text-sm text-foreground">
          Message {hostFirst} directly about this listing. They may have room
          to share more once they know who&apos;s asking.
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

  return (
    <>
      <p className="mt-2 text-sm text-foreground">
        You don&apos;t share any connections with this host yet. Grow your
        network — once someone you know vouches for someone in this host&apos;s
        circle, the listing unlocks automatically.
      </p>
      <Link
        href="/invite"
        className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90"
      >
        Grow your network
      </Link>
    </>
  );
}
