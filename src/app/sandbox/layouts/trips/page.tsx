// D3 LAYOUT SANDBOX — TRIPS (replica of /dashboard?tab=traveling)
// ----------------------------------------------------------------
// Tabbed list of upcoming, completed, cancelled stays as guest. Each
// row: dates, host, listing, status badge, action button.
// ----------------------------------------------------------------

import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  MessageCircle,
  Star,
  X,
} from "lucide-react";

export const runtime = "edge";

const TABS = ["Upcoming", "Completed", "Cancelled"] as const;

const UPCOMING = [
  {
    listing: "Sunlit brownstone garden floor",
    area: "Park Slope, Brooklyn",
    host: "Maya R.",
    avatar: "https://picsum.photos/seed/maya-r/80/80",
    dates: "May 14 → 16 (in 12 days)",
    status: "Confirmed",
    photo: "https://picsum.photos/seed/brklyn-1/600/400",
  },
  {
    listing: "Roma Norte courtyard apartment",
    area: "Roma Norte, CDMX",
    host: "Diego M.",
    avatar: "https://picsum.photos/seed/diego-m/80/80",
    dates: "Jun 02 → 07",
    status: "Pending host reply",
    photo: "https://picsum.photos/seed/cdmx-1/600/400",
  },
];

const COMPLETED = [
  {
    listing: "South Congress casita",
    area: "South Congress, Austin",
    host: "Jonas T.",
    avatar: "https://picsum.photos/seed/jonas-t/80/80",
    dates: "Mar 22 → 25",
    status: "Completed",
    rated: false,
    photo: "https://picsum.photos/seed/austin-2/600/400",
  },
  {
    listing: "Castro Victorian guest suite",
    area: "Castro, San Francisco",
    host: "Renata V.",
    avatar: "https://picsum.photos/seed/renata-v/80/80",
    dates: "Feb 10 → 13",
    status: "Completed",
    rated: true,
    photo: "https://picsum.photos/seed/sf-2/600/400",
  },
];

export default function TripsPage() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 md:px-6 md:py-10">
      <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
        Your trips
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Stays you&rsquo;ve booked or proposed.
      </p>

      {/* Tabs */}
      <div className="mt-6 flex gap-2 border-b border-border/60 pb-3">
        {TABS.map((t, i) => (
          <button
            key={t}
            className={
              i === 0
                ? "rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background"
                : "rounded-full border border-border bg-card/40 px-4 py-1.5 text-xs font-medium text-foreground hover:bg-card/60"
            }
          >
            {t}{" "}
            {i === 0
              ? `(${UPCOMING.length})`
              : i === 1
                ? `(${COMPLETED.length})`
                : "(0)"}
          </button>
        ))}
      </div>

      {/* Upcoming */}
      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Upcoming
        </h2>
        <ul className="mt-3 space-y-3">
          {UPCOMING.map((t) => (
            <li
              key={t.listing + t.dates}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-card/40 p-4 md:flex-row md:items-stretch md:p-5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.photo}
                alt={t.listing}
                className="aspect-[3/2] w-full rounded-xl object-cover md:w-56 md:shrink-0"
              />
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {t.listing}
                    </h3>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {t.area}
                    </p>
                  </div>
                  <span
                    className={
                      t.status === "Confirmed"
                        ? "shrink-0 rounded-full bg-success/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success"
                        : "shrink-0 rounded-full bg-warning/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning"
                    }
                  >
                    {t.status}
                  </span>
                </div>
                <div className="mt-3 inline-flex items-center gap-2 text-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.avatar}
                    alt={t.host}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                  <span className="text-foreground">Hosted by {t.host}</span>
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 text-sm text-foreground">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  {t.dates}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card/60">
                    <MessageCircle className="h-3.5 w-3.5" />
                    Message host
                  </button>
                  <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card/60">
                    View details
                  </button>
                  {t.status === "Pending host reply" && (
                    <button className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20">
                      <X className="h-3.5 w-3.5" />
                      Cancel proposal
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Completed */}
      <section className="mt-12">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Completed
        </h2>
        <ul className="mt-3 space-y-3">
          {COMPLETED.map((t) => (
            <li
              key={t.listing + t.dates}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-card/40 p-4 md:flex-row md:items-stretch md:p-5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.photo}
                alt={t.listing}
                className="aspect-[3/2] w-full rounded-xl object-cover md:w-56 md:shrink-0"
              />
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {t.listing}
                    </h3>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {t.area}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.status}
                  </span>
                </div>
                <div className="mt-3 inline-flex items-center gap-2 text-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.avatar}
                    alt={t.host}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                  <span className="text-foreground">Hosted by {t.host}</span>
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 text-sm text-foreground">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  {t.dates}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {t.rated ? (
                    <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card/60">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      Review submitted
                    </button>
                  ) : (
                    <button className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:bg-foreground/90">
                      <Star className="h-3.5 w-3.5" />
                      Leave a review
                    </button>
                  )}
                  <Link
                    href={`/sandbox/layouts/profile`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card/60"
                  >
                    Vouch for {t.host.split(" ")[0]}
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
