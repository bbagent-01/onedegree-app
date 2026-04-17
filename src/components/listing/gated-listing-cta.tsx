"use client";

import { useState } from "react";
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
  /** Whether the viewer can message the host directly. */
  canMessage: boolean;
  /** Host's allow_intro_requests toggle. */
  canRequestIntro: boolean;
  mutualConnections: TrustPathUser[];
}

/**
 * Primary CTA block on the gated listing preview. A preview is never
 * a dead end — the viewer always has at least one action:
 *
 *   - Full contact unlocked  → "Message host"
 *   - Intro requests allowed → "Request intro via [Connector]" OR
 *                              "Send intro message" (anonymous)
 *   - Intro requests disabled (host opted out)
 *                            → "Private listing" state, no CTA
 *
 * There is no "Grow your network" fallback — it was unactionable.
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
  const firstMutual = mutualConnections[0];

  if (!isSignedIn) {
    return null;
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
    const buttonLabel = firstMutual
      ? `Request intro via ${firstMutual.name.split(" ")[0]}${
          mutualConnections.length > 1
            ? ` +${mutualConnections.length - 1}`
            : ""
        }`
      : "Send intro message";

    return (
      <>
        <p className="mt-2 text-sm text-foreground">
          {firstMutual
            ? `Ask a mutual connection to introduce you to ${hostFirst}.`
            : `No mutual connections yet — send an anonymous intro. ${hostFirst} sees your name only once they reply.`}
        </p>
        <Button
          type="button"
          onClick={() => setIntroOpen(true)}
          className="mt-4 flex h-10 w-full gap-2 rounded-lg bg-brand font-semibold hover:bg-brand-600"
        >
          <UserPlus className="h-4 w-4" />
          {buttonLabel}
        </Button>
        {mutualConnections.length > 0 && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {mutualConnections.length} mutual connection
            {mutualConnections.length === 1 ? "" : "s"} available
          </p>
        )}

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

  return (
    <p className="mt-2 text-sm text-muted-foreground">
      This host isn&apos;t accepting introduction requests right now.
    </p>
  );
}
