// D3 LAYOUT SANDBOX — HOME V5
// ----------------------------------------------------------------
// Variation on home-v4: same site shell (collapsible left sidebar +
// fixed right rail + condensed search w/ Stays/People/Vouches mode
// selector), but with a different content arrangement:
//
//   - Hero "of the moment" card up top — featured Host Offer or
//     Trip Wish from your network, large + editorial.
//   - Two marquees below (proposals + listings) with the same
//     live-matching card styles (horizontal proposals w/ concentric
//     rings on Trip Wishes; vertical listings w/ TrustTag pill).
//   - Network-at-a-glance strip with vouch power, given/received,
//     1° and 2° reach.
//
// The right rail leads with "Today's prompts" — 2-3 specific nudges
// (vouch back X, reply to Y) above the activity feed, so the side
// rail reads as "do this next" rather than "look at the past".
// ----------------------------------------------------------------

"use client";

import Link from "next/link";
import { useState } from "react";
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
  ArrowUpRight,
  Heart,
  Bell,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: HomeIcon, label: "Home", href: "/sandbox/layouts/home-v5", active: true },
  { icon: Search, label: "Browse", href: "/sandbox/layouts/browse" },
  { icon: Plane, label: "Proposals", href: "/sandbox/layouts/proposals" },
  { icon: ShieldCheck, label: "Vouch", href: "/sandbox/layouts/vouch" },
  { icon: Users, label: "Network", href: "/sandbox/layouts/network" },
  { icon: MessageCircle, label: "Messages", href: "/sandbox/layouts/messages" },
  { icon: Calendar, label: "Trips", href: "/sandbox/layouts/trips" },
  { icon: User, label: "Profile", href: "/sandbox/layouts/profile" },
];

const USER = { firstName: "Sample" };

const FEATURED = {
  kind: "Host Offer" as const,
  author: "Maya R.",
  authorAvatar: "https://picsum.photos/seed/maya-r/120/120",
  trust: "1°" as const,
  trustNote: "1° via Erin Q. · 3 mutual",
  city: "Park Slope, Brooklyn",
  dates: "Jul 04 → 08",
  title: "Garden floor open over July 4th — friends-of-friends only",
  body:
    "We're heading upstate for the long weekend. Garden floor is yours if you're in the network. Couple or solo, $145/night. Quiet block, full kitchen, garden access.",
  photo: "https://picsum.photos/seed/brklyn-1-hero/1600/900",
  price: 145,
};

type TripWish = {
  id: string;
  author: string;
  avatar: string;
  trust: "1°" | "2°" | "3°";
  destination: string;
  subdest?: string;
  dates: string;
  body: string;
  guests: number;
  palette: string;
};

const TRIP_WISHES: TripWish[] = [
  { id: "tw1", author: "Erin Q.", avatar: "https://picsum.photos/seed/erin-q/120/120", trust: "1°", destination: "Brooklyn", subdest: "Park Slope", dates: "Jun 14 → 20", guests: 1, body: "Quiet 1-bed for a week of writing. Bonus if there's a desk.", palette: "from-amber-300 via-orange-400 to-rose-500" },
  { id: "tw2", author: "Theo L.", avatar: "https://picsum.photos/seed/theo-l/120/120", trust: "2°", destination: "Coastal Maine", dates: "Late September", guests: 4, body: "Family-of-4. Kids school-age. 5–7 nights, beach access ideal.", palette: "from-sky-300 via-blue-500 to-indigo-600" },
  { id: "tw3", author: "Dev S.", avatar: "https://picsum.photos/seed/dev-s/120/120", trust: "1°", destination: "Mexico City", subdest: "Roma Norte", dates: "Aug 10 → 24", guests: 2, body: "Two weeks remote-working. Roma Norte / Condesa preferred.", palette: "from-emerald-300 via-teal-500 to-cyan-600" },
  { id: "tw4", author: "Aliyah J.", avatar: "https://picsum.photos/seed/aliyah-j/120/120", trust: "2°", destination: "Lisbon", dates: "Oct 02 → 09", guests: 2, body: "First time in Portugal. Open to neighborhoods near the river.", palette: "from-fuchsia-300 via-pink-500 to-rose-500" },
  { id: "tw5", author: "Cass W.", avatar: "https://picsum.photos/seed/cass-w/120/120", trust: "2°", destination: "Barcelona", subdest: "Gracia", dates: "Sep 18 → 24", guests: 1, body: "Solo trip. Quiet apartment, walking distance to cafes.", palette: "from-violet-300 via-purple-500 to-indigo-600" },
];

