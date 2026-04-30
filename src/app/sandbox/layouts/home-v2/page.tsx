// D3 LAYOUT SANDBOX — HOME V2 (magazine grid)
// ----------------------------------------------------------------
// Post-signup landing surface, variation 2. Editorial feel: hero
// "of the moment" feature card up top, three quick-action search
// cards (Stays / People / Vouches), then an asymmetric main column
// (Trip Wishes feed) + side rail (vouch activity, featured stays,
// host offers spotlight). All sample data inline.
// ----------------------------------------------------------------

import Link from "next/link";
import {
  Search,
  ShieldCheck,
  Plane,
  Home as HomeIcon,
  Users,
  Calendar,
  MapPin,
  ArrowUpRight,
} from "lucide-react";

export const runtime = "edge";

// ── Sample data ────────────────────────────────────────────────

const USER = { firstName: "Sample" };

const FEATURED = {
  kind: "Host Offer",
  author: "Maya R.",
  authorAvatar: "https://picsum.photos/seed/maya-r/120/120",
  trust: "1° via Erin",
  city: "Park Slope, Brooklyn",
  dates: "Jul 04 → 08",
  title: "Garden floor open over July 4th — friends-of-friends only",
  body:
    "We're heading upstate for the long weekend. Garden floor is yours if you're in the network. Couple or solo, $145/night.",
  photo: "https://picsum.photos/seed/brklyn-1-hero/1600/700",
  price: 145,
};

const TRIP_WISHES = [
  { name: "Erin Q.", avatar: "https://picsum.photos/seed/erin-q/80/80", city: "Brooklyn, NY", dates: "Jun 14 → 20", body: "Looking for a quiet 1-bed for a week of writing.", trust: "1°", responses: 2 },
  { name: "Theo L.", avatar: "https://picsum.photos/seed/theo-l/80/80", city: "Anywhere coastal", dates: "Late Sep", body: "Family-of-4, kids school-age. 5–7 nights.", trust: "2°", responses: 6 },
  { name: "Dev S.", avatar: "https://picsum.photos/seed/dev-s/80/80", city: "Mexico City", dates: "Aug 10 → 24", body: "Two weeks remote-working. Roma Norte / Condesa preferred.", trust: "1°", responses: 1 },
  { name: "Cass W.", avatar: "https://picsum.photos/seed/cass-w/80/80", city: "Barcelona", dates: "Sep 18 → 24", body: "Solo trip, want quiet apartment in Gracia.", trust: "2°", responses: 0 },
  { name: "Aliyah J.", avatar: "https://picsum.photos/seed/aliyah-j/80/80", city: "Lisbon", dates: "Oct 02 → 09", body: "First time in Portugal, open to neighborhoods near the river.", trust: "2°", responses: 3 },
];

const FEATURED_STAYS = [
  { title: "East-side bungalow with backyard", city: "East Austin", price: 165, host: "Dev S.", trust: "1°", photo: "https://picsum.photos/seed/austin-1/600/450" },
  { title: "Mission flat with bay window", city: "San Francisco", price: 220, host: "Priya K.", trust: "2°", photo: "https://picsum.photos/seed/sf-1/600/450" },
  { title: "Roma Norte courtyard apartment", city: "CDMX", price: 95, host: "Diego M.", trust: "2°", photo: "https://picsum.photos/seed/cdmx-1/600/450" },
];

const HOST_OFFERS_MINI = [
  { name: "Diego M.", listing: "Roma Norte courtyard", dates: "Sep 02 → 16", price: 95, trust: "2°" },
  { name: "Jonas T.", listing: "South Congress casita", dates: "Aug 18 → 25", price: 130, trust: "2°" },
  { name: "Sofía A.", listing: "Condesa walk-up + terrace", dates: "Oct 10 → 17", price: 110, trust: "2°" },
];

const VOUCH_NUDGES = [
  { name: "Maya R.", note: "vouched for you 2 days ago", actionable: true },
  { name: "Priya K.", note: "vouched for you 1 week ago", actionable: true },
  { name: "Erin Q.", note: "stayed with you in Mar — you haven't vouched yet", actionable: true },
];

// ── Page ───────────────────────────────────────────────────────

