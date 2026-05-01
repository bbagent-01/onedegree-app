// D3 LAYOUT SANDBOX — HOME V4
// ----------------------------------------------------------------
// Iteration on home-v1 with a proposed site-wide shell:
//   - Collapsible LEFT sidebar containing the full app menu
//     (logo + main sections). Collapses to icons-only.
//   - Fixed RIGHT sidebar for activity / notifications / vouch
//     prompts.
//   - Condensed single-row search at top, with Stays / People /
//     Vouches segmented selector inline on the left.
//   - Auto-scrolling marquee rows alternating direction (Trip Wishes
//     →, Stays ←, Host Offers →, People to vouch ←).
//
// Card styles match the live components:
//   - Proposals: horizontal — visual pane left (Trip Wish gets
//     concentric-ring overlay on a colored field; Host Offer gets a
//     listing photo) + info pane right with avatar, kind badge,
//     title, dates/location, CTAs. White card, subtle border.
//   - Listings: vertical — image on top w/ heart top-right, area
//     name + listing title + "Hosted by" + TrustTag below.
//
// The shell + cards here are the proposed design direction; once
// locked, this same shell ports to the rest of the app.
// ----------------------------------------------------------------

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Search,
  ShieldCheck,
  Plane,
  Home as HomeIcon,
  Users,
  MessageCircle,
  Calendar,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  CalendarDays,
  MapPin,
  ArrowRight,
  Heart,
  Bell,
  SlidersHorizontal,
  Plus,
  UserPlus,
  LayoutDashboard,
  Settings,
  HelpCircle,
} from "lucide-react";
import { TrusteadLogo } from "@/components/layout/trustead-logo";

// ── Sidebar nav items ──────────────────────────────────────────
// Three groups separated by thin dividers in the sidebar:
//   1. App  — main browse/social surfaces
//   2. Host — host-side surfaces (dashboard, manage listings)
//   3. Account — settings + help
// Items inside each group are flat for now; submenus (e.g. Proposals
// → "Create proposal", Host Dashboard → "Manage reservations") will
// layer in once we settle on a disclosure pattern.

type NavItem = {
  icon: typeof HomeIcon;
  label: string;
  href: string;
  active?: boolean;
};

const NAV_GROUPS: { id: string; items: NavItem[] }[] = [
  {
    id: "app",
    items: [
      { icon: HomeIcon, label: "Home", href: "/sandbox/layouts/home-v4", active: true },
      { icon: Search, label: "Browse", href: "/sandbox/layouts/browse" },
      { icon: Plane, label: "Proposals", href: "/sandbox/layouts/proposals" },
      { icon: ShieldCheck, label: "Vouch", href: "/sandbox/layouts/vouch" },
      { icon: Users, label: "Network", href: "/sandbox/layouts/network" },
      { icon: MessageCircle, label: "Messages", href: "/sandbox/layouts/messages" },
      { icon: Calendar, label: "Trips", href: "/sandbox/layouts/trips" },
      { icon: User, label: "Profile", href: "/sandbox/layouts/profile" },
    ],
  },
  {
    id: "host",
    items: [
      { icon: LayoutDashboard, label: "Host dashboard", href: "/sandbox/layouts/dashboard" },
    ],
  },
  {
    id: "account",
    items: [
      { icon: Settings, label: "Account settings", href: "/sandbox/layouts/profile" },
      { icon: HelpCircle, label: "Help Center", href: "/sandbox/layouts/profile" },
    ],
  },
];

// ── Sample data ────────────────────────────────────────────────

const USER = { firstName: "Sample" };

type TripWish = {
  id: string;
  author: string;
  avatar: string;
  trust: "1°" | "2°" | "3°";
  destination: string;
  subdest?: string;
  dates: string;
  title: string;
  body: string;
  guests: number;
  photo: string;
};

