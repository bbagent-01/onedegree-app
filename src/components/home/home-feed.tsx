"use client";

// Signed-in home feed — ports the locked /sandbox/layouts/home-v4
// design (hero greeting, condensed search, CTA strip, four
// marquees) into the live app with real DB-backed data.
//
// Data comes in as already-shaped props from the server page; this
// component only handles the marquee animation + responsive layout.
// Empty marquees collapse silently per Loren — newcomers should
// see the CTA strip prominently rather than four blank rows.

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  MapPin,
  Plane,
  Plus,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import type { HydratedProposal } from "@/lib/proposals-data";
import type { NetworkPerson } from "@/lib/network-data";
import type { BrowseListing } from "@/lib/browse-data";
import type { BrowseListingTrust } from "@/components/browse/browse-layout";
import { LiveListingCard } from "@/components/browse/live-listing-card";

// ── Props ──────────────────────────────────────────────────────

export interface HomeFeedProps {
  firstName: string;
  tripWishes: HydratedProposal[];
  hostOffers: HydratedProposal[];
  networkPeople: NetworkPerson[];
  networkListings: BrowseListing[];
  /** Saved-listing ids so the heart on the listing marquee shows
   *  the correct initial state — same pattern as /browse. */
  savedListingIds: string[];
  /** Per-listing trust so the listing marquee renders the same
   *  TrustTag the live grid does. Keyed by listing id. */
  listingTrust: Record<string, BrowseListingTrust>;
}

// ── Page ───────────────────────────────────────────────────────

export function HomeFeed({
  firstName,
  tripWishes,
  hostOffers,
  networkPeople,
  networkListings,
  savedListingIds,
  listingTrust,
}: HomeFeedProps) {
  const savedSet = new Set(savedListingIds);

  return (
    <div className="px-6 lg:px-10">
      <header className="flex flex-col items-center pb-[10vh] pt-[12vh] text-center md:pb-[15vh] md:pt-[20vh]">
        <p className="text-sm text-muted-foreground">
          Welcome back, {firstName}.
        </p>
        <h1
          className="mt-2 whitespace-nowrap font-serif text-4xl text-foreground md:text-5xl"
          style={{ maxWidth: "none" }}
        >
          What are you looking for?
        </h1>
      </header>

      <CTAStrip />

      {tripWishes.length > 0 && (
        <Marquee
          title="Trip Wishes from your network"
          subtitle="Members looking for a place to stay"
          link={{ label: "All proposals", href: "/proposals?kind=trip_wish" }}
          direction="right"
        >
          {tripWishes.map((p) => (
            <TripWishMarqueeCard key={p.row.id} proposal={p} />
          ))}
        </Marquee>
      )}

      {networkPeople.length > 0 && (
        <Marquee
          title="People in your network"
          subtitle="Folks you might want to vouch for"
          link={{ label: "Vouch flow", href: "/vouch" }}
          direction="left"
        >
          {networkPeople.map((p) => (
            <PersonMarqueeCard key={p.user_id} person={p} />
          ))}
        </Marquee>
      )}

      {hostOffers.length > 0 && (
        <Marquee
          title="Host Offers"
          subtitle="Members opening their homes for specific dates"
          link={{ label: "All offers", href: "/proposals?kind=host_offer" }}
          direction="right"
        >
          {hostOffers.map((p) => (
            <HostOfferMarqueeCard key={p.row.id} proposal={p} />
          ))}
        </Marquee>
      )}

      {networkListings.length > 0 && (
        <Marquee
          title="Stays from people you know"
          subtitle="Listings hosted by 1° and 2° connections"
          link={{ label: "Browse all", href: "/browse" }}
          direction="left"
        >
          {networkListings.map((l) => (
            <ListingMarqueeCard
              key={l.id}
              listing={l}
              trust={listingTrust[l.id]}
              initialSaved={savedSet.has(l.id)}
            />
          ))}
        </Marquee>
      )}

      <div className="h-[20vh]" aria-hidden />
    </div>
  );
}

// ── CTA strip ──────────────────────────────────────────────────

