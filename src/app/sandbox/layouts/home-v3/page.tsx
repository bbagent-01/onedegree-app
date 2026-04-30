// D3 LAYOUT SANDBOX — HOME V3 (personal feed timeline)
// ----------------------------------------------------------------
// Post-signup landing surface, variation 3. Single chronological
// feed mixing proposals, vouches, listings, and network activity in
// one stream. Smart single search with mode pills. Side rail with
// trust score, vouch nudges, your network at-a-glance, your
// listings shortcut. All sample data inline.
// ----------------------------------------------------------------

import Link from "next/link";
import {
  Search,
  ShieldCheck,
  Plane,
  Home as HomeIcon,
  Users,
  MapPin,
  Calendar,
  Heart,
  UserPlus,
  ArrowRight,
} from "lucide-react";

export const runtime = "edge";

// ── Sample data ────────────────────────────────────────────────

const USER = { firstName: "Sample", trustScore: 84, trustLabel: "Solid" };

type FeedItem =
  | {
      kind: "trip_wish";
      time: string;
      author: string;
      avatar: string;
      trust: string;
      city: string;
      dates: string;
      body: string;
    }
  | {
      kind: "host_offer";
      time: string;
      author: string;
      avatar: string;
      trust: string;
      listing: string;
      city: string;
      dates: string;
      price: number;
      photo: string;
    }
  | {
      kind: "vouch";
      time: string;
      from: string;
      avatar: string;
      direction: "received" | "given";
      target?: string;
    }
  | {
      kind: "listing";
      time: string;
      host: string;
      avatar: string;
      trust: string;
      title: string;
      city: string;
      price: number;
      photo: string;
    }
  | {
      kind: "joined";
      time: string;
      who: string;
      avatar: string;
      via: string;
    };

const FEED: FeedItem[] = [
  {
    kind: "vouch",
    time: "2 hours ago",
    from: "Maya R.",
    avatar: "https://picsum.photos/seed/maya-r/80/80",
    direction: "received",
  },
  {
    kind: "host_offer",
    time: "Yesterday",
    author: "Maya R.",
    avatar: "https://picsum.photos/seed/maya-r/80/80",
    trust: "1°",
    listing: "Garden floor open over July 4th",
    city: "Park Slope, Brooklyn",
    dates: "Jul 04 → 08",
    price: 145,
    photo: "https://picsum.photos/seed/brklyn-1/600/360",
  },
  {
    kind: "trip_wish",
    time: "2 days ago",
    author: "Erin Q.",
    avatar: "https://picsum.photos/seed/erin-q/80/80",
    trust: "1°",
    city: "Brooklyn, NY",
    dates: "Jun 14 → 20",
    body: "Looking for a quiet 1-bed for a week of writing. Bonus if there's a desk.",
  },
  {
    kind: "joined",
    time: "3 days ago",
    who: "Beatriz F.",
    avatar: "https://picsum.photos/seed/bea-f/80/80",
    via: "vouched in by Sofía A.",
  },
  {
    kind: "listing",
    time: "4 days ago",
    host: "Aliyah J.",
    avatar: "https://picsum.photos/seed/aliyah-j/80/80",
    trust: "1°",
    title: "Bed-Stuy loft with private roof",
    city: "Brooklyn, NY",
    price: 185,
    photo: "https://picsum.photos/seed/brklyn-2/600/360",
  },
  {
    kind: "vouch",
    time: "5 days ago",
    from: "You",
    avatar: "https://picsum.photos/seed/sample-user/80/80",
    direction: "given",
    target: "Erin Q.",
  },
  {
    kind: "trip_wish",
    time: "1 week ago",
    author: "Dev S.",
    avatar: "https://picsum.photos/seed/dev-s/80/80",
    trust: "1°",
    city: "Mexico City",
    dates: "Aug 10 → 24",
    body: "Two weeks remote-working. Roma Norte / Condesa preferred.",
  },
  {
    kind: "host_offer",
    time: "1 week ago",
    author: "Diego M.",
    avatar: "https://picsum.photos/seed/diego-m/80/80",
    trust: "2°",
    listing: "Roma Norte courtyard apartment",
    city: "CDMX",
    dates: "Sep 02 → 16",
    price: 95,
    photo: "https://picsum.photos/seed/cdmx-1/600/360",
  },
  {
    kind: "vouch",
    time: "1 week ago",
    from: "Priya K.",
    avatar: "https://picsum.photos/seed/priya-k/80/80",
    direction: "received",
  },
];