export default function HomeV2() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 md:px-6 lg:px-10">
      {/* Greeting */}
      <p className="text-sm text-muted-foreground">
        Welcome back, {USER.firstName}.
      </p>
      <h1 className="mt-1 font-serif text-4xl text-foreground md:text-5xl">
        What&rsquo;s happening in your network
      </h1>

      {/* Three quick-action search cards */}
      <section className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
        <SearchCard
          icon={HomeIcon}
          label="Find a stay"
          placeholder="Anywhere · Any week · Add guests"
          accent
        />
        <SearchCard
          icon={Users}
          label="Find a person"
          placeholder="Name, city, or interest"
        />
        <SearchCard
          icon={ShieldCheck}
          label="Vouch for someone"
          placeholder="Search by name or contact"
        />
      </section>

      {/* Featured hero */}
      <section className="mt-10 overflow-hidden rounded-3xl border border-border bg-card/40">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={FEATURED.photo}
              alt={FEATURED.title}
              className="aspect-[16/10] h-full w-full object-cover lg:aspect-auto"
            />
            <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-warning/95 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-black">
              <HomeIcon className="h-3 w-3" />
              {FEATURED.kind} · Featured
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
                <p className="text-sm font-semibold text-foreground">
                  {FEATURED.author}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  <span className="rounded-full bg-brand/15 px-1.5 py-0 text-[9px] font-semibold text-brand">
                    {FEATURED.trust.split(" ")[0]}
                  </span>{" "}
                  · {FEATURED.trust.replace(/^[^ ]+ /, "")}
                </p>
              </div>
            </div>
            <h2 className="font-serif text-3xl text-foreground md:text-4xl">
              {FEATURED.title}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {FEATURED.city}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {FEATURED.dates}
              </span>
              <span>·</span>
              <span>
                <span className="font-semibold text-foreground">
                  ${FEATURED.price}
                </span>{" "}
                / night
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {FEATURED.body}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                Request to book
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/40 px-5 py-2.5 text-sm font-medium text-foreground hover:bg-card/60">
                Save
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Asymmetric body grid */}
      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
        {/* Trip Wishes feed */}
        <section>
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground md:text-xl">
                Trip Wishes from your network
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
                Members looking for a place to stay
              </p>
            </div>
            <Link
              href="/sandbox/layouts/proposals"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              See all →
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {TRIP_WISHES.map((t, i) => (
              <li
                key={i}
                className="rounded-2xl border border-border bg-card/40 p-5"
              >
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {t.name}{" "}
                      <span className="ml-1 inline-flex rounded-full bg-brand/15 px-1.5 py-0 text-[9px] font-semibold text-brand">
                        {t.trust}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      <Plane className="mr-0.5 inline h-2.5 w-2.5" />
                      Trip Wish
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-muted-foreground">
                    {t.responses} response{t.responses === 1 ? "" : "s"}
                  </div>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-foreground md:text-base">
                  {t.body}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {t.city}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {t.dates}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                    Offer a place
                  </button>
                  <button className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card/60">
                    Save
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Side rail */}
        <aside className="space-y-6">
          {/* Vouch nudges */}
          <section className="rounded-2xl border border-brand/30 bg-brand/10 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-brand">
              Vouch nudges
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
          </section>

          {/* Featured listings */}
          <section className="rounded-2xl border border-border bg-card/40 p-5">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Featured stays
              </h3>
              <Link
                href="/sandbox/layouts/browse"
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Browse all →
              </Link>
            </div>
            <ul className="mt-3 space-y-3">
              {FEATURED_STAYS.map((s, i) => (
                <li key={i} className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.photo}
                    alt={s.title}
                    className="h-16 w-20 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-xs font-semibold text-foreground">
                      {s.title}
                    </h4>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {s.city}
                    </p>
                    <p className="mt-0.5 text-[11px] text-foreground">
                      <span className="font-semibold">${s.price}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        / night ·{" "}
                      </span>
                      <span className="rounded-full bg-brand/15 px-1.5 py-0 text-[9px] font-semibold text-brand">
                        {s.trust}
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Host offers spotlight */}
          <section className="rounded-2xl border border-border bg-card/40 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Host Offers spotlight
            </h3>
            <ul className="mt-3 space-y-2">
              {HOST_OFFERS_MINI.map((h, i) => (
                <li
                  key={i}
                  className="border-t border-border/60 pt-2 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-foreground">
                      {h.name}{" "}
                      <span className="rounded-full bg-brand/15 px-1.5 py-0 text-[9px] font-semibold text-brand">
                        {h.trust}
                      </span>
                    </p>
                    <p className="text-[11px] text-foreground">
                      <span className="font-semibold">${h.price}</span>
                      <span className="text-muted-foreground"> /night</span>
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {h.listing}
                  </p>
                  <p className="text-[10px] text-subtle">{h.dates}</p>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function SearchCard({
  icon: Icon,
  label,
  placeholder,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  placeholder: string;
  accent?: boolean;
}) {
  return (
    <button
      className={
        accent
          ? "group flex flex-col gap-3 rounded-2xl border border-brand bg-brand p-5 text-left text-brand-foreground hover:bg-brand-300"
          : "group flex flex-col gap-3 rounded-2xl border border-border bg-card/40 p-5 text-left text-foreground hover:border-brand/40 hover:bg-card/60"
      }
    >
      <div
        className={
          accent
            ? "flex h-9 w-9 items-center justify-center rounded-lg bg-background/20"
            : "flex h-9 w-9 items-center justify-center rounded-lg bg-brand/15 text-brand"
        }
      >
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-base font-semibold">{label}</p>
      <div
        className={
          accent
            ? "flex items-center gap-2 rounded-lg border border-background/20 bg-background/10 px-3 py-2 text-xs"
            : "flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-xs text-muted-foreground"
        }
      >
        <Search className="h-3 w-3" />
        {placeholder}
      </div>
    </button>
  );
}