type Listing = {
  id: string;
  area: string;
  title: string;
  price: number;
  hostFirst: string;
  trust: "1°" | "2°" | "3°";
  rating: number;
  reviewCount: number;
  photo: string;
};

const LISTINGS: Listing[] = [
  { id: "l1", area: "Park Slope, Brooklyn", title: "Sunlit brownstone garden floor", price: 145, hostFirst: "Maya", trust: "1°", rating: 4.91, reviewCount: 23, photo: "https://picsum.photos/seed/brklyn-1/600/450" },
  { id: "l2", area: "East Austin", title: "East-side bungalow with backyard", price: 165, hostFirst: "Dev", trust: "1°", rating: 4.85, reviewCount: 18, photo: "https://picsum.photos/seed/austin-1/600/450" },
  { id: "l3", area: "Mission, San Francisco", title: "Mission flat with bay window", price: 220, hostFirst: "Priya", trust: "2°", rating: 4.92, reviewCount: 31, photo: "https://picsum.photos/seed/sf-1/600/450" },
  { id: "l4", area: "Roma Norte, CDMX", title: "Roma Norte courtyard apartment", price: 95, hostFirst: "Diego", trust: "2°", rating: 4.78, reviewCount: 14, photo: "https://picsum.photos/seed/cdmx-1/600/450" },
  { id: "l5", area: "Bed-Stuy, Brooklyn", title: "Bed-Stuy loft with private roof", price: 185, hostFirst: "Aliyah", trust: "1°", rating: 4.96, reviewCount: 27, photo: "https://picsum.photos/seed/brklyn-2/600/450" },
  { id: "l6", area: "South Congress, Austin", title: "South Congress casita", price: 130, hostFirst: "Jonas", trust: "2°", rating: 4.88, reviewCount: 22, photo: "https://picsum.photos/seed/austin-2/600/450" },
  { id: "l7", area: "Condesa, CDMX", title: "Condesa walk-up with terrace", price: 110, hostFirst: "Sofía", trust: "2°", rating: 4.83, reviewCount: 19, photo: "https://picsum.photos/seed/cdmx-2/600/450" },
];

const NETWORK_STATS = [
  { label: "Vouch power", value: "1.42×" },
  { label: "Vouches given", value: 18 },
  { label: "Vouches received", value: 11 },
  { label: "1° connections", value: 9 },
  { label: "2° reach", value: 47 },
];

