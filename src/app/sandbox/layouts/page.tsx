// D3 LAYOUT SANDBOX — INDEX
// ----------------------------------------------------------------
// Two groups:
//   Current — iframes the live route so you see exactly what
//             production shows today, no interpretation.
//   Variants — real React implementations of alternative designs.
//             Variants always live as sibling routes; they never
//             overwrite the Current entry.
// Use the fixed top nav for quick jumping. Once you pick a variant
// to iterate on, we add another sibling route (e.g. home-v4) — it
// joins the nav automatically.
// ----------------------------------------------------------------

import Link from "next/link";

export const runtime = "edge";

type Surface = {
  href: string;
  name: string;
  blurb: string;
  liveLink?: string;
};

const CURRENT: Surface[] = [
  {
    href: "/sandbox/layouts/landing",
    name: "Landing",
    blurb:
      "There's no live landing today (/ redirects to /browse). Frames /join — the closest current public-facing surface.",
    liveLink: "/join",
  },
  {
    href: "/sandbox/layouts/browse",
    name: "Browse",
    blurb:
      "Listing discovery feed with search + filters, trust gating, save-for-later.",
    liveLink: "/browse",
  },
  {
    href: "/sandbox/layouts/listing",
    name: "Listing detail",
    blurb:
      "Single listing page — photos, host, trust path, amenities, price, availability.",
    liveLink: "/listings/[id]",
  },
  {
    href: "/sandbox/layouts/dashboard",
    name: "Dashboard",
    blurb:
      "Welcome banner, stats, hosting reservations, listings, earnings, traveling, network, proposals (tabbed).",
    liveLink: "/dashboard",
  },
  {
    href: "/sandbox/layouts/network",
    name: "Network",
    blurb:
      "Vouch power, vouches given/received, pending invites, vouch-back prompts.",
    liveLink: "/dashboard?tab=network",
  },
  {
    href: "/sandbox/layouts/trips",
    name: "Trips",
    blurb:
      "Tabbed list of upcoming, completed, cancelled stays as guest.",
    liveLink: "/dashboard?tab=traveling",
  },
  {
    href: "/sandbox/layouts/proposals",
    name: "Proposals",
    blurb:
      "Trip Wishes + Host Offers feed scoped to your network, with kind-filter tabs and search.",
    liveLink: "/proposals",
  },
  {
    href: "/sandbox/layouts/messages",
    name: "Messages",
    blurb:
      "Inbox split-view — thread list left, conversation right. Includes intro requests.",
    liveLink: "/inbox",
  },
  {
    href: "/sandbox/layouts/vouch",
    name: "Vouch",
    blurb:
      "Search-by-name flow that lets a member vouch for someone they trust.",
    liveLink: "/vouch",
  },
  {
    href: "/sandbox/layouts/profile",
    name: "Profile",
    blurb:
      "Member profile — trust score, bio, listings, proposals, reviews.",
    liveLink: "/profile/[id]",
  },
];

const VARIANTS: Surface[] = [
  {
    href: "/sandbox/layouts/home-v1",
    name: "Home v1 — Showcase rows",
    blurb:
      "Auto-scrolling horizontal rows that alternate direction: Trip Wishes →, Stays ←, Host Offers →, People to vouch for ←. Tabbed multi-mode search at top (Stays · People · Vouches). Vouch activity strip at the bottom.",
  },
  {
    href: "/sandbox/layouts/home-v2",
    name: "Home v2 — Magazine",
    blurb:
      "Three quick-action search cards (Stay · People · Vouch), a hero 'of the moment' feature card, then asymmetric editorial body — Trip Wishes feed left, vouch nudges + featured stays + host offers spotlight in the side rail.",
  },
  {
    href: "/sandbox/layouts/home-v3",
    name: "Home v3 — Personal feed",
    blurb:
      "Single chronological mixed-activity feed (vouches, proposals, listings interspersed). Smart single search with mode pills below. Side rail with vouch nudges, network-at-a-glance, and your listings shortcut.",
  },
  {
    href: "/sandbox/layouts/browse-with-offers",
    name: "Browse + Host Offers",
    blurb:
      "Same browse layout, but with a 'Host Offers in this location' horizontal row inserted at the top of results. Surfaces the proposal feature inline with the discovery flow.",
  },
];

export default function SandboxLayoutsIndex() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 py-10 lg:px-10">
      <h1 className="font-serif text-4xl text-foreground md:text-5xl">
        Layout sandbox
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
        Use the fixed top nav to jump between surfaces. <strong className="font-semibold text-foreground">Current</strong>{" "}
        entries iframe the live page; <strong className="font-semibold text-foreground">Variants</strong>{" "}
        are real React implementations of alternative designs. Variants
        always live as sibling routes — Current is never overwritten.
      </p>

      <Section title="Variants" subtitle="Alternative designs we&rsquo;re iterating on right now">
        <SurfaceGrid surfaces={VARIANTS} accent />
      </Section>

      <Section title="Current" subtitle="Each entry frames the EXACT live page on trustead.app">
        <SurfaceGrid surfaces={CURRENT} />
      </Section>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <div className="flex items-baseline gap-3">
        <h2 className="font-serif text-2xl text-foreground md:text-3xl">
          {title}
        </h2>
        <p className="text-xs text-muted-foreground md:text-sm">
          {subtitle}
        </p>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SurfaceGrid({
  surfaces,
  accent,
}: {
  surfaces: Surface[];
  accent?: boolean;
}) {
  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {surfaces.map((s) => (
        <li key={s.href}>
          <Link
            href={s.href}
            className={
              accent
                ? "group block rounded-2xl border border-brand/30 bg-brand/5 p-5 transition-colors hover:border-brand/60 hover:bg-brand/10"
                : "group block rounded-2xl border border-border bg-card/40 p-5 transition-colors hover:border-brand/40 hover:bg-card/60"
            }
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-base font-semibold text-foreground md:text-lg">
                {s.name}
              </h3>
              <span className="text-xs text-muted-foreground transition-colors group-hover:text-foreground">
                open →
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {s.blurb}
            </p>
            {s.liveLink && (
              <p className="mt-2 font-mono text-[11px] text-subtle">
                Live: {s.liveLink}
              </p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
