// D3 LAYOUT SANDBOX — BROWSE (replica of /browse)
// ----------------------------------------------------------------
// Mirrors the current /browse layout: search pill + filter sheet on
// desktop nav, mobile sticky search, "Stays" heading + sort, then a
// 4-col grid of listing cards with trust pill, save heart, photo
// (4:3), price/title/host. Sample data inline; no DB calls.
// ----------------------------------------------------------------

import Link from "next/link";
import { Heart, Search, SlidersHorizontal } from "lucide-react";

export const runtime = "edge";

type Listing = {
  id: string;
  photo: string;
  city: string;
  title: string;
  price: number;
  beds: string;
  host: string;
  trust: { label: string; degree: 1 | 2 | 3 };
  locked?: boolean;
};

const LISTINGS: Listing[] = [
  {
    id: "1",
    photo: "https://picsum.photos/seed/brklyn-1/800/600",
    city: "Park Slope, Brooklyn",
    title: "Sunlit brownstone garden floor",
    price: 145,
    beds: "2 beds · 1 bath",
    host: "Maya R.",
    trust: { label: "1°", degree: 1 },
  },
  {
    id: "2",
    photo: "https://picsum.photos/seed/austin-1/800/600",
    city: "East Austin",
    title: "East-side bungalow with backyard",
    price: 165,
    beds: "1 bed · 1 bath",
    host: "Dev S.",
    trust: { label: "1°", degree: 1 },
  },
  {
    id: "3",
    photo: "https://picsum.photos/seed/sf-1/800/600",
    city: "Mission, San Francisco",
    title: "Mission flat with bay window",
    price: 220,
    beds: "1 bed · 1 bath",
    host: "Priya K.",
    trust: { label: "2°", degree: 2 },
  },
  {
    id: "4",
    photo: "https://picsum.photos/seed/cdmx-1/800/600",
    city: "Roma Norte, CDMX",
    title: "Roma Norte courtyard apartment",
    price: 95,
    beds: "1 bed · 1 bath",
    host: "Diego M.",
    trust: { label: "2°", degree: 2 },
  },
  {
    id: "5",
    photo: "https://picsum.photos/seed/brklyn-2/800/600",
    city: "Bed-Stuy, Brooklyn",
    title: "Bed-Stuy loft with private roof",
    price: 185,
    beds: "Studio · 1 bath",
    host: "Aliyah J.",
    trust: { label: "1°", degree: 1 },
  },
  {
    id: "6",
    photo: "https://picsum.photos/seed/austin-2/800/600",
    city: "South Congress, Austin",
    title: "South Congress casita",
    price: 130,
    beds: "1 bed · 1 bath",
    host: "Jonas T.",
    trust: { label: "2°", degree: 2 },
  },
  {
    id: "7",
    photo: "https://picsum.photos/seed/sf-2/800/600",
    city: "Castro, San Francisco",
    title: "Castro Victorian guest suite",
    price: 175,
    beds: "1 bed · 1 bath",
    host: "Renata V.",
    trust: { label: "3°", degree: 3 },
    locked: true,
  },
  {
    id: "8",
    photo: "https://picsum.photos/seed/cdmx-2/800/600",
    city: "Condesa, CDMX",
    title: "Condesa walk-up with terrace",
    price: 110,
    beds: "2 beds · 1 bath",
    host: "Sofía A.",
    trust: { label: "2°", degree: 2 },
  },
  {
    id: "9",
    photo: "https://picsum.photos/seed/sf-3/800/600",
    city: "Noe Valley, San Francisco",
    title: "Noe Valley garden cottage",
    price: 380,
    beds: "2 beds · 2 baths",
    host: "Theo L.",
    trust: { label: "2°", degree: 2 },
  },
  {
    id: "10",
    photo: "https://picsum.photos/seed/brklyn-3/800/600",
    city: "Greenpoint, Brooklyn",
    title: "Greenpoint waterfront studio",
    price: 155,
    beds: "Studio · 1 bath",
    host: "Erin Q.",
    trust: { label: "2°", degree: 2 },
  },
  {
    id: "11",
    photo: "https://picsum.photos/seed/austin-3/800/600",
    city: "Travis Heights, Austin",
    title: "Travis Heights cottage near the lake",
    price: 195,
    beds: "2 beds · 1 bath",
    host: "Cass W.",
    trust: { label: "3°", degree: 3 },
    locked: true,
  },
  {
    id: "12",
    photo: "https://picsum.photos/seed/cdmx-3/800/600",
    city: "Coyoacán, CDMX",
    title: "Coyoacán artist's loft",
    price: 130,
    beds: "1 bed · 1 bath",
    host: "Beatriz F.",
    trust: { label: "1°", degree: 1 },
  },
];

export default function BrowsePage() {
  return (
    <div className="w-full px-4 md:px-10 lg:px-20">
      {/* Top search row (mirrors NavCenterPortal placement on the live page) */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex h-12 min-w-[260px] flex-1 items-center gap-2 rounded-full border border-border bg-card/40 px-5 shadow-search">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Anywhere · Any week · Add guests
          </span>
        </div>
        <button
          type="button"
          className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-card/40 px-5 text-sm font-medium text-foreground hover:bg-card/60"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          <span className="rounded-full bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
            2
          </span>
        </button>
      </div>

      {/* Mobile-style sticky pill (always visible here for parity sketch) */}
      <div className="mt-3 flex h-12 items-center gap-2 rounded-full border border-border bg-card/40 px-5 md:hidden">
        <Search className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Start your search</span>
      </div>

      {/* Heading + sort */}
      <div className="mt-8 flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-3xl text-foreground md:text-4xl">
            Stays
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Showing {LISTINGS.length} homes hosted by people in your trust
            network.
          </p>
        </div>
        <button className="rounded-lg border border-border bg-card/40 px-3 py-2 text-xs font-medium text-foreground hover:bg-card/60">
          Sort: Trust ↓
        </button>
      </div>

      {/* Grid */}
      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {LISTINGS.map((l) => (
          <article key={l.id} className="group">
            <div className="relative overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={l.photo}
                alt={l.title}
                className={
                  l.locked
                    ? "aspect-[4/3] w-full object-cover opacity-60 transition-transform duration-300 group-hover:scale-[1.02]"
                    : "aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                }
              />
              <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-brand/40 bg-background/80 px-2.5 py-1 text-xs font-semibold text-brand backdrop-blur">
                {l.trust.label}
              </div>
              <button
                aria-label="Save"
                className="absolute right-3 top-3 rounded-full bg-background/80 p-2 text-foreground backdrop-blur transition-colors hover:text-brand"
              >
                <Heart className="h-4 w-4" />
              </button>
              {l.locked && (
                <div className="absolute inset-x-3 bottom-3 rounded-lg border border-border bg-background/85 px-3 py-2 text-[11px] text-foreground backdrop-blur">
                  Preview only · request an intro to see full details
                </div>
              )}
            </div>
            <div className="mt-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-foreground">
                  {l.title}
                </h3>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {l.city} · {l.beds}
                </p>
                <p className="mt-1 text-xs text-subtle">Hosted by {l.host}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-semibold text-foreground">
                  ${l.price}
                </p>
                <p className="text-xs text-muted-foreground">/ night</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