const ACTIVITY = [
  { who: "Maya R.", body: "vouched for you", ago: "2h", actionable: true },
  { who: "Diego M.", body: "replied to your CDMX proposal", ago: "Yesterday", actionable: false },
  { who: "Priya K.", body: "vouched for you", ago: "1w", actionable: true },
  { who: "Beatriz F.", body: "joined via Sofía A.", ago: "3d", actionable: false },
  { who: "Aliyah J.", body: "posted a new listing", ago: "4d", actionable: false },
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

// ── Page ───────────────────────────────────────────────────────

export default function HomeV5() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <>
      <MarqueeStyles />
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
                <h1 className="mt-2 whitespace-nowrap font-serif text-4xl text-foreground md:text-5xl">
                  What are you looking for?
                </h1>
                <CondensedSearch />
              </header>

              {/* Hero "of the moment" */}
              <section className="mt-12">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Featured in your network
                </p>
                <article className="mt-3 overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
                  <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={FEATURED.photo}
                        alt={FEATURED.title}
                        className="aspect-[16/10] h-full w-full object-cover lg:aspect-auto"
                      />
                      <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-900">
                        {FEATURED.kind}
                      </span>
                    </div>
                    <div className="flex flex-col justify-center gap-4 p-6 md:p-10">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={FEATURED.authorAvatar}
                          alt={FEATURED.author}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">
                            {FEATURED.author}
                          </p>
                          <p className="inline-flex items-center gap-1 text-[11px] text-zinc-600">
                            <span className="rounded-full bg-brand/15 px-1.5 py-0 text-[9px] font-semibold text-brand">
                              {FEATURED.trust}
                            </span>
                            {FEATURED.trustNote.replace(/^[^ ]+ /, "")}
                          </p>
                        </div>
                      </div>
                      <h2 className="font-serif text-2xl text-zinc-900 md:text-3xl">
                        {FEATURED.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-600">
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {FEATURED.city}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {FEATURED.dates}
                        </span>
                        <span className="text-zinc-900">
                          <span className="font-semibold">${FEATURED.price}</span>
                          /night
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-zinc-600">
                        {FEATURED.body}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800">
                          Request to book
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                        <button className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50">
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              </section>

              {/* Marquee — People-in-your-network leads */}
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

              {/* Marquee — Trip Wishes */}
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

              {/* Marquee — Listings */}
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

              {/* Network at a glance */}
              <section className="mt-12 mb-8 rounded-2xl border border-border bg-card/40 p-6">
                <div className="flex items-baseline justify-between">
                  <h2 className="whitespace-nowrap text-lg font-semibold text-foreground md:text-xl">
                    Your network at a glance
                  </h2>
                  <Link
                    href="/sandbox/layouts/network"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Open network
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                  {NETWORK_STATS.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl border border-border bg-background/40 p-4"
                    >
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {s.label}
                      </p>
                      <p className="mt-2 font-serif text-2xl text-foreground">
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
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
  const unread = ACTIVITY.filter((a) => a.actionable).length;
  return (
    <aside
      className={`sticky top-9 flex h-[calc(100vh-36px)] shrink-0 flex-col border-r border-border bg-card/30 transition-[width] duration-200 ${w}`}
      aria-label="Site navigation"
    >
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 px-4">
        <Link
          href="/sandbox/layouts/home-v5"
          className="flex items-center gap-2 font-serif text-lg text-foreground"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground">
            <ShieldCheck className="h-4 w-4" />
          </span>
          {!collapsed && <span>Trustead</span>}
        </Link>
        {!collapsed && (
          <button
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="rounded-md p-1 text-muted-foreground hover:bg-card/60 hover:text-foreground"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>
      <nav className="shrink-0 px-2 py-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
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
      </nav>

      {/* Notifications inline below nav. Fills remaining vertical
          space and scrolls. Collapsed sidebar shows a single bell. */}
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
        <div className="flex min-h-0 flex-1 flex-col border-t border-border/60">
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
            {ACTIVITY.map((a, i) => (
              <li
                key={i}
                className="rounded-lg border border-border bg-background/40 p-2.5"
              >
                <p className="text-[11px] leading-snug text-foreground">
                  <span className="font-semibold">{a.who}</span> {a.body}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-subtle">{a.ago}</span>
                  {a.actionable && (
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
  return (
    <div className="mt-6 flex h-14 w-full max-w-[820px] items-stretch gap-1 rounded-2xl border border-border bg-card/40 p-1 shadow-search">
      <div className="flex shrink-0 items-center gap-0.5 rounded-xl bg-background/40 p-0.5">
        <ModeButton icon={HomeIcon} label="Stays" active />
        <ModeButton icon={Users} label="People" />
        <ModeButton icon={ShieldCheck} label="Vouches" />
      </div>
      <div className="flex flex-1 items-center gap-2 rounded-xl px-4">
        <Search className="h-4 w-4 text-muted-foreground" />
        <span className="truncate text-sm text-muted-foreground">
          Anywhere · Any week · Add guests
        </span>
      </div>
      <button className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
        Search
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ModeButton({
  icon: Icon,
  label,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={
        active
          ? "inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-background"
          : "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
      }
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
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
  const animClass = direction === "right" ? "marquee-right" : "marquee-left";
  return (
    <section className="mt-12">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="whitespace-nowrap text-lg font-semibold text-foreground md:text-xl">
            {title}
          </h2>
          <p className="mt-0.5 whitespace-nowrap text-xs text-muted-foreground md:text-sm">
            {subtitle}
          </p>
        </div>
        <Link
          href={link.href}
          className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {link.label}
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="relative mt-4 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent" />
        <div className={`flex w-max gap-4 ${animClass}`}>
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

function ConcentricRings() {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: [
          "radial-gradient(circle at center,",
          "  transparent 0%,",
          "  transparent 13%,",
          "  rgba(255,255,255,0.05) 13%,",
          "  rgba(255,255,255,0.05) 25%,",
          "  rgba(255,255,255,0.10) 25%,",
          "  rgba(255,255,255,0.10) 40%,",
          "  rgba(255,255,255,0.18) 40%,",
          "  rgba(255,255,255,0.18) 55%,",
          "  rgba(255,255,255,0.27) 55%,",
          "  rgba(255,255,255,0.27) 75%,",
          "  rgba(255,255,255,0.40) 75%,",
          "  rgba(255,255,255,0.40) 100%",
          ")",
        ].join(" "),
      }}
    />
  );
}

// ── Trip Wish card (horizontal) ────────────────────────────────

function TripWishCardHorizontal({ item }: { item: TripWish }) {
  return (
    <article className="group flex h-[260px] w-[510px] shrink-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md">
      <div
        className={`relative h-[260px] w-[260px] shrink-0 overflow-hidden bg-gradient-to-br ${item.palette}`}
      >
        <ConcentricRings />
        <div className="relative z-[1] flex h-full w-full flex-col items-center justify-center px-3 text-center">
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.45)" }}
          >
            Trip Wish
          </div>
          <div
            className="mt-2 line-clamp-2 text-xl font-semibold leading-tight text-white"
            style={{ textShadow: "0 2px 10px rgba(0,0,0,0.55)" }}
          >
            {item.destination}
          </div>
          {item.subdest && (
            <div
              className="mt-1 text-[11px] font-medium text-white/95"
              style={{ textShadow: "0 1px 6px rgba(0,0,0,0.55)" }}
            >
              {item.subdest}
            </div>
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-4">
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
          <span className="rounded-full bg-sky-100 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide text-sky-900">
            Trip Wish
          </span>
        </div>
        <h3 className="mt-2 line-clamp-3 text-sm font-semibold leading-snug text-zinc-900">
          {item.body}
        </h3>
        <div className="mt-auto space-y-1.5">
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
          <div className="flex items-center gap-1.5">
            <button className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-zinc-800">
              Offer a place
            </button>
            <span className="rounded-full bg-brand/15 px-1.5 py-0 text-[9px] font-semibold text-brand">
              {item.trust}
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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-foreground">
            <ShieldCheck className="h-3 w-3 text-brand" />
            <span className="font-semibold text-brand">{item.trust}</span>
            <span className="text-muted-foreground">·</span>
            <span>★ {item.rating}</span>
            <span className="text-muted-foreground">({item.reviewCount})</span>
          </span>
        </div>
        <p className="mt-1.5">
          <span className="font-semibold text-foreground">${item.price}</span>
          <span className="text-muted-foreground"> night</span>
        </p>
      </div>
    </Link>
  );
}

// ── Person card (medium trust badge with connectors) ───────────

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

      <div className="mt-3 rounded-xl border border-brand/30 bg-brand/10 p-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-brand">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>{person.degree}</span>
          {trustPath && (
            <span className="font-normal text-foreground">· {trustPath}</span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2">
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

// ── Marquee styles ─────────────────────────────────────────────

function MarqueeStyles() {
  return (
    <style>{`
      @keyframes marquee-right {
        from { transform: translateX(0); }
        to { transform: translateX(-50%); }
      }
      @keyframes marquee-left {
        from { transform: translateX(-50%); }
        to { transform: translateX(0); }
      }
      .marquee-right { animation: marquee-right 70s linear infinite; }
      .marquee-left  { animation: marquee-left 70s linear infinite; }
      .marquee-right:hover, .marquee-left:hover { animation-play-state: paused; }
      @media (prefers-reduced-motion: reduce) {
        .marquee-right, .marquee-left { animation: none; }
      }
    `}</style>
  );
}
