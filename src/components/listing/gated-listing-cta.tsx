"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, MessageCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RequestIntroDialog } from "@/components/trust/request-intro-dialog";
import type { TrustPathUser } from "@/lib/trust-data";

export interface PendingIntroSummary {
  threadId: string;
  routedVia: "connector" | "anonymous";
  connectorName: string | null;
}

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
  /** Existing open intro request — flips CTA into an in-progress
   *  state instead of re-prompting. */
  pendingIntro?: PendingIntroSummary | null;
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
  pendingIntro,
}: Props) {
  const router = useRouter();
  const [introOpen, setIntroOpen] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const hostFirst = hostName.split(" ")[0];
  const firstMutual = mutualConnections[0];

  if (!isSignedIn) {
    return null;
  }

  // Open intro already in flight — show status + link to the thread
  // instead of re-prompting. Takes priority over the "Request intro"
  // surface so the viewer can't accidentally spam requests.
  if (pendingIntro) {
    const via =
      pendingIntro.routedVia === "connector" && pendingIntro.connectorName
        ? ` via ${pendingIntro.connectorName.split(" ")[0]}`
        : "";
    const label =
      pendingIntro.routedVia === "connector"
        ? `Intro in progress${via}`
        : `Intro message sent to ${hostFirst}`;
    const sub =
      pendingIntro.routedVia === "connector"
        ? "Your connector decides whether to introduce you. We'll update this when they do."
        : `${hostFirst} sees your full profile and decides whether to reply.`;
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
          href={`/inbox/${pendingIntro.threadId}`}
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
            : `No mutual connections yet — send ${hostFirst} an intro message. They'll see your full profile and decide whether to reply.`}
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
