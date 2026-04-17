"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, MessageCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RequestIntroDialog } from "@/components/trust/request-intro-dialog";
import { trustTier, type TrustPathUser } from "@/lib/trust-data";

interface Props {
  listingId: string;
  listingTitle: string;
  hostName: string;
  /** Viewer's 1° vouch score to the host. */
  score: number;
  /** Minimum score gate the host has configured (display only). */
  requiredScore: number;
  canRequestBook: boolean;
  canMessage: boolean;
  canRequestIntro: boolean;
  mutualConnections: TrustPathUser[];
  /** Shown in the header — matches BookingSidebar layout. */
  pricePerNight: number;
}

/**
 * Replaces the BookingSidebar when the viewer can't yet request to
 * book. Takes the same visual slot (sticky card with price header) so
 * the gating feels native rather than tacked on — the date picker is
 * hidden entirely, and the only actions are the ones the viewer
 * actually can take (Request intro / Message host / Grow network).
 */
export function ListingTrustStatus({
  listingId,
  listingTitle,
  hostName,
  score,
  requiredScore,
  canMessage,
  canRequestIntro,
  mutualConnections,
  pricePerNight,
}: Props) {
  const router = useRouter();
  const [introOpen, setIntroOpen] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const tier = trustTier(score);
  const hostFirst = hostName.split(" ")[0];
  const hasIntro = canRequestIntro && mutualConnections.length > 0;

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

  return (
    <div className="sticky top-24 rounded-xl border border-border/60 bg-white p-6 shadow-xl">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-2xl font-semibold">${pricePerNight}</span>
          <span className="text-base text-muted-foreground"> night</span>
        </div>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums shadow-sm"
          style={{}}
        >
          <span className={`rounded-full px-2 py-0.5 ${tier.solidClass}`}>
            {score} 1°
          </span>
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm">
            <div className="font-semibold text-amber-900">
              {canMessage
                ? "Booking needs a stronger connection"
                : "Private listing"}
            </div>
            <p className="mt-0.5 text-amber-800/80">
              Your 1° vouch score with {hostFirst} is{" "}
              <span className="font-semibold">{score}</span>
              {requiredScore > 0 && (
                <>
                  {" "}
                  — this listing requires{" "}
                  <span className="font-semibold">{requiredScore}</span> to
                  request a booking
                </>
              )}
              . {canMessage
                ? "You can still message them, and a conversation often closes the gap."
                : "Grow your trust with this host's network to unlock more actions."}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {hasIntro && (
          <Button
            type="button"
            onClick={() => setIntroOpen(true)}
            className="flex h-11 w-full gap-2 rounded-lg bg-brand text-sm font-semibold hover:bg-brand-600"
          >
            <UserPlus className="h-4 w-4" />
            Request introduction
          </Button>
        )}
        {canMessage && (
          <button
            type="button"
            onClick={messageHost}
            disabled={messaging}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
          >
            <MessageCircle className="h-4 w-4" />
            {messaging ? "Opening…" : `Message ${hostFirst}`}
          </button>
        )}
        {!hasIntro && !canMessage && (
          <Link
            href="/invite"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90"
          >
            Grow your network
          </Link>
        )}
      </div>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        Dates open up once your score with {hostFirst} reaches{" "}
        {requiredScore > 0 ? requiredScore : "the host's threshold"} (
        {tier.label.toLowerCase()} now).
      </p>

      {hasIntro && (
        <RequestIntroDialog
          open={introOpen}
          onOpenChange={setIntroOpen}
          listingId={listingId}
          listingTitle={listingTitle}
          hostName={hostName}
          mutualConnections={mutualConnections}
        />
      )}
    </div>
  );
}
