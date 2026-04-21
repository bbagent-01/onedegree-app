// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable alongside
// Dev1 and Dev3. All files in src/app/dev/, src/components/dev/,
// src/lib/dev-theme/ delete together.
"use client";

import type { Section as SectionId } from "./Sidebar";
import { TrustTag } from "@/components/trust/trust-tag";
import { ConnectorAvatars } from "@/components/trust/connector-avatars";
import { ConnectorDots } from "@/components/trust/connector-dots";
import { ShieldIcon } from "@/components/trust/shield-icon";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  connectorsFourLong,
  connectorsThreeWithBridge,
  connectorsTwoKnown,
  sampleListing,
  sampleListingGated,
} from "@/lib/dev-theme/fixtures";

interface Props {
  section: SectionId;
}

export function ComponentShowcase({ section }: Props) {
  switch (section) {
    case "components-trust":
      return <TrustSection />;
    case "components-listing":
      return <ListingSection />;
    case "components-forms":
      return <FormsSection />;
    case "components-nav":
      return <NavSection />;
    case "components-inbox":
      return <InboxSection />;
    case "components-trips":
      return <TripsSection />;
    default:
      return null;
  }
}

// ── Generic primitives ────────────────────────────────────────────────

function Group({
  name,
  file,
  routes,
  children,
}: {
  name: string;
  file: string;
  routes?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-xl border bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
        <div>
          <h3 className="text-base font-semibold">{name}</h3>
          <code className="font-mono text-[11px] text-muted-foreground">
            {file}
          </code>
        </div>
        {routes && (
          <span className="text-[11px] text-muted-foreground">
            used by {routes.length} route{routes.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {children}
      {routes && routes.length > 0 && (
        <div className="flex flex-wrap gap-1 border-t pt-2">
          {routes.map((r) => (
            <code
              key={r}
              className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
            >
              {r}
            </code>
          ))}
        </div>
      )}
    </div>
  );
}

function State({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 rounded-lg border bg-surface/40 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="flex min-h-[48px] flex-wrap items-center gap-3">
        {children}
      </div>
    </div>
  );
}

function Section({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {blurb && (
          <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
        )}
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

// ── Trust ────────────────────────────────────────────────────────────

function TrustSection() {
  return (
    <Section
      title="Trust components"
      blurb="Trust signals — degree pills, connector avatars, shields. Live imports from src/components/trust."
    >
      <Group
        name="TrustTag"
        file="src/components/trust/trust-tag.tsx"
        routes={[
          "/listings/[id]",
          "/browse",
          "/inbox",
          "/dashboard/network",
        ]}
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <State label="micro · 1°">
            <TrustTag size="micro" degree={1} hostRating={4.92} hostReviewCount={47} />
          </State>
          <State label="medium · 1°">
            <TrustTag size="medium" degree={1} hostRating={4.92} hostReviewCount={47} />
          </State>
          <State label="micro · 2° (score + dots)">
            <TrustTag
              size="micro"
              degree={2}
              score={68}
              connectorPaths={connectorsTwoKnown}
              hostRating={4.8}
              hostReviewCount={31}
            />
          </State>
          <State label="medium · 2°">
            <TrustTag
              size="medium"
              degree={2}
              score={68}
              connectorPaths={connectorsTwoKnown}
              hostRating={4.8}
              hostReviewCount={31}
            />
          </State>
          <State label="micro · 3° (mustard, dampened)">
            <TrustTag
              size="micro"
              degree={3}
              score={42}
              connectorPaths={connectorsThreeWithBridge}
              hostRating={4.5}
              hostReviewCount={12}
            />
          </State>
          <State label="medium · 3° + subtext">
            <TrustTag
              size="medium"
              degree={3}
              score={42}
              connectorPaths={connectorsThreeWithBridge}
              hostRating={4.5}
              hostReviewCount={12}
              showSubtext
            />
          </State>
          <State label="micro · 4° (zinc)">
            <TrustTag
              size="micro"
              degree={4}
              score={28}
              connectorPaths={connectorsFourLong}
            />
          </State>
          <State label="medium · 4° + subtext">
            <TrustTag
              size="medium"
              degree={4}
              score={28}
              connectorPaths={connectorsFourLong}
              showSubtext
            />
          </State>
          <State label="micro · 0° (no connection)">
            <TrustTag size="micro" degree={null} hostRating={4.7} hostReviewCount={9} />
          </State>
          <State label="medium · 0° + subtext">
            <TrustTag size="medium" degree={null} showSubtext />
          </State>
          <State label="loading skeleton">
            <Skeleton className="h-5 w-24 rounded-full" />
          </State>
        </div>
      </Group>

      <Group
        name="ConnectorAvatars"
        file="src/components/trust/connector-avatars.tsx"
        routes={["/listings/[id]"]}
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <State label="1 known connector">
            <ConnectorAvatars
              connectors={connectorsTwoKnown.slice(0, 1)}
              size="h-7 w-7"
            />
          </State>
          <State label="2 known connectors">
            <ConnectorAvatars connectors={connectorsTwoKnown} size="h-7 w-7" />
          </State>
          <State label="bridge + anonymous hop">
            <ConnectorAvatars
              connectors={connectorsThreeWithBridge}
              size="h-7 w-7"
            />
          </State>
          <State label="overflow (5 + 2 hidden)">
            <ConnectorAvatars
              connectors={[
                ...connectorsTwoKnown,
                ...connectorsTwoKnown.map((c, i) => ({ ...c, id: `o-${i}` })),
                ...connectorsTwoKnown.map((c, i) => ({ ...c, id: `o2-${i}` })),
              ]}
              size="h-7 w-7"
            />
          </State>
        </div>
      </Group>

      <Group
        name="ConnectorDots"
        file="src/components/trust/connector-dots.tsx"
        routes={["/listings/[id]"]}
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {[1, 2, 3, 5].map((n) => (
            <State key={n} label={`${n} dot${n === 1 ? "" : "s"}`}>
              <ConnectorDots
                strengths={Array.from({ length: n }).map(() => 60)}
                size="h-3 w-3"
              />
            </State>
          ))}
          <State label="mustard tone (3°)">
            <ConnectorDots
              strengths={[60, 50]}
              size="h-3 w-3"
              tone="mustard"
            />
          </State>
        </div>
      </Group>

      <Group
        name="ShieldIcon"
        file="src/components/trust/shield-icon.tsx"
        routes={["/listings/[id]", "/browse"]}
      >
        <div className="grid grid-cols-3 gap-3">
          <State label="emerald (2°)">
            <ShieldIcon score={70} size="h-5 w-5" />
          </State>
          <State label="mustard (3°)">
            <ShieldIcon tone="mustard" size="h-5 w-5" />
          </State>
          <State label="muted (4°)">
            <ShieldIcon muted size="h-5 w-5" />
          </State>
        </div>
      </Group>
    </Section>
  );
}

// ── Listing ──────────────────────────────────────────────────────────

function ListingSection() {
  return (
    <Section
      title="Listing components"
      blurb="Browse tile, gated states, host card. Renders from sample fixtures in src/lib/dev-theme/fixtures.ts."
    >
      <Group
        name="ListingCard"
        file="src/components/listing-card.tsx"
        routes={["/browse", "/wishlists/[id]"]}
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Full access · trusted
            </p>
            <ListingCard {...sampleListing} />
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Gated preview · 0° network
            </p>
            <ListingCard {...sampleListingGated} />
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Favorited
            </p>
            <ListingCard {...sampleListing} isFavorited />
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Loading skeleton
            </p>
            <div className="space-y-2">
              <Skeleton className="aspect-[4/3] w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        </div>
      </Group>
    </Section>
  );
}

// ── Forms & inputs ───────────────────────────────────────────────────

function FormsSection() {
  return (
    <Section
      title="Forms & inputs"
      blurb="Per the form-field rule (h-14, rounded-xl, border-2, !bg-white, px-4, shadow-sm, font-medium) — the styling shown matches the listing-creation form."
    >
      <Group name="Text input" file="src/components/ui/input.tsx">
        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
          <State label="default">
            <div className="w-full">
              <Label className="mb-1 block">Trip name</Label>
              <Input
                placeholder="e.g. Family beach week"
                className="h-14 rounded-xl border-2 !bg-white px-4 shadow-sm font-medium"
              />
            </div>
          </State>
          <State label="filled">
            <div className="w-full">
              <Label className="mb-1 block">Email</Label>
              <Input
                value="loren@example.com"
                onChange={() => {}}
                className="h-14 rounded-xl border-2 !bg-white px-4 shadow-sm font-medium"
              />
            </div>
          </State>
          <State label="error">
            <div className="w-full">
              <Label className="mb-1 block">Phone (E.164)</Label>
              <Input
                aria-invalid
                value="555"
                onChange={() => {}}
                className="h-14 rounded-xl border-2 border-danger !bg-white px-4 shadow-sm font-medium"
              />
              <p className="mt-1 text-xs text-danger">
                Phone must include country code, e.g. +14155551234
              </p>
            </div>
          </State>
          <State label="disabled">
            <div className="w-full">
              <Label className="mb-1 block">Username</Label>
              <Input
                disabled
                value="loren"
                className="h-14 rounded-xl border-2 !bg-white px-4 shadow-sm font-medium"
              />
            </div>
          </State>
        </div>
      </Group>

      <Group name="Textarea" file="src/components/ui/textarea.tsx">
        <div className="w-full">
          <Label className="mb-1 block">Message to host</Label>
          <Textarea
            rows={4}
            placeholder="Hi! We're a family of four hoping to visit June 8–14…"
            className="rounded-xl border-2 !bg-white px-4 py-3 shadow-sm font-medium"
          />
        </div>
      </Group>

      <Group name="Buttons" file="src/components/ui/button.tsx">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <State label="default"><Button>Save</Button></State>
          <State label="outline"><Button variant="outline">Cancel</Button></State>
          <State label="secondary"><Button variant="secondary">Skip</Button></State>
          <State label="ghost"><Button variant="ghost">Maybe later</Button></State>
          <State label="destructive"><Button variant="destructive">Delete</Button></State>
          <State label="link"><Button variant="link">Learn more</Button></State>
          <State label="size sm"><Button size="sm">Small</Button></State>
          <State label="size lg"><Button size="lg">Large</Button></State>
          <State label="loading"><Button disabled>Loading…</Button></State>
        </div>
      </Group>

      <Group name="Badges" file="src/components/ui/badge.tsx">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </Group>
    </Section>
  );
}

// ── Nav / header / footer ────────────────────────────────────────────

function NavSection() {
  return (
    <Section
      title="Nav, header, footer"
      blurb="Live components are server-coupled (Clerk, route data). The previews below show the structural styling without the data dependencies."
    >
      <Group
        name="Header (signed-in skeleton)"
        file="src/components/layout/desktop-nav.tsx"
        routes={["(global)"]}
      >
        <div className="w-full rounded-xl border bg-white p-4">
          <div className="flex items-center gap-6">
            <div className="text-lg font-semibold text-brand">1° BNB</div>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="cursor-pointer hover:text-foreground">Browse</span>
              <span className="cursor-pointer hover:text-foreground">Inbox</span>
              <span className="cursor-pointer hover:text-foreground">Trips</span>
              <span className="cursor-pointer hover:text-foreground">Hosting</span>
            </nav>
            <div className="ml-auto flex items-center gap-3">
              <Button variant="outline" size="sm">Vouch</Button>
              <div className="h-8 w-8 rounded-full bg-muted" />
            </div>
          </div>
        </div>
      </Group>

      <Group
        name="Mobile bottom nav"
        file="src/components/layout/mobile-nav.tsx"
        routes={["(global)"]}
      >
        <div className="mx-auto w-[375px] rounded-xl border bg-white p-3">
          <div className="flex items-center justify-around text-xs text-muted-foreground">
            {["Browse", "Inbox", "Trips", "Profile"].map((l, i) => (
              <span key={l} className={i === 0 ? "text-brand font-medium" : ""}>
                {l}
              </span>
            ))}
          </div>
        </div>
      </Group>

      <Group
        name="Impersonation bar (admin)"
        file="src/components/admin/ImpersonationBar.tsx"
        routes={["(global, gated)"]}
      >
        <div className="rounded-md bg-purple-600 px-4 py-1 text-xs font-medium text-white shadow-md">
          Impersonating <strong>Sarah M.</strong> (signed in as Loren) ·{" "}
          <span className="underline">← Return to real user</span>
        </div>
      </Group>
    </Section>
  );
}

// ── Inbox & messaging ────────────────────────────────────────────────

function InboxSection() {
  return (
    <Section
      title="Inbox & messaging"
      blurb="Thread row, intro request variant, empty inbox."
    >
      <Group
        name="Thread row"
        file="src/components/inbox/inbox-list.tsx"
        routes={["/inbox", "/inbox/[threadId]"]}
      >
        <div className="space-y-2">
          <ThreadRow title="Sarah Mendel" preview="Sounds good — let me check…" unread />
          <ThreadRow title="Mike Tran" preview="Thanks for the intro!" />
          <ThreadRow
            title="Intro request · Cabin in Tahoe"
            preview="Loren wants an introduction to host…"
            badge="Intro"
          />
        </div>
      </Group>

      <Group name="Empty inbox" file="src/components/inbox/inbox-list.tsx">
        <div className="rounded-xl border-2 border-dashed bg-muted/30 p-8 text-center">
          <p className="font-semibold">No conversations yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse a listing and message a host to start your first thread.
          </p>
          <Button className="mt-4">Browse stays</Button>
        </div>
      </Group>
    </Section>
  );
}

function ThreadRow({
  title,
  preview,
  unread,
  badge,
}: {
  title: string;
  preview: string;
  unread?: boolean;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white p-3 shadow-card">
      <div className="h-10 w-10 shrink-0 rounded-full bg-muted" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-semibold">{title}</p>
          {badge && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand">
              {badge}
            </span>
          )}
        </div>
        <p
          className={`truncate text-sm ${
            unread ? "font-semibold text-foreground" : "text-muted-foreground"
          }`}
        >
          {preview}
        </p>
      </div>
      {unread && <span className="h-2 w-2 rounded-full bg-brand" />}
    </div>
  );
}

// ── Trips & reviews ──────────────────────────────────────────────────

function TripsSection() {
  return (
    <Section
      title="Trips & reviews"
      blurb="Reservation card variants, payment-arrangement card, review form sketch."
    >
      <Group
        name="Reservation card"
        file="src/components/trips/trips-list.tsx"
        routes={["/trips"]}
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {([
            ["Pending", "amber", "Confirm with host on Venmo"],
            ["Accepted", "emerald", "Trip Jun 12–18 · Confirmed"],
            ["Declined", "zinc", "Host wasn't available — try other dates"],
            ["Completed", "brand", "Leave a review for Sarah"],
          ] as const).map(([label, tone, sub]) => (
            <div key={label} className="rounded-xl border bg-white p-4 shadow-card">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Stinson Beach cabin</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    tone === "amber"
                      ? "bg-amber-100 text-amber-800"
                      : tone === "emerald"
                      ? "bg-emerald-100 text-emerald-800"
                      : tone === "zinc"
                      ? "bg-zinc-200 text-zinc-700"
                      : "bg-brand-50 text-brand"
                  }`}
                >
                  {label}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
            </div>
          ))}
        </div>
      </Group>

      <Group
        name="Review form (host-to-guest)"
        file="src/components/trips/review-modal.tsx"
        routes={["/trips/[bookingId]"]}
      >
        <div className="space-y-3 rounded-xl border bg-white p-4">
          <p className="font-semibold">Rate Sarah as a guest</p>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={`text-2xl ${n <= 4 ? "text-amber-400" : "text-zinc-300"}`}
              >
                ★
              </span>
            ))}
          </div>
          <Textarea
            placeholder="What was Sarah like as a guest?"
            rows={3}
            className="rounded-xl border-2 !bg-white px-4 py-3 shadow-sm font-medium"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost">Skip</Button>
            <Button>Submit review</Button>
          </div>
        </div>
      </Group>
    </Section>
  );
}