function CTAStrip() {
  const ctas = [
    {
      icon: UserPlus,
      title: "Find people you know",
      body: "Search by name, email, or phone.",
      href: "/vouch",
    },
    {
      icon: Plus,
      title: "Create your first listing",
      body: "Open your home to your network.",
      href: "/hosting/create",
    },
    {
      icon: Plane,
      title: "Post a trip wish",
      body: "Tell your network where you want to go.",
      href: "/proposals/new",
    },
  ];
  return (
    <section className="mx-auto mt-2 w-full max-w-[1280px]">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {ctas.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.title}
              href={c.href}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card/40 p-4 transition-colors hover:border-brand/40 hover:bg-card/60"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-foreground">
                  {c.title}
                </h3>
                <p className="truncate text-[11px] text-muted-foreground">
                  {c.body}
                </p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ── Marquee ────────────────────────────────────────────────────

function Marquee({
  title,
  subtitle,
  link,
  direction,
  children,
}: {
  title: string;
  subtitle: string;
  link: { label: string; href: string };
  direction: "left" | "right";
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
      return;

    let loopWidth = node.scrollWidth / 2;
    const ro = new ResizeObserver(() => {
      loopWidth = node.scrollWidth / 2;
    });
    ro.observe(node);

    const dir = direction === "right" ? -1 : 1;
    let x = direction === "right" ? 0 : -loopWidth;
    let speedFactor = 1;
    let targetFactor = 1;
    let last = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      speedFactor += (targetFactor - speedFactor) * Math.min(1, dt / 250);
      x += dir * (loopWidth / 70000) * speedFactor * dt;
      if (dir < 0 && x <= -loopWidth) x += loopWidth;
      if (dir > 0 && x >= 0) x -= loopWidth;
      node.style.transform = `translateX(${x}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onEnter = () => {
      targetFactor = 0.02;
    };
    const onLeave = () => {
      targetFactor = 1;
    };
    node.addEventListener("mouseenter", onEnter);
    node.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      node.removeEventListener("mouseenter", onEnter);
      node.removeEventListener("mouseleave", onLeave);
    };
  }, [direction]);

  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-baseline gap-4">
        <h2 className="whitespace-nowrap" style={{ maxWidth: "none" }}>
          {title}
        </h2>
        <span className="w-px self-stretch bg-border" aria-hidden />
        <p className="whitespace-nowrap text-sm text-muted-foreground">
          {subtitle}
        </p>
        <span className="w-px self-stretch bg-border" aria-hidden />
        <Link
          href={link.href}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card/30 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-card/60"
        >
          {link.label}
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="relative mt-5 overflow-hidden">
        <div ref={ref} className="flex w-max gap-4 will-change-transform">
          <div className="flex shrink-0 gap-4">{children}</div>
          <div className="flex shrink-0 gap-4" aria-hidden>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Concentric rings overlay (ported from home-v4 to keep the
//    Trip Wish marquee visually consistent with the locked design;
//    the live ProposalCard's own TripWishVisual is a full-row
//    layout that doesn't fit the compact marquee card footprint). ─

function ConcentricRings() {
  return (
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
  );
}

function trustLabel(degree: 1 | 2 | 3 | 4 | null): string | null {
  if (degree === 1) return "1°";
  if (degree === 2) return "2°";
  if (degree === 3) return "3°";
  if (degree === 4) return "4°";
  return null;
}

function formatProposalDate(p: HydratedProposal): string {
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

// ── Trip Wish marquee card ─────────────────────────────────────

function TripWishMarqueeCard({ proposal }: { proposal: HydratedProposal }) {
  const { row, author } = proposal;
  const primaryDest = row.destinations[0] ?? row.flexible_month ?? "Anywhere";
  const subDest = row.destinations[1];
  const trust = trustLabel(proposal.trustDegree);
  const thumb = row.thumbnail_url;
  const guests = row.guest_count ?? 0;

  return (
    <Link
      href={`/proposals/${row.id}`}
      className="group flex h-[275px] w-[600px] shrink-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative h-[275px] w-[275px] shrink-0 overflow-hidden bg-zinc-200">
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={primaryDest}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <ConcentricRings />
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
          {subDest && (
            <div
              className="mt-1 text-[11px] font-medium text-white/95"
              style={{ textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}
            >
              {subDest}
            </div>
          )}
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
        <div className="mt-auto space-y-2 pt-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-600">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {formatProposalDate(proposal)}
            </span>
            {guests > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {guests} guest{guests === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Host Offer marquee card ────────────────────────────────────

function HostOfferMarqueeCard({ proposal }: { proposal: HydratedProposal }) {
  const { row, author, listing } = proposal;
  const trust = trustLabel(proposal.trustDegree);
  const photo =
    listing?.cover_photo_url ?? listing?.photo_urls[0] ?? row.thumbnail_url;
  const area = listing?.area_name;

  return (
    <Link
      href={`/proposals/${row.id}`}
      className="group flex h-[275px] w-[600px] shrink-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative h-[275px] w-[275px] shrink-0 bg-zinc-200">
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
        <div className="mt-auto space-y-2 pt-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-600">
            {area && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {area}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {formatProposalDate(proposal)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Person marquee card ────────────────────────────────────────

function PersonMarqueeCard({ person }: { person: NetworkPerson }) {
  return (
    <article className="flex h-[260px] w-[380px] shrink-0 flex-col rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-center gap-3">
        {person.user_avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.user_avatar}
            alt={person.user_name}
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-card text-base font-semibold text-foreground">
            {person.user_name
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-foreground">
            {person.user_name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {person.years_known_bucket
              ? `Known ${person.years_known_bucket}`
              : "Connection"}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-background/50 p-3">
        <div className="flex items-center gap-2 text-xs text-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-brand-foreground">
            <ShieldCheck className="h-3 w-3" />
            1°
          </span>
          <span className="truncate font-medium">
            {person.vouch_type === "host_only"
              ? "Vouched as host"
              : person.vouch_type === "guest_only"
                ? "Vouched as guest"
                : "Vouched"}
          </span>
        </div>
        {person.vouch_score !== null && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Vouch score · {person.vouch_score.toFixed(1)}
          </p>
        )}
      </div>

      <Link
        href={`/profile/${person.user_id}`}
        className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        View profile
      </Link>
    </article>
  );
}

// ── Listing marquee card ───────────────────────────────────────

function ListingMarqueeCard({
  listing,
  trust,
  initialSaved,
}: {
  listing: BrowseListing;
  trust: BrowseListingTrust | undefined;
  initialSaved: boolean;
}) {
  return (
    <div className="w-[300px] shrink-0">
      <LiveListingCard
        listing={listing}
        trust={trust}
        initialSaved={initialSaved}
        isSignedIn
      />
    </div>
  );
}