const TRIP_WISHES: TripWish[] = [
  {
    id: "tw1",
    author: "Erin Q.",
    avatar: "https://picsum.photos/seed/erin-q/120/120",
    trust: "1°",
    destination: "Brooklyn",
    subdest: "Park Slope",
    dates: "Jun 14 → 20",
    guests: 1,
    title: "A quiet 1-bed in Brooklyn for a week of writing",
    body: "Working on a deadline — need somewhere I can settle in. Bonus if there's a desk or kitchen table I can claim. Solo, no pets, no late nights.",
    photo: "https://picsum.photos/seed/brooklyn-bridge/600/600",
  },
  {
    id: "tw2",
    author: "Theo L.",
    avatar: "https://picsum.photos/seed/theo-l/120/120",
    trust: "2°",
    destination: "Coastal Maine",
    dates: "Late September",
    guests: 4,
    title: "Family-of-4 looking for coastal stay, 5–7 nights",
    body: "Two kids, school-age. Easy to travel with. Open to suggestions on location — Maine, Outer Banks, somewhere on the Gulf.",
    photo: "https://picsum.photos/seed/maine-coast/600/600",
  },
  {
    id: "tw3",
    author: "Dev S.",
    avatar: "https://picsum.photos/seed/dev-s/120/120",
    trust: "1°",
    destination: "Mexico City",
    subdest: "Roma Norte",
    dates: "Aug 10 → 24",
    guests: 2,
    title: "Two weeks remote working in CDMX",
    body: "Roma Norte / Condesa preferred. Need wifi that won't quit. Open to a few different places stitched together if anyone has shorter windows.",
    photo: "https://picsum.photos/seed/cdmx-roma/600/600",
  },
  {
    id: "tw4",
    author: "Aliyah J.",
    avatar: "https://picsum.photos/seed/aliyah-j/120/120",
    trust: "2°",
    destination: "Lisbon",
    dates: "Oct 02 → 09",
    guests: 2,
    title: "First time in Lisbon — neighborhoods near the river",
    body: "Want somewhere walkable, with a view of the Tagus if possible. Two of us, easy guests.",
    photo: "https://picsum.photos/seed/lisbon-tile/600/600",
  },
  {
    id: "tw5",
    author: "Cass W.",
    avatar: "https://picsum.photos/seed/cass-w/120/120",
    trust: "2°",
    destination: "Barcelona",
    subdest: "Gracia",
    dates: "Sep 18 → 24",
    guests: 1,
    title: "Solo trip to Barcelona — Gracia preferred",
    body: "Quiet apartment, walking distance to cafes. Just me, mostly working from a laptop in the mornings and exploring afternoons.",
    photo: "https://picsum.photos/seed/barcelona-arch/600/600",
  },
];

type HostOffer = {
  id: string;
  author: string;
  avatar: string;
  trust: "1°" | "2°" | "3°";
  listing: string;
  city: string;
  area: string;
  dates: string;
  price: number;
  photo: string;
  body: string;
};

const HOST_OFFERS: HostOffer[] = [
  { id: "ho1", author: "Maya R.", avatar: "https://picsum.photos/seed/maya-r/120/120", trust: "1°", listing: "Brownstone garden floor", city: "Brooklyn, NY", area: "Park Slope", dates: "Jul 04 → 08", price: 145, photo: "https://picsum.photos/seed/brklyn-1/720/540", body: "Heading upstate for the long weekend. Couple or solo preferred." },
  { id: "ho2", author: "Diego M.", avatar: "https://picsum.photos/seed/diego-m/120/120", trust: "2°", listing: "Roma Norte courtyard apartment", city: "CDMX, MX", area: "Roma Norte", dates: "Sep 02 → 16", price: 95, photo: "https://picsum.photos/seed/cdmx-1/720/540", body: "Two weeks in Oaxaca — looking for a calm guest who'll water the plants." },
  { id: "ho3", author: "Jonas T.", avatar: "https://picsum.photos/seed/jonas-t/120/120", trust: "2°", listing: "South Congress casita", city: "Austin, TX", area: "South Congress", dates: "Aug 18 → 25", price: 130, photo: "https://picsum.photos/seed/austin-2/720/540", body: "Casita free for a week. Perfect for one or two adults." },
  { id: "ho4", author: "Sofía A.", avatar: "https://picsum.photos/seed/sofia-a/120/120", trust: "2°", listing: "Condesa walk-up with terrace", city: "CDMX, MX", area: "Condesa", dates: "Oct 10 → 17", price: 110, photo: "https://picsum.photos/seed/cdmx-2/720/540", body: "Wraparound terrace, jacaranda views. Working desk and fast wifi." },
  { id: "ho5", author: "Aliyah J.", avatar: "https://picsum.photos/seed/aliyah-j/120/120", trust: "1°", listing: "Bed-Stuy loft + private roof", city: "Brooklyn, NY", area: "Bed-Stuy", dates: "Aug 14 → 21", price: 185, photo: "https://picsum.photos/seed/brklyn-2/720/540", body: "Visiting family — looking for someone to look after the cat." },
];

