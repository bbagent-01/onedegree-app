"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, Shield, UserPlus, Sparkles } from "lucide-react";

interface Props {
  currentUserId: string;
}

/**
 * 0° new-user empty state for the Network section. Replaces the old
 * generic "Your trust network is empty" dead-end with a short
 * explainer + two concrete actions:
 *   1. Invite a friend (primary — existing invite flow)
 *   2. Request a vouch (secondary — copy a shareable link to your
 *      profile with a ?vouch=1 anchor that auto-opens the vouch
 *      modal for the viewer)
 */
export function NetworkEmptyState({ currentUserId }: Props) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/profile/${currentUserId}?vouch=1`
      : `/profile/${currentUserId}?vouch=1`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail in non-secure contexts — fall back
      // to a prompt so the link is still reachable.
      window.prompt("Copy this link:", shareUrl);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-border bg-white p-6 md:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Sparkles className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-semibold text-foreground md:text-xl">
          You&rsquo;re new here. Let&rsquo;s get you connected.
        </h3>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">
        Vouches are how hosts decide who sees their listings. Ask someone who
        knows you to vouch, or invite friends you&rsquo;d vouch for yourself.
      </p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/invite"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
        >
          <UserPlus className="h-4 w-4" />
          Invite a friend
        </Link>
        <Button
          type="button"
          variant="outline"
          onClick={onCopy}
          className="h-10 gap-1.5 rounded-lg border-border bg-white text-sm font-semibold hover:bg-muted"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-600" />
              Link copied
            </>
          ) : (
            <>
              <Shield className="h-4 w-4" />
              Request a vouch
            </>
          )}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        &ldquo;Request a vouch&rdquo; copies a link you can text to someone who
        knows you. When they open it they&rsquo;ll see a prompt to vouch.
      </p>
    </div>
  );
}
