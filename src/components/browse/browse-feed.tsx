"use client";

// B4 /browse rework. Renders the hero CondensedSearch + filter chips
// at the top, then a mixed responsive grid below:
//
//   - Travel mode (default): listings + host-offer proposals
//     interleaved. Listings take 1 column; host offers span 2 columns
//     so the horizontal proposal-card layout fits cleanly. The
//     `show` URL param narrows to listings-only or host-offers-only.
//   - Host mode: trip-wish proposals only (no listings). When a host
//     is searching they're looking for guests, so listings + host
//     offers don't apply.
//
// Filter chips and mode toggle drive URL params; the page is a
// server component that re-fetches based on those params, so the
// chips behave like real filters (URLs are shareable, browser back
// works).

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import type { BrowseListing } from "@/lib/browse-data";
import type { BrowseListingTrust } from "./browse-layout";
import type { HydratedProposal } from "@/lib/proposals-data";
import { LiveListingCard } from "./live-listing-card";

export type BrowseMode = "travel" | "host";
export type TravelShow = "all" | "listings" | "host_offers";

interface Props {
  mode: BrowseMode;
  show: TravelShow;
  listings: BrowseListing[];
  hostOffers: HydratedProposal[];
  tripWishes: HydratedProposal[];
  trustByListing: Record<string, BrowseListingTrust>;
  savedIds: string[];
  isSignedIn: boolean;
  filtersSlot: React.ReactNode;
}