type Listing = {
  id: string;
  area: string;
  title: string;
  price: number;
  host: string;
  hostFirst: string;
  trust: "1°" | "2°" | "3°";
  rating: number;
  reviewCount: number;
  photo: string;
};

const LISTINGS: Listing[] = [
  { id: "l1", area: "Park Slope, Brooklyn", title: "Sunlit brownstone garden floor", price: 145, host: "Maya R.", hostFirst: "Maya", trust: "1°", rating: 4.91, reviewCount: 23, photo: "https://picsum.photos/seed/brklyn-1/600/450" },
  { id: "l2", area: "East Austin", title: "East-side bungalow with backyard", price: 165, host: "Dev S.", hostFirst: "Dev", trust: "1°", rating: 4.85, reviewCount: 18, photo: "https://picsum.photos/seed/austin-1/600/450" },
  { id: "l3", area: "Mission, San Francisco", title: "Mission flat with bay window", price: 220, host: "Priya K.", hostFirst: "Priya", trust: "2°", rating: 4.92, reviewCount: 31, photo: "https://picsum.photos/seed/sf-1/600/450" },
  { id: "l4", area: "Roma Norte, CDMX", title: "Roma Norte courtyard apartment", price: 95, host: "Diego M.", hostFirst: "Diego", trust: "2°", rating: 4.78, reviewCount: 14, photo: "https://picsum.photos/seed/cdmx-1/600/450" },
  { id: "l5", area: "Bed-Stuy, Brooklyn", title: "Bed-Stuy loft with private roof", price: 185, host: "Aliyah J.", hostFirst: "Aliyah", trust: "1°", rating: 4.96, reviewCount: 27, photo: "https://picsum.photos/seed/brklyn-2/600/450" },
  { id: "l6", area: "South Congress, Austin", title: "South Congress casita", price: 130, host: "Jonas T.", hostFirst: "Jonas", trust: "2°", rating: 4.88, reviewCount: 22, photo: "https://picsum.photos/seed/austin-2/600/450" },
  { id: "l7", area: "Condesa, CDMX", title: "Condesa walk-up with terrace", price: 110, host: "Sofía A.", hostFirst: "Sofía", trust: "2°", rating: 4.83, reviewCount: 19, photo: "https://picsum.photos/seed/cdmx-2/600/450" },
  { id: "l8", area: "Greenpoint, Brooklyn", title: "Greenpoint waterfront studio", price: 155, host: "Erin Q.", hostFirst: "Erin", trust: "2°", rating: 4.79, reviewCount: 12, photo: "https://picsum.photos/seed/brklyn-3/600/450" },
];

type Person = {
  name: string;
  avatar: string;
  relation: string;
  degree: "1°" | "2°";
  connectors: { name: string; avatar: string }[];
  mutual: number;
  lastSeen: string;
};

const PEOPLE_TO_VOUCH: Person[] = [
  {
    name: "Erin Quinn",
    avatar: "https://picsum.photos/seed/erin-q/120/120",
    relation: "College roommate",
    degree: "1°",
    connectors: [
      { name: "Maya R.", avatar: "https://picsum.photos/seed/maya-r/40/40" },
      { name: "Dev S.", avatar: "https://picsum.photos/seed/dev-s/40/40" },
    ],
    mutual: 4,
    lastSeen: "Stayed with you in Mar",
  },
  {
    name: "Renata V.",
    avatar: "https://picsum.photos/seed/renata-v/120/120",
    relation: "Friend from book club",
    degree: "2°",
    connectors: [
      { name: "Priya K.", avatar: "https://picsum.photos/seed/priya-k/40/40" },
    ],
    mutual: 2,
    lastSeen: "You stayed with her in Feb",
  },
  {
    name: "Casey W.",
    avatar: "https://picsum.photos/seed/casey-w/120/120",
    relation: "Worked together at Studio",
    degree: "2°",
    connectors: [
      { name: "Erin Q.", avatar: "https://picsum.photos/seed/erin-q/40/40" },
      { name: "Dev S.", avatar: "https://picsum.photos/seed/dev-s/40/40" },
      { name: "Theo L.", avatar: "https://picsum.photos/seed/theo-l/40/40" },
    ],
    mutual: 6,
    lastSeen: "Mutual via Studio days",
  },
  {
    name: "Beatriz F.",
    avatar: "https://picsum.photos/seed/bea-f/120/120",
    relation: "Old neighbor",
    degree: "2°",
    connectors: [
      { name: "Sofía A.", avatar: "https://picsum.photos/seed/sofia-a/40/40" },
    ],
    mutual: 1,
    lastSeen: "Recently joined",
  },
  {
    name: "Jonas T.",
    avatar: "https://picsum.photos/seed/jonas-t/120/120",
    relation: "Climbing partner",
    degree: "1°",
    connectors: [
      { name: "Maya R.", avatar: "https://picsum.photos/seed/maya-r/40/40" },
    ],
    mutual: 3,
    lastSeen: "Hosted you in Mar",
  },
];

