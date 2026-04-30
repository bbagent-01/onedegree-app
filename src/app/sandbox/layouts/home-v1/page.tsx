// D3 LAYOUT SANDBOX — HOME V1 (showcase rows, alternating marquee)
// ----------------------------------------------------------------
// Post-signup landing surface, variation 1. Auto-scrolling
// horizontal rows that alternate direction so the page feels alive
// the moment you land. Tabbed multi-mode search at top: Stays /
// People / Vouches. All sample data inline. Respects reduced-motion.
// ----------------------------------------------------------------

import Link from "next/link";
import {
  Search,
  ShieldCheck,
  ArrowRight,
  Plane,
  Home as HomeIcon,
  Users,
  ChevronRight,
} from "lucide-react";

export const runtime = "edge";

// ── Sample data ────────────────────────────────────────────────

const USER = { firstName: "Sample" };

const TRIP_WISHES = [
  { name: "Erin Q.", avatar: "https://picsum.photos/seed/erin-q/80/80", city: "Brooklyn, NY", dates: "Jun 14 → 20", body: "Looking for a quiet 1-bed for a week of writing.", trust: "1°" },
  { name: "Theo L.", avatar: "https://picsum.photos/seed/theo-l/80/80", city: "Anywhere coastal", dates: "Late Sep", body: "Family-of-4, kids school-age, 5–7 nights.", trust: "2°" },
  { name: "Dev S.", avatar: "https://picsum.photos/seed/dev-s/80/80", city: "Mexico City", dates: "Aug 10 → 24", body: "Two weeks remote-working. Roma Norte / Condesa preferred.", trust: "1°" },
  { name: "Aliyah J.", avatar: "https://picsum.photos/seed/aliyah-j/80/80", city: "Lisbon", dates: "Oct 02 → 09", body: "First time in Portugal, open to neighborhoods near the river.", trust: "2°" },
  { name: "Cass W.", avatar: "https://picsum.photos/seed/cass-w/80/80", city: "Barcelona", dates: "Sep 18 → 24", body: "Solo trip, want quiet apartment in Gracia.", trust: "2°" },
  { name: "Beatriz F.", avatar: "https://picsum.photos/seed/bea-f/80/80", city: "Tokyo", dates: "Nov 06 → 13", body: "First Tokyo trip, want a small place near Shimokitazawa.", trust: "3°" },
];

const HOST_OFFERS = [
  { name: "Maya R.", avatar: "https://picsum.photos/seed/maya-r/80/80", listing: "Brownstone garden floor", city: "Park Slope, Brooklyn", dates: "Jul 04 → 08", price: 145, photo: "https://picsum.photos/seed/brklyn-1/400/300", trust: "1°" },
  { name: "Diego M.", avatar: "https://picsum.photos/seed/diego-m/80/80", listing: "Roma Norte courtyard apartment", city: "CDMX", dates: "Sep 02 → 16", price: 95, photo: "https://picsum.photos/seed/cdmx-1/400/300", trust: "2°" },
  { name: "Jonas T.", avatar: "https://picsum.photos/seed/jonas-t/80/80", listing: "South Congress casita", city: "Austin", dates: "Aug 18 → 25", price: 130, photo: "https://picsum.photos/seed/austin-2/400/300", trust: "2°" },
  { name: "Sofía A.", avatar: "https://picsum.photos/seed/sofia-a/80/80", listing: "Condesa walk-up with terrace", city: "CDMX", dates: "Oct 10 → 17", price: 110, photo: "https://picsum.photos/seed/cdmx-2/400/300", trust: "2°" },
  { name: "Priya K.", avatar: "https://picsum.photos/seed/priya-k/80/80", listing: "Mission flat with bay window", city: "San Francisco", dates: "Sep 22 → 26", price: 220, photo: "https://picsum.photos/seed/sf-1/400/300", trust: "2°" },
];

