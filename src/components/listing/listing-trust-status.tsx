"use client";

import { useState } from "react";
import { CheckCircle2, Lock, MessageCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequestIntroDialog } from "@/components/trust/request-intro-dialog";
import { trustTier, type TrustPathUser } from "@/lib/trust-data";
import { cn } from "@/lib/utils";
import Link from "next/link";

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
}

/**
 * Compact trust status shown under the booking sidebar on the full
 * listing detail page. Mirrors the TrustGate states (trusted / limited
 * / blocked) with inline CTAs so the viewer always has a clear next
 * step — even if they can see the listing but can't yet book.
 */
export function ListingTrustStatus({
  listingId,
  listingTitle,
  hostName,
  score,
  canRequestBook,
  canMessage,
  canRequestIntro,
  mutualConnections,
}: Props) {
  const [introOpen, setIntroOpen] = useState(false);
  const tier = trustTier(score);
  const hostFirst = hostName.split(" ")[0];

  if (canRequestBook) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="text-sm">
            <div className="font-semibold text-emerald-900">
              You&apos;re trusted
            </div>
            <p className="mt-0.5 text-emerald-800/80">
              Your 1° vouch score with {hostFirst} is{" "}
              <span className="font-semibold">{score}</span> ({tier.label}). You
              can message them and request to book.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hasIntro = canRequestIntro && mutualConnections.length > 0;

  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        hasIntro || canMessage
          ? "border-amber-200 bg-amber-50"
          : "border-border bg-muted/40"
      )}
    >
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="text-sm">
          <div className="font-semibold text-amber-900">
            {canMessage ? "Booking needs a stronger connection" : "Private listing"}
          </div>
          <p className="mt-0.5 text-amber-800/80">
            Your current score with {hostFirst} is{" "}
            <span className="font-semibold">{score}</span>.{" "}
            {canMessage
              ? "You can still message them — a conversation often gets you the rest of the way."
              : "Grow your trust with this host's network to unlock more actions."}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {hasIntro && (
          <Button
            type="button"
            onClick={() => setIntroOpen(true)}
            className="flex h-10 w-full gap-2 rounded-lg bg-brand font-semibold hover:bg-brand-600"
          >
            <UserPlus className="h-4 w-4" />
            Request introduction
          </Button>
        )}
        {canMessage && (
          <Link
            href={`/listings/${listingId}`}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white text-sm font-semibold text-foreground hover:bg-muted"
          >
            <MessageCircle className="h-4 w-4" />
            Message {hostFirst}
          </Link>
        )}
        {!hasIntro && !canMessage && (
          <Link
            href="/invite"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90"
          >
            Grow your network
          </Link>
        )}
      </div>

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
