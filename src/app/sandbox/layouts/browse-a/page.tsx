// D3 LAYOUT SANDBOX — BROWSE / VARIANT A
// ----------------------------------------------------------------
// Large 4:3 cards in a 3-column grid · top filter bar · photo-
// forward.
//
// HARD RULE: NO new functionality. Every element (search, filter
// chips, listing cards with price/title/location, trust badge)
// already exists in the live app today. This is layout
// rearrangement + visual treatment only.
// ----------------------------------------------------------------

import Link from "next/link";

export const runtime = "edge";

const FILTERS = [
  "Any dates",
  "Any guests",
  "Price",
  "Property type",
  "Bedrooms",
  "Trust degree",
];

const LISTINGS = [
  {
    id: "1",
    photo: "https://picsum.photos/seed/brklyn-1/800/600",
    city: "Brooklyn, NY",
    title: "Sunlit brownstone garden floor",
    price: 145,
    nights: 2,
    beds: "2 beds · 1 bath",
    host: "Maya R.",
    trust: { degree: 2, label: "2°" },
  },
  {
    id: "2",
    photo: "https://picsum.photos/seed/austin-1/800/600",
    city: "Austin, TX",
    title: "East-side bungalow with backyard",
    price: 165,
    nights: 3,
    beds: "1 bed · 1 bath",
    host: "Dev S.",
    trust: { degree: 1, label: "1°" },
  },
  {
    id: "3",
    photo: "https://picsum.photos/seed/sf-1/800/600",
    city: "San Francisco, CA",
    title: "Mission flat with bay window",
    price: 220,
    nights: 4,
    beds: "1 bed · 1 bath",
    host: "Priya K.",
    trust: { degree: 2, label: "2°" },
  },
  {
    id: "4",
    photo: "https://picsum.photos/seed/cdmx-1/800/600",
    city: "Mexico City, MX",
    title: "Roma Norte courtyard apartment",
    price: 95,
    nights: 5,
    beds: "1 bed · 1 bath",
    host: "Diego M.",
    trust: { degree: 3, label: "3°" },
  },
  {
    id: "5",
    photo: "https://picsum.photos/seed/brklyn-2/800/600",
    city: "Brooklyn, NY",
    title: "Bed-Stuy loft with private roof",
    price: 185,
    nights: 2,
    beds: "Studio · 1 bath",
    host: "Aliyah J.",
    trust: { degree: 1, label: "1°" },
  },
  {
    id: "6",
    photo: "https://picsum.photos/seed/austin-2/800/600",
    city: "Austin, TX",
    title: "South Congress casita",
    price: 130,
    nights: 3,
    beds: "1 bed · 1 bath",
    host: "Jonas T.",
    trust: { degree: 2, label: "2°" },
  },
  {
    id: "7",
    photo: "https://picsum.photos/seed/sf-2/800/600",
    city: "San Francisco, CA",
    title: "Castro Victorian guest suite",
    price: 175,
    nights: 2,
    beds: "1 bed · 1 bath",
    host: "Renata V.",
    trust: { degree: 3, label: "3°" },
  },
  {
    id: "8",
    photo: "https://picsum.photos/seed/cdmx-2/800/600",
    city: "Mexico City, MX",
    title: "Condesa walk-up with terrace",
    price: 110,
    nights: 4,
    beds: "2 beds · 1 bath",
    host: "Sofía A.",
    trust: { degree: 2, label: "2°" },
  },
  {
    id: "9",
    photo: "https://picsum.photos/seed/sf-3/800/600",
    city: "San Francisco, CA",
    title: "Noe Valley garden cottage",
    price: 380,
    nights: 3,
    beds: "2 beds · 2 baths",
    host: "Theo L.",
    trust: { degree: 2, label: "2°" },
  },
];

export default function BrowseAPage() {
  return (
    <div className="w-full px-4 md:px-10 lg:px-20">
      <div className="mx-auto w-full max-w-[1400px] py-8">
        <SandboxBar />

        {/* Search + filters — top bar */}
        <div className="mt-6 rounded-2xl border border-border bg-card/40 p-3 shadow-search">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-xl border border-border bg-background/40 px-4 py-2.5">
              <span className="text-muted-foreground">⌕</span>
              <span className="text-sm text-muted-foreground">
                Anywhere · Any week · Add guests
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className="rounded-full border border-border bg-background/40 px-4 py-2 text-xs font-medium text-foreground hover:bg-card/60"
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Heading */}
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

        {/* Grid — 3-col, large 4:3 cards */}
        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {LISTINGS.map((l) => (
            <article key={l.id} className="group">
              <div className="relative overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={l.photo}
                  alt={l.title}
                  className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute left-3 top-3 rounded-full border border-brand/40 bg-background/80 px-2.5 py-1 text-xs font-semibold text-brand backdrop-blur">
                  {l.trust.label}
                </div>
                <button
                  aria-label="Save"
                  className="absolute right-3 top-3 rounded-full bg-background/80 p-2 text-foreground backdrop-blur"
                >
                  ♡
                </button>
              </div>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {l.title}
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
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
    </div>
  );
}

function SandboxBar() {
  return (
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-warning">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning" />
        Sample data — sandbox only
      </span>
      <Link
        href="/sandbox/layouts"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← All variants
      </Link>
    </div>
  );
}
