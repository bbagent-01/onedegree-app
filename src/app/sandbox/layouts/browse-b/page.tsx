// D3 LAYOUT SANDBOX — BROWSE / VARIANT B
// ----------------------------------------------------------------
// Compact list-style cards · 16:9 thumbnails · scrollable inline
// filter chips · scan-many-fast feel.
//
// HARD RULE: NO new functionality. Every element (search, filter
// chips, listing rows with price/title/location, trust badge)
// already exists in the live app today. This is layout
// rearrangement + visual treatment only.
// ----------------------------------------------------------------

import Link from "next/link";

export const runtime = "edge";

const FILTER_CHIPS = [
  { label: "All", active: true },
  { label: "1° network" },
  { label: "2° network" },
  { label: "Under $150" },
  { label: "$150–$250" },
  { label: "$250+" },
  { label: "Entire home" },
  { label: "Private room" },
  { label: "Family-friendly" },
  { label: "Pets ok" },
  { label: "Long stays" },
];

const LISTINGS = [
  {
    id: "1",
    photo: "https://picsum.photos/seed/brklyn-1/960/540",
    city: "Brooklyn, NY",
    title: "Sunlit brownstone garden floor",
    price: 145,
    beds: "2 beds · 1 bath",
    host: "Maya R.",
    trust: { degree: 2, label: "2°" },
    blurb: "Quiet block in Park Slope, garden access, full kitchen.",
  },
  {
    id: "2",
    photo: "https://picsum.photos/seed/austin-1/960/540",
    city: "Austin, TX",
    title: "East-side bungalow with backyard",
    price: 165,
    beds: "1 bed · 1 bath",
    host: "Dev S.",
    trust: { degree: 1, label: "1°" },
    blurb: "Walking distance to East 6th, hammock in the back, dog-friendly.",
  },
  {
    id: "3",
    photo: "https://picsum.photos/seed/sf-1/960/540",
    city: "San Francisco, CA",
    title: "Mission flat with bay window",
    price: 220,
    beds: "1 bed · 1 bath",
    host: "Priya K.",
    trust: { degree: 2, label: "2°" },
    blurb: "Top floor, light all day, espresso machine and a record player.",
  },
  {
    id: "4",
    photo: "https://picsum.photos/seed/cdmx-1/960/540",
    city: "Mexico City, MX",
    title: "Roma Norte courtyard apartment",
    price: 95,
    beds: "1 bed · 1 bath",
    host: "Diego M.",
    trust: { degree: 3, label: "3°" },
    blurb: "Tiled courtyard, bougainvillea, two minutes from Parque México.",
  },
  {
    id: "5",
    photo: "https://picsum.photos/seed/brklyn-2/960/540",
    city: "Brooklyn, NY",
    title: "Bed-Stuy loft with private roof",
    price: 185,
    beds: "Studio · 1 bath",
    host: "Aliyah J.",
    trust: { degree: 1, label: "1°" },
    blurb: "Open plan with mezzanine, rooftop with skyline views.",
  },
  {
    id: "6",
    photo: "https://picsum.photos/seed/austin-2/960/540",
    city: "Austin, TX",
    title: "South Congress casita",
    price: 130,
    beds: "1 bed · 1 bath",
    host: "Jonas T.",
    trust: { degree: 2, label: "2°" },
    blurb: "Detached casita behind a 1920s craftsman, queen bed, kitchenette.",
  },
  {
    id: "7",
    photo: "https://picsum.photos/seed/sf-2/960/540",
    city: "San Francisco, CA",
    title: "Castro Victorian guest suite",
    price: 175,
    beds: "1 bed · 1 bath",
    host: "Renata V.",
    trust: { degree: 3, label: "3°" },
    blurb: "Private entrance, marble bath, parlor with original moldings.",
  },
  {
    id: "8",
    photo: "https://picsum.photos/seed/cdmx-2/960/540",
    city: "Mexico City, MX",
    title: "Condesa walk-up with terrace",
    price: 110,
    beds: "2 beds · 1 bath",
    host: "Sofía A.",
    trust: { degree: 2, label: "2°" },
    blurb: "Wraparound terrace, jacaranda views, working desk and fast wifi.",
  },
  {
    id: "9",
    photo: "https://picsum.photos/seed/sf-3/960/540",
    city: "San Francisco, CA",
    title: "Noe Valley garden cottage",
    price: 380,
    beds: "2 beds · 2 baths",
    host: "Theo L.",
    trust: { degree: 2, label: "2°" },
    blurb: "Detached cottage, kid-friendly, fully fenced backyard.",
  },
  {
    id: "10",
    photo: "https://picsum.photos/seed/brklyn-3/960/540",
    city: "Brooklyn, NY",
    title: "Greenpoint waterfront studio",
    price: 155,
    beds: "Studio · 1 bath",
    host: "Erin Q.",
    trust: { degree: 2, label: "2°" },
    blurb: "Skyline view from bed, ferry to Manhattan a five-min walk away.",
  },
];

