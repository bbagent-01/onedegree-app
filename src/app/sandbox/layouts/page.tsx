// D3 LAYOUT SANDBOX — INDEX
// ----------------------------------------------------------------
// Lists 10 page replicas of the current live app surfaces. Pick a
// page to view the current-state layout populated with sample data.
// Variations live as sibling routes (e.g. browse-v2) and join the
// top-nav once added.
// ----------------------------------------------------------------

import Link from "next/link";

export const runtime = "edge";

type Surface = {
  href: string;
  name: string;
  blurb: string;
  liveLink?: string;
};

const SURFACES: Surface[] = [
  {
    href: "/sandbox/layouts/landing",
    name: "Landing",
    blurb:
      "There's no live landing today (/ redirects to /browse). Frames /join — the closest current public-facing surface — as our starting point.",
    liveLink: "/join",
  },
  {
    href: "/sandbox/layouts/browse",
    name: "Browse",
    blurb:
      "Listing discovery feed with search + filter chips, trust gating, save-for-later.",
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
      "Tabbed list of upcoming, completed, cancelled stays as guest. Connect with hosts, leave reviews.",
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
      "Search-by-name flow that lets a member vouch for someone they trust. Funnel into invite if they're not on Trustead.",
    liveLink: "/vouch",
  },
  {
    href: "/sandbox/layouts/profile",
    name: "Profile",
    blurb:
      "Member profile — trust score, bio, listings, proposals, reviews. Other-vs-own variants.",
    liveLink: "/profile/[id]",
  },
];

export default function SandboxLayoutsIndex() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 py-10 lg:px-10">
      <h1 className="font-serif text-4xl text-foreground md:text-5xl">
        Layout sandbox
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
        Each entry below frames the EXACT current live page so there&rsquo;s
        no interpretation — what you see is what trustead.app shows today.
        Use the fixed top nav to jump between surfaces.
      </p>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Once you pick a surface to iterate on, name a variation
        (e.g. &ldquo;try compact list density on browse&rdquo;) and I&rsquo;ll
        clone the live components into a sibling route like{" "}
        <code className="font-mono text-xs">browse-v2</code> where I can
        actually make changes — and it auto-joins the nav.
      </p>

      <ul className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2">
        {SURFACES.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="group block rounded-2xl border border-border bg-card/40 p-5 transition-colors hover:border-brand/40 hover:bg-card/60"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {s.name}
                </h2>
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
    </div>
  );
}
