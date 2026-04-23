// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable alongside
// Dev1 and Dev3. All files in src/app/dev/, src/components/dev/,
// src/lib/dev-theme/ delete together.
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  AlertTriangle,
  Heart,
  Lock,
  Mail,
  Plus,
  WifiOff,
} from "lucide-react";

export function PatternShowcase() {
  const [open, setOpen] = useState(false);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Patterns</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Composed using the same primitives as the rest of the app —
          empty states, modals, inline validation, skeleton loaders.
        </p>
      </div>

      <PatternCard title="Empty state · network" routes={["/dashboard/network"]}>
        <div className="rounded-2xl border-2 border-dashed bg-muted/30 p-10 text-center">
          <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">No connections yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Vouch for a friend or invite someone to start your network.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button>
              <Plus className="mr-1 h-4 w-4" /> Vouch for a friend
            </Button>
            <Button variant="outline">Send invite</Button>
          </div>
        </div>
      </PatternCard>

      <PatternCard title="Empty state · inbox" routes={["/inbox"]}>
        <div className="rounded-2xl border-2 border-dashed bg-muted/30 p-10 text-center">
          <Mail className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">No messages</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse a listing and message the host to start a thread.
          </p>
          <Button className="mt-4">Browse stays</Button>
        </div>
      </PatternCard>

      <PatternCard
        title="Confirmation toast"
        routes={["(global)"]}
      >
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => toast.success("Vouch saved.")}>
            Trigger success toast
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.error("Couldn't reach the server.")}
          >
            Trigger error toast
          </Button>
        </div>
      </PatternCard>

      <PatternCard
        title="Modal pattern"
        routes={["/profile/[id]", "/listings/[id]"]}
      >
        <Button onClick={() => setOpen(true)}>Open vouch dialog</Button>
        {open && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="vouch-dialog-title"
              aria-describedby="vouch-dialog-desc"
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="vouch-dialog-title" className="text-lg font-semibold">
                Vouch for Sarah
              </h3>
              <p
                id="vouch-dialog-desc"
                className="mt-1 text-sm text-muted-foreground"
              >
                Standard or inner circle? You can change this later.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Button variant="outline" className="justify-start">
                  Standard vouch · 15 base points
                </Button>
                <Button variant="outline" className="justify-start">
                  Inner circle · 25 base points
                </Button>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setOpen(false)}>Continue</Button>
              </div>
            </div>
          </div>
        )}
      </PatternCard>

      <PatternCard title="Inline validation" routes={["forms across app"]}>
        <div className="space-y-1">
          <label className="text-sm font-medium">Email</label>
          <input
            aria-invalid
            defaultValue="not-an-email"
            className="h-14 w-full rounded-xl border-2 border-danger !bg-white px-4 font-medium shadow-sm"
          />
          <p className="text-xs text-danger">
            Enter a valid email address (e.g. you@example.com).
          </p>
        </div>
      </PatternCard>

      <PatternCard title="Skeleton · listing grid" routes={["/browse", "/wishlists/[id]"]}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <div className="space-y-2">
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </PatternCard>

      <PatternCard title="Skeleton · profile card" routes={["/profile/[id]"]}>
        <div className="flex items-start gap-4 rounded-xl border bg-white p-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        </div>
      </PatternCard>

      <PatternCard title="Skeleton · thread row" routes={["/inbox"]}>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border bg-white p-3"
            >
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </PatternCard>

      <PatternCard title="Error · network" routes={["(global)"]}>
        <div className="flex items-start gap-3 rounded-xl border-2 border-danger/30 bg-danger/5 p-4">
          <div className="mt-0.5 rounded-full bg-danger/10 p-2 text-danger">
            <WifiOff className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-danger">
              Couldn&apos;t reach the server
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Check your connection and retry. Your changes weren&apos;t saved.
            </p>
          </div>
          <Button size="sm" variant="outline">
            Retry
          </Button>
        </div>
      </PatternCard>

      <PatternCard title="Error · validation (inline)" routes={["forms"]}>
        <div className="space-y-2 rounded-xl border-2 border-danger/30 bg-danger/5 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <div>
              <p className="text-sm font-semibold text-danger">
                Fix the following before continuing
              </p>
              <ul className="mt-1 list-disc pl-5 text-xs text-danger">
                <li>Phone must include country code (e.g. +14155551234)</li>
                <li>Years known is required</li>
              </ul>
            </div>
          </div>
        </div>
      </PatternCard>

      <PatternCard title="Error · permission / gated" routes={["/listings/[id]"]}>
        <div className="rounded-2xl border-2 border-dashed border-border bg-muted/30 p-8 text-center">
          <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">This listing is gated</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You need at least 2° trust with the host to see full details.
            Request an introduction to get closer.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button>Request intro</Button>
            <Button variant="outline">Browse other stays</Button>
          </div>
        </div>
      </PatternCard>

      <PatternCard title="Empty · no wishlists" routes={["/wishlists"]}>
        <div className="rounded-2xl border-2 border-dashed bg-muted/30 p-10 text-center">
          <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">Nothing saved yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap the heart on any stay to save it for later.
          </p>
          <Button className="mt-4">Browse stays</Button>
        </div>
      </PatternCard>

      <PatternCard title="Empty · 0° onboarding" routes={["(first-signin)"]}>
        <div className="rounded-2xl border-2 border-brand/30 bg-brand-50/50 p-8 text-center">
          <div className="mx-auto inline-flex rounded-full bg-brand text-brand-foreground">
            <Plus className="h-8 w-8 p-2" />
          </div>
          <p className="mt-3 text-lg font-semibold">
            You&apos;re the first in your network
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            1° B&amp;B works by personal trust. Start by inviting two people who
            know you well — they&apos;ll vouch for you and your network opens up.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button>Send invites</Button>
            <Button variant="outline">Learn how it works</Button>
          </div>
        </div>
      </PatternCard>
    </section>
  );
}

function PatternCard({
  title,
  routes,
  children,
}: {
  title: string;
  routes: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-card">
      <div className="mb-3 flex items-baseline justify-between border-b pb-2">
        <h3 className="text-base font-semibold">{title}</h3>
        <span className="text-[11px] text-muted-foreground">
          used by {routes.join(", ")}
        </span>
      </div>
      {children}
    </div>
  );
}
