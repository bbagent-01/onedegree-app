// D3 LAYOUT SANDBOX — LISTING DETAIL (replica of /listings/[id])
// ----------------------------------------------------------------
// Mirrors the current single-listing layout: photo gallery up top,
// title + meta, host card with trust path, amenities, host's house
// rules, sticky booking sidebar with price/dates/guests CTA. Sample
// data inline.
// ----------------------------------------------------------------

import Link from "next/link";
import {
  Bath,
  BedDouble,
  Heart,
  MapPin,
  Share,
  ShieldCheck,
  Star,
  Users,
  Wifi,
  Coffee,
  Tv,
  Wind,
  Car,
  ChefHat,
} from "lucide-react";

export const runtime = "edge";

const LISTING = {
  title: "Sunlit brownstone garden floor",
  area: "Park Slope, Brooklyn, NY",
  price: 145,
  rating: 4.91,
  reviewCount: 23,
  beds: 2,
  baths: 1,
  guests: 4,
  description:
    "Quiet garden-level apartment in a classic Park Slope brownstone — exposed brick, original floors, full kitchen, and direct access to a small private garden in the back. Ten minutes' walk to the F train, one block from Prospect Park.",
  photos: [
    "https://picsum.photos/seed/brklyn-1-hero/1600/1000",
    "https://picsum.photos/seed/brklyn-1-living/800/600",
    "https://picsum.photos/seed/brklyn-1-kitchen/800/600",
    "https://picsum.photos/seed/brklyn-1-bed/800/600",
    "https://picsum.photos/seed/brklyn-1-garden/800/600",
  ],
  host: {
    name: "Maya R.",
    avatar: "https://picsum.photos/seed/maya-r/200/200",
    memberSince: "March 2025",
    bio: "I host because my own best travel memories were nights in friends' spare rooms. Two kids, one cat, plenty of plants.",
    trust: {
      label: "1° via Erin Q.",
      score: 84,
      degreeAvg: "1°",
      mutualConnections: 3,
    },
  },
  amenities: [
    { icon: Wifi, label: "Fast wifi" },
    { icon: ChefHat, label: "Full kitchen" },
    { icon: Coffee, label: "Espresso machine" },
    { icon: Tv, label: "TV" },
    { icon: Wind, label: "Central air" },
    { icon: Car, label: "Free street parking" },
  ],
  rules: [
    "Check-in 3pm, check-out 11am",
    "No smoking, no parties",
    "One small dog ok with notice",
  ],
};

export default function ListingDetailPage() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-6 md:py-8 lg:px-10">
      {/* Title row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
            {LISTING.title}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Star className="h-4 w-4 fill-current text-foreground" />
              {LISTING.rating} · {LISTING.reviewCount} reviews
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {LISTING.area}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/40 px-3 py-2 text-xs font-medium text-foreground hover:bg-card/60">
            <Share className="h-3.5 w-3.5" />
            Share
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/40 px-3 py-2 text-xs font-medium text-foreground hover:bg-card/60">
            <Heart className="h-3.5 w-3.5" />
            Save
          </button>
        </div>
      </div>

      {/* Photo grid */}
      <div className="mt-5 grid grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LISTING.photos[0]}
          alt=""
          className="col-span-2 row-span-2 aspect-[4/3] h-full w-full object-cover md:aspect-auto"
        />
        {LISTING.photos.slice(1, 5).map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={p}
            alt=""
            className="aspect-[4/3] h-full w-full object-cover"
          />
        ))}
      </div>

      {/* Two-col body */}
      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Main column */}
        <div className="space-y-10">
          {/* Host card */}
          <section className="flex items-start gap-4 rounded-2xl border border-border bg-card/40 p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LISTING.host.avatar}
              alt={LISTING.host.name}
              className="h-14 w-14 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-foreground">
                Hosted by {LISTING.host.name}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Member since {LISTING.host.memberSince}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
                <ShieldCheck className="h-3.5 w-3.5" />
                {LISTING.host.trust.label} ·{" "}
                {LISTING.host.trust.mutualConnections} mutual
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {LISTING.host.bio}
              </p>
            </div>
          </section>

          {/* Description */}
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              About this stay
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {LISTING.guests} guests
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BedDouble className="h-4 w-4" />
                {LISTING.beds} beds
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Bath className="h-4 w-4" />
                {LISTING.baths} bath
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-foreground">
              {LISTING.description}
            </p>
          </section>

          {/* Amenities */}
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              What this place offers
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {LISTING.amenities.map((a) => {
                const Icon = a.icon;
                return (
                  <div
                    key={a.label}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card/30 px-4 py-3 text-sm text-foreground"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {a.label}
                  </div>
                );
              })}
            </div>
          </section>

          {/* House rules */}
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              House rules
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
              {LISTING.rules.map((r) => (
                <li key={r} className="flex items-start gap-2">
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand" />
                  {r}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Sticky booking card */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card/40 p-5 shadow-card">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold text-foreground">
                ${LISTING.price}
              </span>
              <span className="text-sm text-muted-foreground">/ night</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border bg-background/40 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Check-in
                </p>
                <p className="mt-1 text-sm text-foreground">May 14</p>
              </div>
              <div className="rounded-lg border border-border bg-background/40 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Check-out
                </p>
                <p className="mt-1 text-sm text-foreground">May 16</p>
              </div>
              <div className="col-span-2 rounded-lg border border-border bg-background/40 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Guests
                </p>
                <p className="mt-1 text-sm text-foreground">2 guests</p>
              </div>
            </div>

            <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-card transition-all hover:bg-primary/90">
              Send proposal to {LISTING.host.name.split(" ")[0]}
            </button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              You won&rsquo;t be charged yet.
            </p>

            <div className="mt-5 space-y-2 border-t border-border/60 pt-4 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>${LISTING.price} × 2 nights</span>
                <span>${LISTING.price * 2}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Service fee</span>
                <span>$24</span>
              </div>
              <div className="flex items-center justify-between border-t border-border/60 pt-2 font-semibold text-foreground">
                <span>Total</span>
                <span>${LISTING.price * 2 + 24}</span>
              </div>
            </div>
          </div>

          <Link
            href="#"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Report this listing
          </Link>
        </aside>
      </div>
    </div>
  );
}