// Right-rail content
const NOTIFICATIONS = [
  { who: "Maya R.", body: "vouched for you", ago: "2h", actionable: true },
  { who: "Diego M.", body: "replied to your CDMX proposal", ago: "Yesterday", actionable: false },
  { who: "Priya K.", body: "vouched for you", ago: "1w", actionable: true },
  { who: "Beatriz F.", body: "joined Trustead via Sofía A.", ago: "3d", actionable: false },
];

// ── Page ───────────────────────────────────────────────────────

export default function HomeV4() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <>
      <div className="flex min-h-[calc(100vh-36px)] bg-background">
        <SiteSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-1 gap-0">
            <div className="min-w-0 flex-1 px-6 lg:px-10">
              {/* Greeting + condensed search — centered, viewport-height padding */}
              <header className="flex flex-col items-center pb-[10vh] pt-[12vh] text-center md:pb-[15vh] md:pt-[20vh]">
                <p className="text-sm text-muted-foreground">
                  Welcome back, {USER.firstName}.
                </p>
                <h1
                  className="mt-2 whitespace-nowrap font-serif text-4xl text-foreground md:text-5xl"
                  style={{ maxWidth: "none" }}
                >
                  What are you looking for?
                </h1>
                <CondensedSearch />
              </header>

              {/* Quick-action CTA strip — sits between the hero and the
                  marquees. Three cards (Find people, Create a listing,
                  Post a trip wish) so newcomers have an obvious move. */}
              <CTAStrip />

              {/* Marquee rows: Trip Wishes → People → Host Offers → Stays */}
              <MarqueeSection
                title="Trip Wishes from your network"
                subtitle="Members looking for a place to stay"
                link={{ label: "All proposals", href: "/sandbox/layouts/proposals" }}
                direction="right"
              >
                {TRIP_WISHES.map((t) => (
                  <TripWishCardHorizontal key={t.id} item={t} />
                ))}
              </MarqueeSection>

              <MarqueeSection
                title="People in your network"
                subtitle="Folks you might want to vouch for"
                link={{ label: "Vouch flow", href: "/sandbox/layouts/vouch" }}
                direction="left"
              >
                {PEOPLE_TO_VOUCH.map((p) => (
                  <PersonCard key={p.name} person={p} />
                ))}
              </MarqueeSection>

              <MarqueeSection
                title="Host Offers"
                subtitle="Members opening their homes for specific dates"
                link={{ label: "All offers", href: "/sandbox/layouts/proposals" }}
                direction="right"
              >
                {HOST_OFFERS.map((h) => (
                  <HostOfferCardHorizontal key={h.id} item={h} />
                ))}
              </MarqueeSection>

              <MarqueeSection
                title="Stays from people you know"
                subtitle="Listings hosted by 1° and 2° connections"
                link={{ label: "Browse all", href: "/sandbox/layouts/browse" }}
                direction="left"
              >
                {LISTINGS.map((l) => (
                  <ListingCardVertical key={l.id} item={l} />
                ))}
              </MarqueeSection>

              {/* Generous bottom spacing so a long scroll doesn't end
                  abruptly. */}
              <div className="h-[20vh]" aria-hidden />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

// ── Site sidebar ───────────────────────────────────────────────

function SiteSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const w = collapsed ? "w-[64px]" : "w-[240px]";
  const unread = NOTIFICATIONS.filter((n) => n.actionable).length;
  return (
    <aside
      className={`sticky top-9 flex h-[calc(100vh-36px)] shrink-0 flex-col border-r border-border bg-card/30 transition-[width] duration-200 ${w}`}
      aria-label="Site navigation"
    >
      {/* Logo — full Trustead wordmark expanded, shield mark only when
          collapsed. Both variants render via the inline SVG so they
          inherit currentColor (cream on the dark sidebar) — no green
          favicon plate behind the collapsed mark. */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
        <Link
          href="/sandbox/layouts/home-v4"
          className="flex min-w-0 items-center text-foreground"
          aria-label="Trustead"
        >
          {collapsed ? (
            <TrusteadLogo mark className="h-8 w-8 text-foreground" />
          ) : (
            <TrusteadLogo className="h-6 w-auto text-foreground" />
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="ml-2 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-card/60 hover:text-foreground"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav — grouped (App | Host | Account). Group separators are
          full-width siblings (no horizontal padding) so they reach
          edge-to-edge of the sidebar column, matching the structural
          lines elsewhere (border-border, not /60). */}
      <nav className="shrink-0 py-3">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.id}>
            {gi > 0 && (
              <div className="my-3 border-t border-border" aria-hidden />
            )}
            <ul className="space-y-0.5 px-2">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className={
                        item.active
                          ? `flex items-center gap-3 rounded-lg bg-foreground px-3 py-2 text-sm font-semibold text-background ${collapsed ? "justify-center px-2" : ""}`
                          : `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-card/60 hover:text-foreground ${collapsed ? "justify-center px-2" : ""}`
                      }
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Notifications — inline below nav. Fills remaining vertical
          space and scrolls. When the sidebar is collapsed, surfaces
          as a single bell button with unread count. */}
      {collapsed ? (
        <div className="mt-2 flex flex-col items-center gap-2 px-2">
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-card/60 hover:text-foreground"
            aria-label={`Notifications (${unread} unread)`}
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 inline-flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-warning px-1 text-[9px] font-bold text-black">
                {unread}
              </span>
            )}
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col border-t border-border">
          <div className="flex shrink-0 items-center justify-between px-4 py-2">
            <div className="flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Notifications
              </h3>
              {unread > 0 && (
                <span className="rounded-full bg-warning px-1.5 py-0 text-[9px] font-bold text-black">
                  {unread}
                </span>
              )}
            </div>
          </div>
          <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
            {NOTIFICATIONS.map((n, i) => (
              <li
                key={i}
                className="rounded-lg border border-border bg-background/40 p-2.5"
              >
                <p className="text-[11px] leading-snug text-foreground">
                  <span className="font-semibold">{n.who}</span> {n.body}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-subtle">{n.ago}</span>
                  {n.actionable && (
                    <button className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90">
                      Vouch back
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Collapse toggle when collapsed */}
      {collapsed && (
        <button
          onClick={onToggle}
          aria-label="Expand sidebar"
          className="m-2 mt-auto inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-card/60 hover:text-foreground"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}
    </aside>
  );
}

// ── Condensed search ───────────────────────────────────────────

function CondensedSearch() {
  // Outer rail height + inner-pill geometry are bound together: the
  // 68px container has 8px of inset padding (p-2), so the inner active
  // pill is 52px tall (= 68 − 8·2). That makes the gap from pill→top
  // of container equal to the gap from pill→left of container —
  // visually balanced, the way the search-circle sits inside the
  // search bar on the right.
  return (
    <div className="mx-auto mt-8 flex w-full max-w-[1280px] flex-wrap items-center gap-3">
      {/* Travel / Host segmented pill — same dark-on-forest treatment
          as the search bar so the row reads as one continuous control
          surface. Active = mint pill (brand). Inactive = cream text on
          transparent, with a soft hover tint so "Host" is always
          legible against the dark page bg. */}
      <div className="flex h-[68px] shrink-0 items-center gap-1 rounded-full border border-border bg-card/40 p-2">
        <button
          type="button"
          className="inline-flex h-[52px] items-center rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground"
        >
          Travel
        </button>
        <button
          type="button"
          className="inline-flex h-[52px] items-center rounded-full px-5 text-sm font-medium text-foreground/80 hover:bg-card/60 hover:text-foreground"
        >
          Host
        </button>
      </div>

      {/* Search pill — dark transparent bg + faint cream border so it
          sits on the forest field the same way the Filters button does.
          Internal dividers use bg-border (the same faint cream/green
          line used everywhere else in the design) instead of the
          previous bright zinc-200. */}
      <div className="flex h-[68px] min-w-0 flex-1 items-stretch rounded-full border border-border bg-card/40">
        {/* Where — fills available width */}
        <div className="flex min-w-0 flex-1 flex-col justify-center pl-6 pr-4 text-left">
          <p className="text-[11px] font-bold leading-tight text-foreground">
            Where
          </p>
          <p className="truncate text-sm leading-tight text-muted-foreground">
            Search destinations
          </p>
        </div>

        <span className="w-px self-stretch bg-border" aria-hidden />

        {/* When */}
        <div className="flex shrink-0 flex-col justify-center px-6 text-left">
          <p className="text-[11px] font-bold leading-tight text-foreground">
            When
          </p>
          <p className="text-sm leading-tight text-muted-foreground">Any week</p>
        </div>

        <span className="w-px self-stretch bg-border" aria-hidden />

        {/* Who + search circle — circle is 52px to match the Travel
            pill height, with 8px inset on the right so it lands flush
            with the container's symmetric padding. */}
        <div className="flex shrink-0 items-center pl-6 pr-2">
          <div className="mr-3 text-left">
            <p className="text-[11px] font-bold leading-tight text-foreground">
              Who
            </p>
            <p className="text-sm leading-tight text-muted-foreground">Add guests</p>
          </div>
          <button
            type="button"
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-brand text-brand-foreground transition-colors hover:bg-brand-300"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filters — same height + same border + same fill as the rest
          of the row. */}
      <button
        type="button"
        className="inline-flex h-[68px] shrink-0 items-center gap-2 rounded-full border border-border bg-card/40 px-6 text-sm font-medium text-foreground hover:bg-card/60"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
      </button>
    </div>
  );
}

// ── Marquee section ────────────────────────────────────────────

function MarqueeSection({
  title,
  subtitle,
  link,
  direction,
  children,
}: {
  title: string;
  subtitle: string;
  link: { label: string; href: string };
  direction: "left" | "right";
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let loopWidth = node.scrollWidth / 2;
    const ro = new ResizeObserver(() => {
      loopWidth = node.scrollWidth / 2;
    });
    ro.observe(node);

    // Base speed = "px per ms". 70s for one full loop ≈ baseline pace.
    const dir = direction === "right" ? -1 : 1;
    let x = direction === "right" ? 0 : -loopWidth;
    let speedFactor = 1; // 1 = full, ~0.02 = near stop
    let targetFactor = 1;
    let last = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      // Ease toward target factor (~250ms time-constant).
      speedFactor += (targetFactor - speedFactor) * Math.min(1, dt / 250);
      x += dir * (loopWidth / 70000) * speedFactor * dt;
      // Wrap on the loop boundary so the duplicated children seam.
      if (dir < 0 && x <= -loopWidth) x += loopWidth;
      if (dir > 0 && x >= 0) x -= loopWidth;
      node.style.transform = `translateX(${x}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onEnter = () => {
      targetFactor = 0.02;
    };
    const onLeave = () => {
      targetFactor = 1;
    };
    node.addEventListener("mouseenter", onEnter);
    node.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      node.removeEventListener("mouseenter", onEnter);
      node.removeEventListener("mouseleave", onLeave);
    };
  }, [direction]);

  return (
    <section className="mt-14">
      {/* Title row: title | divider | subtitle | divider | ghost link.
          Items align to baseline; dividers self-stretch the full row
          height; divider color is the same faint structural-line tone
          used throughout the rest of the design.
          The h2 inherits the global serif treatment (DM Serif Display,
          clamp 28-44px) — we override only max-width so the title can
          breathe past 24ch without overflow. */}
      <div className="flex flex-wrap items-baseline gap-4">
        <h2
          className="whitespace-nowrap"
          style={{ maxWidth: "none" }}
        >
          {title}
        </h2>
        <span className="w-px self-stretch bg-border" aria-hidden />
        <p className="whitespace-nowrap text-sm text-muted-foreground">
          {subtitle}
        </p>
        <span className="w-px self-stretch bg-border" aria-hidden />
        <Link
          href={link.href}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card/30 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-card/60"
        >
          {link.label}
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      {/* Marquee — items run to the container edge with no fade overlays.
          Inner row is JS-driven (see useEffect above) so hover smoothly
          eases the speed instead of jolting to a stop. */}
      <div className="relative mt-5 overflow-hidden">
        <div ref={ref} className="flex w-max gap-4 will-change-transform">
          <div className="flex shrink-0 gap-4">{children}</div>
          <div className="flex shrink-0 gap-4" aria-hidden>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Concentric rings overlay (Trip Wish visual) ────────────────
// Replicates the live ProposalCard's TripWishVisual: radial gradient
// with hard-stop pairs forming concentric annular bands of
// increasing white opacity (5%, 10%, 18%, 27%, 40%) over a colored
// destination field. The rings extend past the frame so they read
// as continuing infinitely; parent's overflow-hidden clips them.

function ConcentricRings() {
  // Subtle, desaturated green bands that match the Trustead theme.
  // The tone is a muted forest-mint at incrementing opacity — keeps
  // the destination photo readable through the inner band while
  // tinting the outer bands toward the brand palette.
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: [
          "radial-gradient(circle at center,",
          "  transparent 0%,",
          "  transparent 13%,",
          "  rgba(110,150,130,0.20) 13%,",
          "  rgba(110,150,130,0.20) 25%,",
          "  rgba(80,130,110,0.30) 25%,",
          "  rgba(80,130,110,0.30) 40%,",
          "  rgba(55,105,85,0.42) 40%,",
          "  rgba(55,105,85,0.42) 55%,",
          "  rgba(35,80,65,0.55) 55%,",
          "  rgba(35,80,65,0.55) 75%,",
          "  rgba(20,55,45,0.72) 75%,",
          "  rgba(20,55,45,0.72) 100%",
          ")",
        ].join(" "),
      }}
    />
  );
}

// ── Trip Wish card (horizontal, white card matching live style) ─

function TripWishCardHorizontal({ item }: { item: TripWish }) {
  return (
    <article className="group flex h-[275px] w-[600px] shrink-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Visual pane — square, destination photo with concentric-ring
          overlay and centered destination label sitting on top. All
          three elements (photo, rings, text) absolute-positioned in the
          square so they stack precisely. */}
      <div className="relative h-[275px] w-[275px] shrink-0 overflow-hidden bg-zinc-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.photo}
          alt={item.destination}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <ConcentricRings />
        <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center px-3 text-center">
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.55)" }}
          >
            Trip Wish
          </div>
          <div
            className="mt-2 line-clamp-2 text-2xl font-semibold leading-tight text-white"
            style={{ textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}
          >
            {item.destination}
          </div>
          {item.subdest && (
            <div
              className="mt-1 text-[11px] font-medium text-white/95"
              style={{ textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}
            >
              {item.subdest}
            </div>
          )}
        </div>
      </div>
      {/* Info pane */}
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.avatar}
            alt={item.author}
            className="h-7 w-7 rounded-full object-cover"
          />
          <span className="truncate text-xs font-semibold text-zinc-900">
            {item.author}
          </span>
          <span className="rounded-full bg-brand/15 px-1.5 py-0 text-[9px] font-semibold text-brand">
            {item.trust}
          </span>
          <span className="ml-auto rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-900">
            Trip Wish
          </span>
        </div>
        {/* Title — bigger, the focal point */}
        <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-snug text-zinc-900">
          {item.title}
        </h3>
        {/* Body copy */}
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-zinc-600">
          {item.body}
        </p>
        <div className="mt-auto space-y-2 pt-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-600">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {item.dates}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {item.guests} guest{item.guests === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-zinc-800">
              Offer a place
            </button>
            <button className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
              Save
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

// ── Host Offer card (horizontal, photo on left) ────────────────

function HostOfferCardHorizontal({ item }: { item: HostOffer }) {
  return (
    <article className="group flex h-[275px] w-[600px] shrink-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Photo pane — square */}
      <div className="relative h-[275px] w-[275px] shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.photo}
          alt={item.listing}
          className="h-full w-full object-cover"
        />
      </div>
      {/* Info pane */}
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.avatar}
            alt={item.author}
            className="h-7 w-7 rounded-full object-cover"
          />
          <span className="truncate text-xs font-semibold text-zinc-900">
            {item.author}
          </span>
          <span className="rounded-full bg-brand/15 px-1.5 py-0 text-[9px] font-semibold text-brand">
            {item.trust}
          </span>
          <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900">
            Host Offer
          </span>
        </div>
        {/* Title — bigger */}
        <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-snug text-zinc-900">
          {item.listing}
        </h3>
        {/* Body copy */}
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-zinc-600">
          {item.body}
        </p>
        <div className="mt-auto space-y-2 pt-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-600">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {item.area}, {item.city.split(",")[0]}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {item.dates}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-zinc-800">
                Request to book
              </button>
              <button className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                Save
              </button>
            </div>
            <span className="shrink-0 text-xs text-zinc-900">
              <span className="text-base font-semibold">${item.price}</span>
              <span className="text-zinc-600">/night</span>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

// ── Listing card (vertical, matching live style) ───────────────

function ListingCardVertical({ item }: { item: Listing }) {
  return (
    <Link
      href="/sandbox/layouts/listing"
      className="group block w-[300px] shrink-0"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.photo}
          alt={item.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <button
          aria-label="Save"
          className="absolute right-3 top-3 z-10 text-white drop-shadow-md transition-colors hover:text-rose-400"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Heart className="h-5 w-5 fill-black/30" />
        </button>
      </div>
      <div className="mt-3">
        <h3 className="line-clamp-1 font-semibold leading-tight text-foreground">
          {item.area}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
          {item.title}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Hosted by {item.hostFirst}
        </p>
        <div className="mt-1.5">
          <TrustTagPill trust={item.trust} rating={item.rating} reviews={item.reviewCount} />
        </div>
        <p className="mt-1.5">
          <span className="font-semibold text-foreground">${item.price}</span>
          <span className="text-muted-foreground"> night</span>
        </p>
      </div>
    </Link>
  );
}

function TrustTagPill({
  trust,
  rating,
  reviews,
}: {
  trust: string;
  rating: number;
  reviews: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-foreground">
      <ShieldCheck className="h-3 w-3 text-brand" />
      <span className="font-semibold text-brand">{trust}</span>
      <span className="text-muted-foreground">·</span>
      <span>★ {rating}</span>
      <span className="text-muted-foreground">({reviews})</span>
    </span>
  );
}

// ── Person card ─────────────────────────────────────────────────

function PersonCard({ person }: { person: Person }) {
  const connectorList = person.connectors.map((c) => c.name);
  const trustPath =
    connectorList.length === 0
      ? null
      : connectorList.length === 1
        ? `via ${connectorList[0]}`
        : `via ${connectorList[0]} & ${connectorList.length - 1} other${connectorList.length - 1 === 1 ? "" : "s"}`;
  return (
    <article className="flex h-[260px] w-[380px] shrink-0 flex-col rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={person.avatar}
          alt={person.name}
          className="h-14 w-14 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-foreground">
            {person.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {person.relation}
          </p>
        </div>
      </div>

      {/* Medium trust badge — high contrast: solid mint degree pill,
          dark wash box, cream text for the rest. Replaces the
          cream-on-cream treatment that was blown out. */}
      <div className="mt-3 rounded-xl border border-border bg-background/50 p-3">
        <div className="flex items-center gap-2 text-xs text-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-brand-foreground">
            <ShieldCheck className="h-3 w-3" />
            {person.degree}
          </span>
          {trustPath && (
            <span className="truncate font-medium">{trustPath}</span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2">
          {/* Connector avatars stacked */}
          <div className="flex -space-x-1.5">
            {person.connectors.slice(0, 3).map((c) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={c.name}
                src={c.avatar}
                alt={c.name}
                title={c.name}
                className="h-6 w-6 rounded-full border-2 border-background object-cover"
              />
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {person.mutual} mutual · {person.lastSeen}
          </p>
        </div>
      </div>

      <button className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
        <ShieldCheck className="h-3.5 w-3.5" />
        Vouch for {person.name.split(" ")[0]}
      </button>
    </article>
  );
}

// ── CTA strip ──────────────────────────────────────────────────
// Three compact horizontal cards (icon-left), centered just below
// the hero. Order is the discovery order: find people you trust
// first → open your home → post your trip wish.

function CTAStrip() {
  const ctas = [
    {
      icon: UserPlus,
      title: "Find people you know",
      body: "Search by name, email, or phone.",
      href: "/sandbox/layouts/vouch",
    },
    {
      icon: Plus,
      title: "Create your first listing",
      body: "Open your home to your network.",
      href: "/sandbox/layouts/dashboard",
    },
    {
      icon: Plane,
      title: "Post a trip wish",
      body: "Tell your network where you want to go.",
      href: "/sandbox/layouts/proposals",
    },
  ];
  return (
    <section className="mx-auto mt-12 w-full max-w-[1280px]">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {ctas.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.title}
              href={c.href}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card/40 p-4 transition-colors hover:border-brand/40 hover:bg-card/60"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-foreground">
                  {c.title}
                </h3>
                <p className="truncate text-[11px] text-muted-foreground">
                  {c.body}
                </p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

