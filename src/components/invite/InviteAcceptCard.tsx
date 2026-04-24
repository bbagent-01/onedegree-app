"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { yearsKnownLabel } from "@/lib/trust/years-known-labels";

const VOUCH_LABEL: Record<string, string> = {
  standard: "Vouch",
  inner_circle: "Vouch+",
};

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
  inviteeName,
  vouchType,
  yearsKnownBucket,
}: Props) {
  const completePath = `/join/${token}/complete`;
  const signUpHref = `/sign-up?redirect_url=${encodeURIComponent(completePath)}`;
  const signInHref = `/sign-in?redirect_url=${encodeURIComponent(completePath)}`;

  const vouchLabel = VOUCH_LABEL[vouchType] ?? "Vouch";
  // Lowercase first letter so the copy reads naturally in mid-sentence
  // contexts like "vouched for you as having known them less than 1 year".
  const rawYearsLabel = yearsKnownLabel(yearsKnownBucket);
  const yearsLabel = rawYearsLabel
    ? rawYearsLabel.charAt(0).toLowerCase() + rawYearsLabel.slice(1)
    : yearsKnownBucket;

  return (
    <div className="mx-auto mt-16 w-full max-w-[520px] rounded-2xl border border-border bg-white p-8 shadow-sm">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          {inviter.avatar_url ? (
            <AvatarImage src={inviter.avatar_url} alt={inviter.name} />
          ) : null}
          <AvatarFallback>{initials(inviter.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Invitation to Trustead
          </p>
          <h1 className="mt-1 text-xl font-semibold text-foreground">
            <span className="text-foreground">{inviter.name}</span>
            <span className="text-muted-foreground"> invited you</span>
          </h1>
          {inviter.location ? (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {inviter.location}
            </p>
          ) : null}
        </div>
      </div>

      {inviteeName ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Welcome,{" "}
          <span className="font-semibold text-foreground">{inviteeName}</span>.
        </p>
      ) : null}

      <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="text-sm leading-relaxed">
            <p className="font-medium text-foreground">Pre-vouch attached</p>
            <p className="mt-1 text-muted-foreground">
              {inviter.name.split(" ")[0]} has already vouched for you —{" "}
              <span className="font-medium text-foreground">{vouchLabel}</span>,{" "}
              {yearsLabel}. When you sign up, you&apos;ll land with a 1° connection
              to {inviter.name.split(" ")[0]} already active.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        Trustead is a trust-based short-term rental platform. Listings are
        private and only visible through personal networks and vouches.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <Link
          href={signUpHref}
          className={buttonVariants({ size: "lg", className: "h-12 text-base" })}
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
  );
}
