"use client";

import Link from "next/link";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";

/**
 * Recipient-side card on /join/[token]. Redesign brief:
 *   1. Large serif headline "You've been vouched for"
 *   2. Small "by" eyebrow
 *   3. Medium profile badge (avatar + name + location)
 *   4. Trustead logo card with the platform tagline
 *   5. Primary "Create account" + secondary "Sign in" CTAs
 *
 * Deliberately removed: the "Pre-vouch attached" detail card. We don't
 * surface the vouch type ("Vouch+" vs "Vouch") or years-known bucket
 * to the recipient — that's voucher-side metadata and overcomplicates
 * the invite UX. The vouch still lands automatically on signup.
 *
 * Mode-aware copy:
 *   - phone / open_individual → "You've been vouched for"
 *   - open_group → "You've been invited" (the recipient is one of N
 *     in a group blast; "vouched" is too presumptuous)
 */

interface Props {
  token: string;
  inviter: {
    id: string;
    name: string;
    avatar_url: string | null;
    location: string | null;
  };
  inviteeName: string | null;
  vouchType: string;
  yearsKnownBucket: string;
  mode?: "phone" | "open_individual" | "open_group";
  claimCount?: number;
  maxClaims?: number;
  groupLabel?: string | null;
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export function InviteAcceptCard({
  token,
  inviter,
  mode = "phone",
  claimCount,
  maxClaims,
  groupLabel,
}: Props) {
  const completePath = `/join/${token}/complete`;
  const signUpHref = `/sign-up?redirect_url=${encodeURIComponent(completePath)}`;
  const signInHref = `/sign-in?redirect_url=${encodeURIComponent(completePath)}`;

  const isGroup = mode === "open_group";
  const headline = isGroup ? "You've been invited" : "You've been vouched for";
  const eyebrow = isGroup ? "to a group on" : "by";
  const groupCountLine =
    isGroup && typeof claimCount === "number" && typeof maxClaims === "number"
      ? `${claimCount}/${maxClaims} people have signed up via this link so far.`
      : null;

  return (
    <div className="mx-auto mt-8 w-full max-w-[560px] px-4 md:mt-16 md:px-0">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-10">
        {/* 1. Large serif headline */}
        <h1 className="font-serif text-4xl leading-tight tracking-tight text-foreground md:text-5xl">
          {headline}
        </h1>

        {/* 2. Small "by" eyebrow */}
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {eyebrow}
        </p>

        {/* 3. Medium profile badge — avatar + name + location */}
        <div className="mt-3 flex items-center gap-4">
          <Avatar className="h-14 w-14">
            {inviter.avatar_url ? (
              <AvatarImage src={inviter.avatar_url} alt={inviter.name} />
            ) : null}
            <AvatarFallback className="text-base">
              {initials(inviter.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold text-foreground">
              {isGroup
                ? groupLabel
                  ? `${inviter.name} · ${groupLabel}`
                  : inviter.name
                : inviter.name}
            </div>
            {inviter.location ? (
              <div className="truncate text-sm text-foreground/70">
                {inviter.location}
              </div>
            ) : null}
          </div>
        </div>

        {groupCountLine ? (
          <p className="mt-3 text-xs text-foreground/70">{groupCountLine}</p>
        ) : null}

        {/* 4. Trustead logo + tagline card */}
        <div className="mt-8 rounded-xl border border-border bg-muted/30 p-5">
          <Image
            src="/trustead-wordmark.svg"
            alt="Trustead"
            width={140}
            height={32}
            className="h-6 w-auto"
            priority
          />
          <p className="mt-3 text-sm leading-relaxed text-foreground/80">
            Trustead is a trust-based short-term rental platform. Listings are
            private and only visible through personal networks and vouches.
          </p>
        </div>

        {/* 5. CTAs */}
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href={signUpHref}
            className={buttonVariants({
              size: "lg",
              className:
                "h-12 bg-foreground text-background text-base hover:bg-foreground/90",
            })}
          >
            Create account
          </Link>
          <Link
            href={signInHref}
            className="text-center text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