const LISTINGS = [
  { title: "Sunlit brownstone garden floor", city: "Park Slope, Brooklyn", price: 145, host: "Maya R.", trust: "1°", photo: "https://picsum.photos/seed/brklyn-1/600/450" },
  { title: "East-side bungalow with backyard", city: "East Austin", price: 165, host: "Dev S.", trust: "1°", photo: "https://picsum.photos/seed/austin-1/600/450" },
  { title: "Mission flat with bay window", city: "San Francisco", price: 220, host: "Priya K.", trust: "2°", photo: "https://picsum.photos/seed/sf-1/600/450" },
  { title: "Roma Norte courtyard apartment", city: "CDMX", price: 95, host: "Diego M.", trust: "2°", photo: "https://picsum.photos/seed/cdmx-1/600/450" },
  { title: "Bed-Stuy loft with private roof", city: "Brooklyn", price: 185, host: "Aliyah J.", trust: "1°", photo: "https://picsum.photos/seed/brklyn-2/600/450" },
  { title: "South Congress casita", city: "Austin", price: 130, host: "Jonas T.", trust: "2°", photo: "https://picsum.photos/seed/austin-2/600/450" },
  { title: "Condesa walk-up with terrace", city: "CDMX", price: 110, host: "Sofía A.", trust: "2°", photo: "https://picsum.photos/seed/cdmx-2/600/450" },
  { title: "Greenpoint waterfront studio", city: "Brooklyn", price: 155, host: "Erin Q.", trust: "2°", photo: "https://picsum.photos/seed/brklyn-3/600/450" },
];

const PEOPLE_TO_VOUCH = [
  { name: "Erin Quinn", avatar: "https://picsum.photos/seed/erin-q/80/80", relation: "College roommate", mutual: 4, lastSeen: "Stayed with you in Mar" },
  { name: "Renata V.", avatar: "https://picsum.photos/seed/renata-v/80/80", relation: "Friend from book club", mutual: 2, lastSeen: "You stayed with her in Feb" },
  { name: "Casey W.", avatar: "https://picsum.photos/seed/casey-w/80/80", relation: "Worked together at Studio", mutual: 6, lastSeen: "Mutual: Erin, Dev" },
  { name: "Beatriz F.", avatar: "https://picsum.photos/seed/bea-f/80/80", relation: "Old neighbor", mutual: 1, lastSeen: "Recently joined Trustead" },
  { name: "Jonas T.", avatar: "https://picsum.photos/seed/jonas-t/80/80", relation: "Climbing partner", mutual: 3, lastSeen: "Hosted you in Mar" },
  { name: "Sofía A.", avatar: "https://picsum.photos/seed/sofia-a/80/80", relation: "Old friend from CDMX", mutual: 5, lastSeen: "Vouched for you Apr 03" },
];

const VOUCH_ACTIVITY = [
  { name: "Maya R.", action: "vouched for you", ago: "2 days ago", actionable: true },
  { name: "Sofía A.", action: "vouched for you", ago: "Apr 03", actionable: false },
  { name: "You", action: "vouched for Erin Q.", ago: "Apr 02", actionable: false },
  { name: "Priya K.", action: "vouched for you", ago: "1 week ago", actionable: true },
];

// ── Page ───────────────────────────────────────────────────────