export default function BrowseBPage() {
  return (
    <div className="w-full px-4 md:px-8 lg:px-12">
      <div className="mx-auto w-full max-w-[1100px] py-8">
        <SandboxBar />

        {/* Compact search */}
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-border bg-card/40 px-4 py-3">
          <span className="text-muted-foreground">⌕</span>
          <span className="text-sm text-muted-foreground">
            Search Brooklyn, Austin, SF, Mexico City…
          </span>
        </div>

        {/* Inline scrollable filter chips */}
        <div className="-mx-4 mt-4 overflow-x-auto px-4 md:-mx-8 md:px-8 lg:-mx-12 lg:px-12">
          <div className="flex w-max items-center gap-2 pb-1">
            {FILTER_CHIPS.map((c) => (
              <button
                key={c.label}
                type="button"
                className={
                  c.active
                    ? "rounded-full border border-brand bg-brand text-brand-foreground px-4 py-1.5 text-xs font-semibold"
                    : "rounded-full border border-border bg-card/40 px-4 py-1.5 text-xs font-medium text-foreground hover:bg-card/60"
                }
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Heading row */}
        <div className="mt-8 flex items-baseline justify-between">
          <div>
            <h1 className="font-serif text-3xl text-foreground">Stays</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {LISTINGS.length} matches in your trust network
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-border bg-card/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card/60">
              Map
            </button>
            <button className="rounded-lg border border-border bg-card/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card/60">
              Sort: Trust ↓
            </button>
          </div>
        </div>

        {/* Compact list — 16:9 thumb left, content right */}
        <div className="mt-4 divide-y divide-border/60 rounded-2xl border border-border bg-card/30">
          {LISTINGS.map((l) => (
            <article
              key={l.id}
              className="flex flex-col gap-4 p-4 transition-colors hover:bg-card/40 md:flex-row md:items-stretch md:gap-5 md:p-5"
            >
              <div className="relative overflow-hidden rounded-xl md:w-72 md:shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={l.photo}
                  alt={l.title}
                  className="aspect-[16/9] w-full object-cover"
                />
                <div className="absolute left-2 top-2 rounded-full border border-brand/40 bg-background/80 px-2 py-0.5 text-[10px] font-semibold text-brand backdrop-blur">
                  {l.trust.label}
                </div>
              </div>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {l.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {l.city} · {l.beds} · Hosted by {l.host}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-semibold text-foreground">
                      ${l.price}
                    </p>
                    <p className="text-[11px] text-muted-foreground">/ night</p>
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {l.blurb}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-full border border-border bg-background/40 px-2.5 py-0.5 text-[10px] text-foreground">
                    {l.trust.label} via your network
                  </span>
                  <span className="text-[10px] text-subtle">
                    Hosts vouched-for
                  </span>
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
