// D3 LAYOUT SANDBOX — PROPOSALS (replica of /proposals)
// ----------------------------------------------------------------
// Trip Wishes + Host Offers feed scoped to network. Filter tabs
// (All / Trip Wishes / Host Offers), search bar, action buttons,
// proposal cards with author + dates + city + body.
// ----------------------------------------------------------------

import Link from "next/link";
import {
  BellRing,
  Plus,
  Search,
  MapPin,
  Calendar,
  Home,
  Plane,
} from "lucide-react";

export const runtime = "edge";

const TABS = ["All", "Trip Wishes", "Host Offers"] as const;

type Proposal = {
  id: string;
  kind: "trip_wish" | "host_offer";
  author: string;
  authorAvatar: string;
  authorTrust: string;
  city: string;
  dates: string;
  title: string;
  body: string;
  ago: string;
  responses: number;
};

const PROPOSALS: Proposal[] = [
  {
    id: "1",
    kind: "trip_wish",
    author: "Erin Q.",
    authorAvatar: "https://picsum.photos/seed/erin-q/80/80",
    authorTrust: "1°",
    city: "Brooklyn, NY",
    dates: "Jun 14 → 20 (6 nights)",
    title: "Looking for a quiet 1-bed in Brooklyn for a week of writing",
    body: "Working on a deadline, need somewhere I can settle in. Bonus if there's a desk or kitchen table I can claim. Solo, no pets, no late nights.",
    ago: "2 days ago",
    responses: 2,
  },
  {
    id: "2",
    kind: "host_offer",
    author: "Maya R.",
    authorAvatar: "https://picsum.photos/seed/maya-r/80/80",
    authorTrust: "1°",
    city: "Park Slope, Brooklyn",
    dates: "Jul 04 → 08 (4 nights)",
    title: "Garden floor open over July 4th — friends-of-friends only",
    body: "We're heading upstate for the long weekend. Garden floor is yours if you're in the network. Couple or solo preferred, $145/night.",
    ago: "5 days ago",
    responses: 4,
  },
  {
    id: "3",
    kind: "trip_wish",
    author: "Dev S.",
    authorAvatar: "https://picsum.photos/seed/dev-s/80/80",
    authorTrust: "2°",
    city: "Mexico City, MX",
    dates: "Aug 10 → 24 (2 weeks)",
    title: "Two weeks in CDMX — Roma Norte / Condesa preferred",
    body: "Working remotely. Need wifi that won't quit. Open to a few different places stitched together if anyone has shorter windows.",
    ago: "1 week ago",
    responses: 1,
  },
  {
    id: "4",
    kind: "host_offer",
    author: "Diego M.",
    authorAvatar: "https://picsum.photos/seed/diego-m/80/80",
    authorTrust: "2°",
    city: "Roma Norte, CDMX",
    dates: "Sep 02 → 16 (2 weeks)",
    title: "Courtyard apartment open in September",
    body: "Heading to Oaxaca for two weeks. Looking for a calm guest who'll water the plants and not throw any parties. $95/night.",
    ago: "1 week ago",
    responses: 3,
  },
  {
    id: "5",
    kind: "trip_wish",
    author: "Theo L.",
    authorAvatar: "https://picsum.photos/seed/theo-l/80/80",
    authorTrust: "2°",
    city: "Anywhere coastal",
    dates: "Late September",
    title: "Family-of-4 looking for a coastal stay, 5–7 nights",
    body: "Two kids, both school-age. Easy to travel, easy to clean up after. Open to suggestions on location — coastal Maine, Outer Banks, somewhere on the Gulf.",
    ago: "2 weeks ago",
    responses: 6,
  },
];

export default function ProposalsPage() {
  return (
    <div className="mx-auto w-full max-w-[960px] px-4 py-6 md:px-6 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
            Proposals in your network
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Trip Wishes and Host Offers from people you can see — bounded by
            each post&apos;s preview network.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-card/40 px-4 text-sm font-semibold text-foreground hover:bg-card/60">
            <BellRing className="h-4 w-4" />
            Alerts
          </button>
          <button className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90">
            <Plus className="h-4 w-4" />
            Create
          </button>
        </div>
      </div>

      {/* Tabs + search */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t, i) => (
            <button
              key={t}
              className={
                i === 0
                  ? "inline-flex h-10 items-center rounded-full bg-foreground px-4 text-sm font-semibold text-background"
                  : "inline-flex h-10 items-center rounded-full border border-border bg-card/40 px-4 text-sm font-medium text-foreground hover:bg-card/60"
              }
            >
              {t}
            </button>
          ))}
        </div>
        <div className="ml-auto flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-border bg-card/40 px-3 md:max-w-[320px]">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Search title, city, dates…
          </span>
        </div>
      </div>

      {/* Feed */}
      <ul className="mt-6 space-y-4">
        {PROPOSALS.map((p) => (
          <li
            key={p.id}
            className="rounded-2xl border border-border bg-card/40 p-5"
          >
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.authorAvatar}
                alt={p.author}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {p.author}{" "}
                  <span className="ml-1 inline-flex rounded-full border border-brand/30 bg-brand/10 px-1.5 py-0 text-[10px] font-semibold text-brand">
                    {p.authorTrust}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">{p.ago}</p>
              </div>
              <span
                className={
                  p.kind === "trip_wish"
                    ? "inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning"
                    : "inline-flex items-center gap-1 rounded-full bg-brand/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand"
                }
              >
                {p.kind === "trip_wish" ? (
                  <>
                    <Plane className="h-3 w-3" /> Trip Wish
                  </>
                ) : (
                  <>
                    <Home className="h-3 w-3" /> Host Offer
                  </>
                )}
              </span>
            </div>

            <h2 className="mt-3 text-base font-semibold text-foreground md:text-lg">
              {p.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {p.city}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {p.dates}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground">
              {p.body}
            </p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-subtle">
                {p.responses} response{p.responses === 1 ? "" : "s"}
              </span>
              <div className="flex items-center gap-2">
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card/60">
                  Save
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                  {p.kind === "trip_wish" ? "Offer a place" : "Request to book"}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
