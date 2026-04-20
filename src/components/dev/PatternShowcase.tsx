// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable alongside
// Dev1 and Dev3. All files in src/app/dev/, src/components/dev/,
// src/lib/dev-theme/ delete together.
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Heart, Mail, Plus } from "lucide-react";

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
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold">Vouch for Sarah</h3>
              <p className="mt-1 text-sm text-muted-foreground">
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

      <PatternCard title="Skeleton loader" routes={["/browse", "/inbox"]}>
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
