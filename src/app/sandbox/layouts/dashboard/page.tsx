// D3 LAYOUT SANDBOX — DASHBOARD (replica of /dashboard)
// ----------------------------------------------------------------
// Mirrors the live dashboard: welcome heading, tabbed shell
// (Hosting / Traveling / Network / Proposals — all visible here for
// review), stats cards, reservations, listings, earnings sections.
// Sample data inline.
// ----------------------------------------------------------------

import Link from "next/link";
import { Plus, ArrowUpRight, CheckCircle2, Clock, Star } from "lucide-react";

export const runtime = "edge";

const USER = { firstName: "Sample" };

const TABS = ["Hosting", "Traveling", "Network", "Proposals"] as const;

const STATS = [
  { label: "Upcoming reservations", value: "2", sub: "1 awaiting confirmation" },
  { label: "Listings live", value: "1", sub: "Brooklyn brownstone" },
  { label: "Avg host rating", value: "4.9", sub: "from 18 reviews" },
  { label: "Earnings · 30d", value: "$1,420", sub: "1 stay · 6 nights" },
];

const UPCOMING_RES = [
  {
    guest: "Erin Q.",
    listing: "Sunlit brownstone garden floor",
    dates: "May 14 → 16",
    status: "Confirmed",
    nights: 2,
  },
  {
    guest: "Theo L.",
    listing: "Sunlit brownstone garden floor",
    dates: "Jun 02 → 06",
    status: "Awaiting your reply",
    nights: 4,
  },
];

const COMPLETED_RES = [
  {
    guest: "Aliyah J.",
    listing: "Sunlit brownstone garden floor",
    dates: "Mar 22 → 25",
    nights: 3,
  },
  {
    guest: "Dev S.",
    listing: "Sunlit brownstone garden floor",
    dates: "Feb 10 → 13",
    nights: 3,
  },
];

const LISTING = {
  title: "Sunlit brownstone garden floor",
  area: "Park Slope, Brooklyn",
  price: 145,
  status: "Live",
  rating: 4.91,
  reviews: 23,
  photo: "https://picsum.photos/seed/brklyn-1/600/400",
};

const EARNINGS = [
  { month: "Apr", value: 940 },
  { month: "Mar", value: 1190 },
  { month: "Feb", value: 720 },
  { month: "Jan", value: 480 },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 py-8 lg:px-10">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          Welcome back, {USER.firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your dashboard for hosting, traveling, and your trust network.
        </p>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-border/60 pb-3">
        {TABS.map((t, i) => (
          <button
            key={t}
            className={
              i === 0
                ? "rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background"
                : "rounded-full border border-border bg-card/40 px-4 py-1.5 text-xs font-medium text-foreground hover:bg-card/60"
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card/40 p-5"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {s.label}
            </p>
            <p className="mt-2 font-serif text-3xl text-foreground">
              {s.value}
            </p>
            <p className="mt-1 text-xs text-subtle">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Reservations */}
      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            Reservations
          </h2>
          <Link
            href="#"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            View all →
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Upcoming
          </p>
          {UPCOMING_RES.map((r) => (
            <ReservationRow key={r.guest + r.dates} {...r} />
          ))}

          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Completed
          </p>
          {COMPLETED_RES.map((r) => (
            <ReservationRow
              key={r.guest + r.dates}
              {...r}
              status="Completed"
              completed
            />
          ))}
        </div>
      </section>

      {/* Listings */}
      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            Your listings
          </h2>
          <Link
            href="#"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand-300"
          >
            <Plus className="h-3.5 w-3.5" />
            Create listing
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <article className="overflow-hidden rounded-2xl border border-border bg-card/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LISTING.photo}
              alt={LISTING.title}
              className="aspect-[3/2] w-full object-cover"
            />
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {LISTING.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {LISTING.area}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-success/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
                  {LISTING.status}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Star className="h-3 w-3 fill-current text-foreground" />
                  {LISTING.rating} · {LISTING.reviews} reviews
                </span>
                <span className="text-foreground">
                  <span className="font-semibold">${LISTING.price}</span>
                  <span className="text-muted-foreground"> / night</span>
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* Earnings */}
      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-foreground">Earnings</h2>
          <span className="text-xs text-muted-foreground">
            Last 4 months
          </span>
        </div>
        <div className="mt-4 rounded-2xl border border-border bg-card/40 p-5">
          <div className="flex items-end gap-3">
            {EARNINGS.map((m) => {
              const max = Math.max(...EARNINGS.map((e) => e.value));
              const h = (m.value / max) * 100;
              return (
                <div
                  key={m.month}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <div className="flex h-32 w-full items-end overflow-hidden rounded-md bg-background/40">
                    <div
                      className="w-full bg-brand"
                      style={{ height: `${h}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {m.month}
                  </p>
                  <p className="text-xs font-semibold text-foreground">
                    ${m.value}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Total · 4 months</span>
            <span className="inline-flex items-center gap-1 font-semibold text-success">
              ${EARNINGS.reduce((a, b) => a + b.value, 0).toLocaleString()}
              <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function ReservationRow({
  guest,
  listing,
  dates,
  nights,
  status,
  completed,
}: {
  guest: string;
  listing: string;
  dates: string;
  nights: number;
  status: string;
  completed?: boolean;
}) {
  const Icon = completed
    ? CheckCircle2
    : status === "Confirmed"
      ? CheckCircle2
      : Clock;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/40 p-4">
      <div className="flex items-start gap-3">
        <div
          className={
            completed
              ? "flex h-9 w-9 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground"
              : status === "Confirmed"
                ? "flex h-9 w-9 items-center justify-center rounded-lg bg-success/15 text-success"
                : "flex h-9 w-9 items-center justify-center rounded-lg bg-warning/15 text-warning"
          }
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {guest} · {nights} nights
          </h3>
          <p className="text-xs text-muted-foreground">
            {listing} · {dates}
          </p>
        </div>
      </div>
      <span
        className={
          completed
            ? "rounded-full bg-muted/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
            : status === "Confirmed"
              ? "rounded-full bg-success/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success"
              : "rounded-full bg-warning/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning"
        }
      >
        {status}
      </span>
    </div>
  );
}