const NETWORK_GLANCE = {
  vouchesReceived: 11,
  vouchesGiven: 18,
  oneDegree: 9,
  twoDegree: 47,
};

const VOUCH_NUDGES = [
  { name: "Maya R.", note: "vouched for you 2d ago", actionable: true },
  { name: "Priya K.", note: "vouched for you 1w ago", actionable: true },
];

const MY_LISTINGS = [
  { title: "Sunlit brownstone garden floor", status: "Live", price: 145 },
];

// ── Page ───────────────────────────────────────────────────────

export default function HomeV3() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 md:px-6 lg:px-10">
      {/* Greeting + smart search */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Welcome back, {USER.firstName}.
            </p>
            <h1 className="mt-1 font-serif text-4xl text-foreground md:text-5xl">
              Your Trustead.
            </h1>
          </div>
          <div className="inline-flex items-center gap-3 rounded-2xl border border-brand/30 bg-brand/10 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-sm font-bold text-brand-foreground">
              {USER.trustScore}
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-brand">
                Trust score
              </p>
              <p className="text-sm font-semibold text-foreground">
                {USER.trustLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Smart search */}
        <div className="mt-6 flex w-full max-w-[680px] flex-col gap-2">
          <div className="flex h-14 items-center gap-3 rounded-2xl border border-border bg-card/40 px-5 shadow-search">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-base text-muted-foreground">
              Search anything — a place, a person, a city…
            </span>
            <button className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
              Search
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 px-1">
            <ModePill icon={HomeIcon} label="Stays" active />
            <ModePill icon={Plane} label="Trip wishes" />
            <ModePill icon={Users} label="People" />
            <ModePill icon={ShieldCheck} label="Vouches" />
          </div>
        </div>
      </section>

      {/* Two-column body */}
      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Feed */}
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-foreground md:text-xl">
              Activity in your network
            </h2>
            <div className="flex gap-1.5">
              <FilterChip label="All" active />
              <FilterChip label="Proposals" />
              <FilterChip label="Vouches" />
              <FilterChip label="Listings" />
            </div>
          </div>
          <ul className="mt-5 space-y-4">
            {FEED.map((item, i) => (
              <li key={i}>
                <FeedItemRow item={item} />
              </li>
            ))}
          </ul>
        </section>

        {/* Side rail */}
        <aside className="space-y-6">
          {/* Vouch nudges */}
          <section className="rounded-2xl border border-brand/30 bg-brand/10 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-brand">
              Vouch back
            </h3>
            <ul className="mt-3 space-y-2">
              {VOUCH_NUDGES.map((n, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-border bg-background/40 p-3"
                >
                  <p className="text-xs text-foreground">
                    <span className="font-semibold">{n.name}</span> {n.note}
                  </p>
                  <button className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90">
                    <ShieldCheck className="h-3 w-3" />
                    Vouch back
                  </button>
                </li>
              ))}
            </ul>
            <Link
              href="/sandbox/layouts/vouch"
              className="mt-3 inline-flex items-center gap-1 text-[11px] text-foreground hover:underline"
            >
              <UserPlus className="h-3 w-3" />
              Vouch for someone new
            </Link>
          </section>

          {/* Network at a glance */}
          <section className="rounded-2xl border border-border bg-card/40 p-5">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Your network
              </h3>
              <Link
                href="/sandbox/layouts/network"
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                See all →
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Stat label="1° connections" value={NETWORK_GLANCE.oneDegree} />
              <Stat label="2° reach" value={NETWORK_GLANCE.twoDegree} />
              <Stat
                label="Vouches given"
                value={NETWORK_GLANCE.vouchesGiven}
              />
              <Stat
                label="Vouches received"
                value={NETWORK_GLANCE.vouchesReceived}
              />
            </div>
          </section>

          {/* Your listings shortcut */}
          <section className="rounded-2xl border border-border bg-card/40 p-5">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Your listings
              </h3>
              <Link
                href="/sandbox/layouts/dashboard"
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Manage →
              </Link>
            </div>
            <ul className="mt-3 space-y-2">
              {MY_LISTINGS.map((l) => (
                <li
                  key={l.title}
                  className="rounded-xl border border-border bg-background/40 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground">
                      {l.title}
                    </p>
                    <span className="rounded-full bg-success/15 px-2 py-0 text-[9px] font-semibold uppercase tracking-wider text-success">
                      {l.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    ${l.price}/night · 2 upcoming reservations
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

// ── Feed item rendering ────────────────────────────────────────

function FeedItemRow({ item }: { item: FeedItem }) {
  if (item.kind === "vouch") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand/5 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{item.from}</span>{" "}
            {item.direction === "received"
              ? "vouched for you"
              : `vouched for ${item.target}`}
          </p>
          <p className="text-[11px] text-subtle">{item.time}</p>
        </div>
        {item.direction === "received" && (
          <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
            Vouch back
          </button>
        )}
      </div>
    );
  }

  if (item.kind === "joined") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-card/40 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.avatar}
          alt={item.who}
          className="h-9 w-9 shrink-0 rounded-full object-cover"
        />
        <div className="flex-1">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{item.who}</span> joined Trustead
          </p>
          <p className="text-[11px] text-muted-foreground">{item.via}</p>
          <p className="text-[10px] text-subtle">{item.time}</p>
        </div>
        <button className="rounded-lg border border-border bg-card/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card/60">
          Say hi
        </button>
      </div>
    );
  }

  if (item.kind === "trip_wish") {
    return (
      <div className="rounded-2xl border border-border bg-card/40 p-5">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.avatar}
            alt={item.author}
            className="h-9 w-9 rounded-full object-cover"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              {item.author}{" "}
              <span className="rounded-full bg-brand/15 px-1.5 py-0 text-[9px] font-semibold text-brand">
                {item.trust}
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              <Plane className="mr-0.5 inline h-2.5 w-2.5" />
              Trip Wish · {item.time}
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm text-foreground">{item.body}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {item.city}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {item.dates}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
            Offer a place
          </button>
          <button className="rounded-lg border border-border bg-card/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card/60">
            Save
          </button>
        </div>
      </div>
    );
  }

  if (item.kind === "host_offer") {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-card/40">
        <div className="flex flex-col gap-0 md:flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.photo}
            alt={item.listing}
            className="aspect-[3/2] w-full object-cover md:w-56 md:shrink-0"
          />
          <div className="flex-1 p-5">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.avatar}
                alt={item.author}
                className="h-9 w-9 rounded-full object-cover"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {item.author}{" "}
                  <span className="rounded-full bg-brand/15 px-1.5 py-0 text-[9px] font-semibold text-brand">
                    {item.trust}
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  <HomeIcon className="mr-0.5 inline h-2.5 w-2.5" />
                  Host Offer · {item.time}
                </p>
              </div>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-foreground md:text-base">
              {item.listing}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {item.city}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {item.dates}
              </span>
              <span className="text-foreground">
                <span className="font-semibold">${item.price}</span>
                /night
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                Request to book
              </button>
              <button className="rounded-lg border border-border bg-card/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card/60">
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // listing
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/40">
      <div className="flex flex-col gap-0 md:flex-row">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.photo}
          alt={item.title}
          className="aspect-[3/2] w-full object-cover md:w-56 md:shrink-0"
        />
        <div className="flex-1 p-5">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.avatar}
              alt={item.host}
              className="h-9 w-9 rounded-full object-cover"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                {item.host}{" "}
                <span className="rounded-full bg-brand/15 px-1.5 py-0 text-[9px] font-semibold text-brand">
                  {item.trust}
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Posted a new listing · {item.time}
              </p>
            </div>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-foreground md:text-base">
            {item.title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {item.city}
            </span>
            <span className="text-foreground">
              <span className="font-semibold">${item.price}</span>
              /night
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
              View listing
            </button>
            <button className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card/60">
              <Heart className="h-3 w-3" />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────

function ModePill({
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
          ? "inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-0.5 text-[11px] font-semibold text-background"
          : "inline-flex items-center gap-1 rounded-full border border-border bg-card/40 px-3 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
      }
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

function FilterChip({
  label,
  active,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={
        active
          ? "rounded-full bg-foreground px-3 py-0.5 text-[11px] font-semibold text-background"
          : "rounded-full border border-border bg-card/40 px-3 py-0.5 text-[11px] font-medium text-foreground hover:bg-card/60"
      }
    >
      {label}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <p className="font-serif text-2xl text-foreground">{value}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