export default function HomeV1() {
  return (
    <>
      <MarqueeStyles />
      <div className="mx-auto w-full max-w-[1600px] px-4 py-8 md:px-6 lg:px-10">
        {/* Greeting + multi-mode search */}
        <section>
          <p className="text-sm text-muted-foreground">
            Welcome back, {USER.firstName}.
          </p>
          <h1 className="mt-1 font-serif text-4xl text-foreground md:text-5xl">
            What are you looking for?
          </h1>

          {/* Mode tabs */}
          <div className="mt-6 inline-flex rounded-full border border-border bg-card/40 p-1">
            <ModeTab icon={HomeIcon} label="Stays" active />
            <ModeTab icon={Users} label="People" />
            <ModeTab icon={ShieldCheck} label="Vouches" />
          </div>

          {/* Search field */}
          <div className="mt-3 flex h-14 w-full max-w-[680px] items-center gap-3 rounded-2xl border border-border bg-card/40 px-5 shadow-search">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-base text-muted-foreground">
              Anywhere · Any week · Add guests
            </span>
            <button className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Search
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        {/* Marquee rows */}
        <MarqueeSection
          title="Trip Wishes from your network"
          subtitle="People in your trust network looking for a place to stay"
          link={{ label: "All proposals", href: "/sandbox/layouts/proposals" }}
          direction="right"
        >
          {TRIP_WISHES.map((t, i) => (
            <TripWishCard key={i} {...t} />
          ))}
        </MarqueeSection>

        <MarqueeSection
          title="Stays from people you know"
          subtitle="Listings hosted by 1° and 2° connections"
          link={{ label: "Browse all", href: "/sandbox/layouts/browse" }}
          direction="left"
        >
          {LISTINGS.map((l, i) => (
            <ListingCard key={i} {...l} />
          ))}
        </MarqueeSection>

        <MarqueeSection
          title="Host Offers"
          subtitle="Members opening their homes for specific dates"
          link={{ label: "All offers", href: "/sandbox/layouts/proposals" }}
          direction="right"
        >
          {HOST_OFFERS.map((h, i) => (
            <HostOfferCard key={i} {...h} />
          ))}
        </MarqueeSection>

        <MarqueeSection
          title="People in your network"
          subtitle="Folks you might want to vouch for"
          link={{ label: "Vouch flow", href: "/sandbox/layouts/vouch" }}
          direction="left"
        >
          {PEOPLE_TO_VOUCH.map((p, i) => (
            <PersonCard key={i} {...p} />
          ))}
        </MarqueeSection>

        {/* Vouch activity strip */}
        <section className="mt-12 rounded-2xl border border-brand/30 bg-brand/10 p-5 md:p-6">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground md:text-lg">
                Recent vouch activity
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Vouches you&rsquo;ve given and received in the last 14 days
              </p>
            </div>
            <Link
              href="/sandbox/layouts/network"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              See all →
            </Link>
          </div>
          <ul className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            {VOUCH_ACTIVITY.map((a, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/40 px-4 py-3"
              >
                <p className="text-sm text-foreground">
                  <span className="font-semibold">{a.name}</span> {a.action}
                  <span className="ml-2 text-xs text-subtle">· {a.ago}</span>
                </p>
                {a.actionable && (
                  <button className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                    Vouch back
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

// ── Mode tab ───────────────────────────────────────────────────

function ModeTab({
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
          ? "inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background"
          : "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      }
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

// ── Marquee section ────────────────────────────────────────────
// Auto-scrolling horizontal row. Children are rendered twice
// back-to-back so the loop seams. Direction "right" scrolls content
// from right to left visually (animation translateX 0 → -50%);
// "left" reverses. Reduced-motion users see a static row.

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
  const animClass =
    direction === "right" ? "marquee-right" : "marquee-left";
  const items = [children, children];
  return (
    <section className="mt-12">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground md:text-xl">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
            {subtitle}
          </p>
        </div>
        <Link
          href={link.href}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {link.label}
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="relative mt-4 overflow-hidden">
        {/* Edge fade */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent" />
        <div className={`flex w-max gap-4 ${animClass}`}>
          {items.map((c, i) => (
            <div key={i} className="flex shrink-0 gap-4" aria-hidden={i === 1}>
              {c}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Card components ────────────────────────────────────────────

function TripWishCard({
  name,
  avatar,
  city,
  dates,
  body,
  trust,
}: {
  name: string;
  avatar: string;
  city: string;
  dates: string;
  body: string;
  trust: string;
}) {
  return (
    <article className="w-[320px] shrink-0 rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatar}
          alt={name}
          className="h-9 w-9 rounded-full object-cover"
        />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{name}</p>
          <p className="text-[11px] text-muted-foreground">
            <span className="rounded-full bg-brand/15 px-1.5 py-0 text-[9px] font-semibold text-brand">
              {trust}
            </span>{" "}
            · trip wish
          </p>
        </div>
        <Plane className="h-4 w-4 text-warning" />
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">{city}</p>
      <p className="text-xs text-muted-foreground">{dates}</p>
      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {body}
      </p>
      <button className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-border bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card/60">
        Offer a place
      </button>
    </article>
  );
}

function HostOfferCard({
  name,
  avatar,
  listing,
  city,
  dates,
  price,
  photo,
  trust,
}: {
  name: string;
  avatar: string;
  listing: string;
  city: string;
  dates: string;
  price: number;
  photo: string;
  trust: string;
}) {
  return (
    <article className="w-[320px] shrink-0 overflow-hidden rounded-2xl border border-border bg-card/40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo} alt={listing} className="aspect-[4/3] w-full object-cover" />
      <div className="p-4">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatar}
            alt={name}
            className="h-7 w-7 rounded-full object-cover"
          />
          <p className="text-xs font-semibold text-foreground">{name}</p>
          <span className="rounded-full bg-brand/15 px-1.5 py-0 text-[9px] font-semibold text-brand">
            {trust}
          </span>
          <HomeIcon className="ml-auto h-3.5 w-3.5 text-brand" />
        </div>
        <h3 className="mt-2 text-sm font-semibold text-foreground">{listing}</h3>
        <p className="text-[11px] text-muted-foreground">{city}</p>
        <p className="mt-1 text-xs text-foreground">
          <span className="font-semibold">{dates}</span>
          <span className="text-muted-foreground"> · ${price}/night</span>
        </p>
      </div>
    </article>
  );
}

function ListingCard({
  title,
  city,
  price,
  host,
  trust,
  photo,
}: {
  title: string;
  city: string;
  price: number;
  host: string;
  trust: string;
  photo: string;
}) {
  return (
    <article className="w-[260px] shrink-0">
      <div className="relative overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt={title} className="aspect-[4/3] w-full object-cover" />
        <span className="absolute left-3 top-3 rounded-full border border-brand/40 bg-background/80 px-2 py-0.5 text-[10px] font-semibold text-brand backdrop-blur">
          {trust}
        </span>
      </div>
      <h3 className="mt-3 truncate text-sm font-semibold text-foreground">
        {title}
      </h3>
      <p className="truncate text-[11px] text-muted-foreground">{city}</p>
      <p className="mt-0.5 text-xs text-foreground">
        <span className="font-semibold">${price}</span>
        <span className="text-muted-foreground"> / night · {host}</span>
      </p>
    </article>
  );
}

function PersonCard({
  name,
  avatar,
  relation,
  mutual,
  lastSeen,
}: {
  name: string;
  avatar: string;
  relation: string;
  mutual: number;
  lastSeen: string;
}) {
  return (
    <article className="flex w-[300px] shrink-0 flex-col gap-3 rounded-2xl border border-border bg-card/40 p-4">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatar}
          alt={name}
          className="h-12 w-12 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {relation}
          </p>
          <p className="text-[10px] text-subtle">
            {mutual} mutual · {lastSeen}
          </p>
        </div>
      </div>
      <button className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
        <ShieldCheck className="h-3.5 w-3.5" />
        Vouch for {name.split(" ")[0]}
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
      .marquee-right {
        animation: marquee-right 60s linear infinite;
      }
      .marquee-left {
        animation: marquee-left 60s linear infinite;
      }
      .marquee-right:hover,
      .marquee-left:hover {
        animation-play-state: paused;
      }
      @media (prefers-reduced-motion: reduce) {
        .marquee-right,
        .marquee-left {
          animation: none;
        }
      }
    `}</style>
  );
}