export function BrowseFeed({
  mode,
  show,
  listings,
  hostOffers,
  tripWishes,
  trustByListing,
  savedIds,
  isSignedIn,
  filtersSlot,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const savedSet = new Set(savedIds);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(sp?.toString() ?? "");
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.push(qs ? `/browse?${qs}` : "/browse");
  };

  const setMode = (m: BrowseMode) => {
    // Reset `show` when flipping mode — listings/host-offers chips
    // don't apply to host mode.
    const next = new URLSearchParams(sp?.toString() ?? "");
    next.set("mode", m);
    next.delete("show");
    router.push(`/browse?${next.toString()}`);
  };

  // Build the mixed Travel feed. Walk listings in order, dropping a
  // host offer in every N listings so the page reads as a feed, not
  // two separate lists. Ratio chosen so the col-span-2 host offer
  // breaks up the listing rhythm without dominating.
  const travelItems: Array<
    { type: "listing"; data: BrowseListing } | {
      type: "host_offer";
      data: HydratedProposal;
    }
  > = [];
  if (mode === "travel") {
    if (show === "listings") {
      for (const l of listings) travelItems.push({ type: "listing", data: l });
    } else if (show === "host_offers") {
      for (const h of hostOffers) travelItems.push({ type: "host_offer", data: h });
    } else {
      const RATIO = 4;
      let li = 0;
      let hi = 0;
      while (li < listings.length || hi < hostOffers.length) {
        for (let i = 0; i < RATIO && li < listings.length; i++) {
          travelItems.push({ type: "listing", data: listings[li++] });
        }
        if (hi < hostOffers.length) {
          travelItems.push({ type: "host_offer", data: hostOffers[hi++] });
        }
      }
    }
  }

  return (
    <div className="w-full">
      <div className="border-b border-border/60 bg-background/80 px-4 py-6 md:px-10 md:py-8 lg:px-20">
        <BrowseHeroSearch mode={mode} setMode={setMode} setParam={setParam} />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          {mode === "travel" ? (
            <FilterChips show={show} setParam={setParam} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Showing trip wishes from members looking for a place to stay.
            </p>
          )}
          <div>{filtersSlot}</div>
        </div>
      </div>

      <div className="px-4 pb-12 pt-6 md:px-10 lg:px-20">
        {mode === "travel" ? (
          travelItems.length === 0 ? (
            <EmptyState mode={mode} show={show} />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {travelItems.map((item) =>
                item.type === "listing" ? (
                  <LiveListingCard
                    key={`l-${item.data.id}`}
                    listing={item.data}
                    trust={trustByListing[item.data.id]}
                    initialSaved={savedSet.has(item.data.id)}
                    isSignedIn={isSignedIn}
                  />
                ) : (
                  <div
                    key={`h-${item.data.row.id}`}
                    className="sm:col-span-2"
                  >
                    <HostOfferGridCard proposal={item.data} />
                  </div>
                )
              )}
            </div>
          )
        ) : tripWishes.length === 0 ? (
          <EmptyState mode={mode} show={show} />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {tripWishes.map((p) => (
              <TripWishGridCard key={p.row.id} proposal={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Hero search bar ────────────────────────────────────────────
// Visually mirrors the home CondensedSearch (Travel/Host pill +
// Where/When/Who tri-pill). On /browse, Where + Search submit
// updates the URL `?location=`; When/Who and the Filters button all
// route through the FilterSheet for the rich popovers (which
// already exist there) — keeps this hero light without
// re-implementing those pickers inline.

function BrowseHeroSearch({
  mode,
  setMode,
  setParam,
}: {
  mode: BrowseMode;
  setMode: (m: BrowseMode) => void;
  setParam: (key: string, value: string | null) => void;
}) {
  const sp = useSearchParams();
  const [where, setWhere] = useState(sp?.get("location") ?? "");

  const submit = () => {
    setParam("location", where.trim() || null);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-center gap-3">
      <div className="flex h-[68px] shrink-0 items-center gap-1 rounded-full border border-border bg-card/40 p-2">
        <button
          type="button"
          onClick={() => setMode("travel")}
          className={
            mode === "travel"
              ? "inline-flex h-[52px] items-center rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground"
              : "inline-flex h-[52px] items-center rounded-full px-5 text-sm font-medium text-foreground/80 hover:bg-card/60 hover:text-foreground"
          }
          aria-pressed={mode === "travel"}
        >
          Travel
        </button>
        <button
          type="button"
          onClick={() => setMode("host")}
          className={
            mode === "host"
              ? "inline-flex h-[52px] items-center rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground"
              : "inline-flex h-[52px] items-center rounded-full px-5 text-sm font-medium text-foreground/80 hover:bg-card/60 hover:text-foreground"
          }
          aria-pressed={mode === "host"}
        >
          Host
        </button>
      </div>

      <div className="flex h-[68px] min-w-0 max-w-[820px] flex-1 items-stretch rounded-full border border-border bg-card/40">
        <div className="flex min-w-0 flex-1 flex-col justify-center pl-6 pr-4 text-left">
          <label
            htmlFor="browse-search-where"
            className="text-[11px] font-bold leading-tight text-foreground"
          >
            Where
          </label>
          <input
            id="browse-search-where"
            type="text"
            placeholder={
              mode === "travel"
                ? "Search destinations"
                : "Search trip wishes by destination"
            }
            value={where}
            onChange={(e) => setWhere(e.target.value)}
            onKeyDown={onKeyDown}
            className="w-full bg-transparent text-sm leading-tight text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        <span className="w-px self-stretch bg-border" aria-hidden />

        <div className="flex shrink-0 flex-col justify-center px-6 text-left">
          <span className="text-[11px] font-bold leading-tight text-foreground">
            When
          </span>
          <span className="text-sm leading-tight text-muted-foreground">
            {sp?.get("from") && sp?.get("to") ? "Custom" : "Any week"}
          </span>
        </div>

        <span className="w-px self-stretch bg-border" aria-hidden />

        <div className="flex shrink-0 items-center pl-6 pr-2">
          <div className="mr-3 text-left">
            <span className="block text-[11px] font-bold leading-tight text-foreground">
              Who
            </span>
            <span className="block text-sm leading-tight text-muted-foreground">
              {sp?.get("guests")
                ? `${sp.get("guests")} guest${sp.get("guests") === "1" ? "" : "s"}`
                : "Add guests"}
            </span>
          </div>
          <button
            type="button"
            onClick={submit}
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-brand text-brand-foreground transition-colors hover:bg-brand-300"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Filter chips (Travel mode only) ───────────────────────────

function FilterChips({
  show,
  setParam,
}: {
  show: TravelShow;
  setParam: (key: string, value: string | null) => void;
}) {
  const chips: Array<{ id: TravelShow; label: string }> = [
    { id: "all", label: "All" },
    { id: "listings", label: "Listings" },
    { id: "host_offers", label: "Host offers" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => {
        const active = show === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => setParam("show", c.id === "all" ? null : c.id)}
            className={
              active
                ? "inline-flex items-center rounded-full bg-foreground px-3.5 py-1.5 text-xs font-semibold text-background"
                : "inline-flex items-center rounded-full border border-border bg-card/40 px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-card/60"
            }
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ mode, show }: { mode: BrowseMode; show: TravelShow }) {
  const msg =
    mode === "host"
      ? "No trip wishes from your network yet. Check back as more members post their travel plans."
      : show === "listings"
        ? "No listings match your filters."
        : show === "host_offers"
          ? "No host offers from your network match your filters."
          : "Nothing to show yet — try widening your search or check back soon.";
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center">
      <p className="text-sm text-muted-foreground">{msg}</p>
    </div>
  );
}

// ── Card components ────────────────────────────────────────────
// Both cards are local to /browse — sized to fit the grid (col-span
// for host offers; default 1-col for trip wishes which sit in a
// 2-col grid in Host mode). Reuses the same trust-degree pill +
// destination-callout treatment as the home marquee cards.

function trustLabel(degree: 1 | 2 | 3 | 4 | null): string | null {
  if (degree === 1) return "1°";
  if (degree === 2) return "2°";
  if (degree === 3) return "3°";
  if (degree === 4) return "4°";
  return null;
}

function formatDateRange(p: HydratedProposal): string {
  const { start_date, end_date, flexible_month } = p.row;
  if (flexible_month) return flexible_month;
  if (!start_date && !end_date) return "Flexible dates";
  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  if (start_date && end_date) {
    if (start_date === end_date) return fmt(start_date);
    return `${fmt(start_date)} – ${fmt(end_date)}`;
  }
  return fmt((start_date ?? end_date) as string);
}

function HostOfferGridCard({ proposal }: { proposal: HydratedProposal }) {
  const { row, author, listing } = proposal;
  const trust = trustLabel(proposal.trustDegree);
  const photo =
    listing?.cover_photo_url ?? listing?.photo_urls[0] ?? row.thumbnail_url;
  const area = listing?.area_name;

  return (
    <Link
      href={`/proposals/${row.id}`}
      className="group flex h-[260px] w-full overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square h-[260px] shrink-0 bg-zinc-200">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={listing?.title ?? row.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
            No photo yet
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <div className="flex items-center gap-2">
          {author.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={author.avatar_url}
              alt={author.name}
              className="h-7 w-7 rounded-full object-cover"
            />
          )}
          <span className="truncate text-xs font-semibold text-zinc-900">
            {author.name}
          </span>
          {trust && (
            <span className="rounded-full bg-brand/15 px-1.5 py-0 text-[9px] font-semibold text-brand">
              {trust}
            </span>
          )}
          <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900">
            Host Offer
          </span>
        </div>
        <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-snug text-zinc-900">
          {listing?.title ?? row.title}
        </h3>
        {row.description && (
          <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-zinc-600">
            {row.description}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-3 text-[11px] text-zinc-600">
          {area && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {area}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {formatDateRange(proposal)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function TripWishGridCard({ proposal }: { proposal: HydratedProposal }) {
  const { row, author } = proposal;
  const primaryDest = row.destinations[0] ?? row.flexible_month ?? "Anywhere";
  const trust = trustLabel(proposal.trustDegree);
  const thumb = row.thumbnail_url;
  const guests = row.guest_count ?? 0;

  return (
    <Link
      href={`/proposals/${row.id}`}
      className="group flex h-[260px] w-full overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square h-[260px] shrink-0 overflow-hidden bg-zinc-200">
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={primaryDest}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: [
              "radial-gradient(circle at center,",
              "  transparent 0%,",
              "  transparent 13%,",
              "  rgba(110,150,130,0.20) 13%,",
              "  rgba(110,150,130,0.20) 25%,",
              "  rgba(80,130,110,0.30) 25%,",
              "  rgba(80,130,110,0.30) 40%,",
              "  rgba(55,105,85,0.42) 40%,",
              "  rgba(55,105,85,0.42) 55%,",
              "  rgba(35,80,65,0.55) 55%,",
              "  rgba(35,80,65,0.55) 75%,",
              "  rgba(20,55,45,0.72) 75%,",
              "  rgba(20,55,45,0.72) 100%",
              ")",
            ].join(" "),
          }}
        />
        <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center px-3 text-center">
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.55)" }}
          >
            Trip Wish
          </div>
          <div
            className="mt-2 line-clamp-2 text-2xl font-semibold leading-tight text-white"
            style={{ textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}
          >
            {primaryDest}
          </div>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <div className="flex items-center gap-2">
          {author.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={author.avatar_url}
              alt={author.name}
              className="h-7 w-7 rounded-full object-cover"
            />
          )}
          <span className="truncate text-xs font-semibold text-zinc-900">
            {author.name}
          </span>
          {trust && (
            <span className="rounded-full bg-brand/15 px-1.5 py-0 text-[9px] font-semibold text-brand">
              <ShieldCheck className="-mt-px mr-0.5 inline h-3 w-3" />
              {trust}
            </span>
          )}
          <span className="ml-auto rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-900">
            Trip Wish
          </span>
        </div>
        <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-snug text-zinc-900">
          {row.title}
        </h3>
        {row.description && (
          <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-zinc-600">
            {row.description}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-3 text-[11px] text-zinc-600">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {formatDateRange(proposal)}
          </span>
          {guests > 0 && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {guests} guest{guests === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// Suppress unused-import warnings for icons referenced only in
// children that aren't yet rendered. Keeping them imported keeps
// future tweaks low-friction.
void SlidersHorizontal;
