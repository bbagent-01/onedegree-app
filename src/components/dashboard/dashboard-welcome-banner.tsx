"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, UserPlus, Shield, Handshake, X } from "lucide-react";

interface Props {
  userId: string;
}

const DISMISS_KEY_PREFIX = "1db.welcomeBannerDismissed.";

/**
 * First-run welcome banner for true 0° users (no vouches in either
 * direction, created within the last 7 days). Dismissible per-user
 * via localStorage. A banner is the ceiling — no full tour.
 */
export function DashboardWelcomeBanner({ userId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setHydrated(true);
    try {
      if (localStorage.getItem(DISMISS_KEY_PREFIX + userId) === "1") {
        setDismissed(true);
      }
    } catch {
      // If localStorage is blocked the banner just stays visible —
      // that's fine for an ephemeral onboarding prompt.
    }
  }, [userId]);

  const onDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY_PREFIX + userId, "1");
    } catch {
      // No-op — dismiss still applies for the current page view.
    }
  };

  if (!hydrated || dismissed) return null;

  return (
    <div className="relative mt-6 overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/5 via-white to-white p-6 md:p-8">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2 text-sm font-semibold text-brand">
        <Sparkles className="h-4 w-4" />
        Welcome to the trust network
      </div>
      <h2 className="mt-2 text-xl font-bold text-foreground md:text-2xl">
        Hosts share their places with people their network trusts.
      </h2>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Step
          icon={UserPlus}
          n={1}
          label="Invite"
          body="Add friends you&rsquo;d vouch for — they join your network."
        />
        <Step
          icon={Shield}
          n={2}
          label="Vouch"
          body="Vouch for people you know so they can see your network&rsquo;s listings."
        />
        <Step
          icon={Handshake}
          n={3}
          label="Stay"
          body="Book trusted stays — hosts see how you&rsquo;re connected to them."
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          onClick={onDismiss}
          className="h-10 rounded-lg bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/90"
        >
          Got it
        </Button>
        <Link
          href="/invite"
          className="text-sm font-semibold text-brand hover:underline"
        >
          Invite a friend now &rarr;
        </Link>
      </div>
    </div>
  );
}

function Step({
  icon: Icon,
  n,
  label,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  n: number;
  label: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Step {n}
        </div>
      </div>
      <div className="mt-2 text-sm font-semibold text-foreground">{label}</div>
      <p
        className="mt-1 text-xs leading-5 text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </div>
  );
}
