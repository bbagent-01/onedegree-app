// D3 LAYOUT SANDBOX — BROWSE WITH HOST OFFERS
// ----------------------------------------------------------------
// Variant of /browse that surfaces relevant Host Offer proposals
// alongside listings. After someone searches a location, the page
// shows a "Host Offers in [city]" horizontal row at the top, then
// the regular listings grid below. Highlights the proposal feature
// so it's discoverable from the main discovery flow without
// requiring a separate trip to /proposals.
// ----------------------------------------------------------------

import Link from "next/link";
import {
  Heart,
  Search,
  SlidersHorizontal,
  Calendar,
  MapPin,
  ChevronRight,
} from "lucide-react";

export const runtime = "edge";

const SEARCH_LOCATION = "Brooklyn, NY";

const HOST_OFFERS = [
  {
    id: "ho-1",
    name: "Maya R.",
    avatar: "https://picsum.photos/seed/maya-r/80/80",
    listing: "Brownstone garden floor",
    area: "Park Slope",
    dates: "Jul 04 → 08",
    price: 145,
    photo: "https://picsum.photos/seed/brklyn-1/600/400",
    trust: "1°",
    body: "Heading upstate for the long weekend. Couple or solo preferred.",
  },
  {
    id: "ho-2",
    name: "Aliyah J.",
    avatar: "https://picsum.photos/seed/aliyah-j/80/80",
    listing: "Bed-Stuy loft + roof",
    area: "Bed-Stuy",
    dates: "Aug 14 → 21",
    price: 185,
    photo: "https://picsum.photos/seed/brklyn-2/600/400",
    trust: "1°",
    body: "Visiting family — looking for someone to look after the cat.",
  },
  {
    id: "ho-3",
    name: "Erin Q.",
    avatar: "https://picsum.photos/seed/erin-q/80/80",
    listing: "Greenpoint waterfront studio",
    area: "Greenpoint",
    dates: "Sep 02 → 09",
    price: 155,
    photo: "https://picsum.photos/seed/brklyn-3/600/400",
    trust: "2°",
    body: "Studio open for a week. Skyline views, ferry to Manhattan nearby.",
  },
];

type Listing = {
  id: string;
  photo: string;
  city: string;
  title: string;
  price: number;
  beds: string;
  host: string;
  trust: string;
};

const LISTINGS: Listing[] = [
  { id: "1", photo: "https://picsum.photos/seed/brklyn-1/800/600", city: "Park Slope, Brooklyn", title: "Sunlit brownstone garden floor", price: 145, beds: "2 beds · 1 bath", host: "Maya R.", trust: "1°" },
  { id: "5", photo: "https://picsum.photos/seed/brklyn-2/800/600", city: "Bed-Stuy, Brooklyn", title: "Bed-Stuy loft with private roof", price: 185, beds: "Studio · 1 bath", host: "Aliyah J.", trust: "1°" },
  { id: "10", photo: "https://picsum.photos/seed/brklyn-3/800/600", city: "Greenpoint, Brooklyn", title: "Greenpoint waterfront studio", price: 155, beds: "Studio · 1 bath", host: "Erin Q.", trust: "2°" },
  { id: "13", photo: "https://picsum.photos/seed/brklyn-4/800/600", city: "Williamsburg, Brooklyn", title: "Williamsburg parlor floor", price: 210, beds: "2 beds · 1 bath", host: "Renata V.", trust: "2°" },
  { id: "14", photo: "https://picsum.photos/seed/brklyn-5/800/600", city: "Cobble Hill, Brooklyn", title: "Cobble Hill garden duplex", price: 240, beds: "2 beds · 2 baths", host: "Theo L.", trust: "2°" },
  { id: "15", photo: "https://picsum.photos/seed/brklyn-6/800/600", city: "Carroll Gardens, Brooklyn", title: "Carroll Gardens carriage house", price: 195, beds: "1 bed · 1 bath", host: "Casey W.", trust: "2°" },
  { id: "16", photo: "https://picsum.photos/seed/brklyn-7/800/600", city: "Fort Greene, Brooklyn", title: "Fort Greene parlor with piano", price: 175, beds: "1 bed · 1 bath", host: "Beatriz F.", trust: "1°" },
  { id: "17", photo: "https://picsum.photos/seed/brklyn-8/800/600", city: "Park Slope, Brooklyn", title: "Park Slope two-bedroom", price: 220, beds: "2 beds · 1 bath", host: "Jonas T.", trust: "2°" },
];

export default function BrowseWithOffersPage() {
  return (
    <div className="w-full px-4 md:px-10 lg:px-20">
      {/* Top search row */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex h-12 min-w-[260px] flex-1 items-center gap-2 rounded-full border border-border bg-card/40 px-5 shadow-search">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {SEARCH_LOCATION} · Any week · Add guests
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

      {/* HOST OFFERS row — the variant difference vs current /browse */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground md:text-xl">
              Host Offers in {SEARCH_LOCATION}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
              Members opening their homes for specific dates — not bookable on
              demand, but you can request these directly.
            </p>
          </div>
          <Link
            href="/sandbox/layouts/proposals"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            All offers
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {HOST_OFFERS.map((o) => (
            <article
              key={o.id}
              className="overflow-hidden rounded-2xl border border-warning/40 bg-card/40"
            >
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={o.photo}
                  alt={o.listing}
                  className="aspect-[3/2] w-full object-cover"
                />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-warning px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                  Host Offer
                </span>
                <span className="absolute right-3 top-3 rounded-full border border-brand/40 bg-background/85 px-2 py-0.5 text-[10px] font-semibold text-brand backdrop-blur">
                  {o.trust}
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={o.avatar}
                    alt={o.name}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                  <p className="text-xs font-semibold text-foreground">
                    {o.name}
                  </p>
                </div>
                <h3 className="mt-2 text-sm font-semibold text-foreground">
                  {o.listing}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {o.area}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {o.dates}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {o.body}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-foreground">
                    <span className="font-semibold">${o.price}</span>
                    <span className="text-muted-foreground"> / night</span>
                  </p>
                  <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                    Request
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Heading + sort */}
      <div className="mt-12 flex items-baseline justify-between">
        <div>
          <h2 className="font-serif text-3xl text-foreground md:text-4xl">
            Stays in {SEARCH_LOCATION}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Showing {LISTINGS.length} homes hosted by people in your trust
            network.
          </p>
        </div>
        <button className="rounded-lg border border-border bg-card/40 px-3 py-2 text-xs font-medium text-foreground hover:bg-card/60">
          Sort: Trust ↓
        </button>
      </div>

      {/* Listings grid */}
      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {LISTINGS.map((l) => (
          <article key={l.id} className="group">
            <div className="relative overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={l.photo}
                alt={l.title}
                className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-brand/40 bg-background/80 px-2.5 py-1 text-xs font-semibold text-brand backdrop-blur">
                {l.trust}
              </div>
              <button
                aria-label="Save"
                className="absolute right-3 top-3 rounded-full bg-background/80 p-2 text-foreground backdrop-blur transition-colors hover:text-brand"
              >
                <Heart className="h-4 w-4" />
              </button>
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
