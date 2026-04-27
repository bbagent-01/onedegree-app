import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Users,
  BadgePercent,
  ArrowLeftRight,
  Gift,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrustTag } from "@/components/trust/trust-tag";
import { ConnectionPopover } from "@/components/trust/connection-breakdown";
import type { HydratedProposal } from "@/lib/proposals-data";
import { MessageAuthorButton } from "./message-author-button";
import { ListingPhotoCarousel } from "./listing-photo-carousel";

/**
 * Proposal card — full-row layout with visual on the left, info on the
 * right. Both kinds (Trip Wish / Host Offer) share the same footprint
 * so the feed reads as a consistent stream.
 *
 *  - Host Offer → photo carousel of the linked listing on the left.
 *  - Trip Wish  → themed destination callout on the left (gradient +
 *                 overlaid destination label). Generated deterministically
 *                 from the proposal id so refreshes don't jitter.
 *
 * Right column: large (medium-size) author avatar + name + TrustTag
 * popover, kind badge, large title, date / guest / location meta, and
 * CTA row pinned to the bottom.
 */

interface Props {
  proposal: HydratedProposal;
  viewerId: string;
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

function formatDateRange(p: HydratedProposal) {
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

export function ProposalCard({ proposal, viewerId }: Props) {
  const { row, author, listing } = proposal;
  const isTrip = row.kind === "trip_wish";
  const isOwn = row.author_id === viewerId;
  const authorHref = `/profile/${author.id}`;
  const detailHref = `/proposals/${row.id}`;

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col md:flex-row">
        {/* Visual pane — fixed width on desktop, aspect-stable on mobile */}
        <div className="relative w-full shrink-0 md:w-[340px]">
          {isTrip ? (
            <TripWishVisual proposal={proposal} />
          ) : (
            <HostOfferVisual proposal={proposal} />
          )}
        </div>

        {/* Info pane */}
        <div className="flex min-w-0 flex-1 flex-col p-5 md:p-6">
          {/* Author row */}
          <div className="flex items-start gap-3">
            <Link
              href={authorHref}
              className="shrink-0"
              aria-label={`View ${author.name}'s profile`}
            >
              <Avatar className="h-12 w-12">
                {author.avatar_url && (
                  <AvatarImage src={author.avatar_url} alt={author.name} />
                )}
                <AvatarFallback className="text-sm">
                  {initials(author.name)}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={authorHref}
                  className="truncate text-sm font-semibold hover:underline"
                >
                  {author.name}
                </Link>
                <KindBadge kind={row.kind} />
                {isOwn && (
                  <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Your post
                  </span>
                )}
              </div>
              {!isOwn ? (
                <div className="mt-1.5">
                  <ConnectionPopover
                    targetUserId={proposal.audienceHostId}
                    isSelf={false}
                    disabled={
                      proposal.trustDegree === 1 || proposal.hasDirectVouch
                    }
                  >
                    <TrustTag
                      size="micro"
                      score={proposal.trustScore}
                      degree={proposal.trustDegree}
                      direct={proposal.hasDirectVouch}
                    />
                  </ConnectionPopover>
                </div>
              ) : null}
            </div>
          </div>

          {/* Title + description */}
          <Link href={detailHref} className="mt-4 block">
            <h3 className="line-clamp-2 text-xl font-semibold leading-tight text-foreground group-hover:underline">
              {row.title}
            </h3>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
              {row.description}
            </p>
          </Link>

          {/* Meta row */}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {row.destinations.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span className="line-clamp-1">
                  {row.destinations.slice(0, 3).join(" · ")}
                  {row.destinations.length > 3
                    ? ` +${row.destinations.length - 3}`
                    : ""}
                </span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDateRange(proposal)}
            </span>
            {isTrip && row.guest_count && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {row.guest_count} guest{row.guest_count === 1 ? "" : "s"}
              </span>
            )}
            {!isTrip && row.hook_type !== "none" && (
              <HookPill
                hookType={row.hook_type}
                hookDetails={row.hook_details}
              />
            )}
          </div>

          {/* Linked listing title strip (host-offer only, small; the big
              visual is already on the left). */}
          {!isTrip && listing && (
            <div className="mt-3 text-xs text-muted-foreground">
              Linked listing:{" "}
              <Link
                href={`/listings/${listing.id}`}
                className="font-semibold text-foreground hover:underline"
              >
                {listing.title}
              </Link>{" "}
              · {listing.area_name}
            </div>
          )}

          {/* CTA row — pinned bottom. mt-auto on the flex column pushes
              it below whatever content precedes it. */}
          <div className="mt-auto flex items-center gap-2 pt-5">
            <Link
              href={detailHref}
              className="inline-flex h-10 items-center rounded-lg border border-border bg-white px-4 text-sm font-semibold hover:bg-muted"
            >
              View details
            </Link>
            {!isOwn && (
              <MessageAuthorButton
                proposalId={row.id}
                authorId={author.id}
                authorFirstName={author.name.split(" ")[0] ?? "them"}
                listingId={listing?.id ?? null}
                kindLabel={isTrip ? "Trip Wish" : "Host Offer"}
                title={row.title}
              />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function HostOfferVisual({ proposal }: { proposal: HydratedProposal }) {
  const { listing } = proposal;
  if (!listing || listing.photo_urls.length === 0) {
    // No photos: show a subtle placeholder that still locks the same
    // footprint so card heights stay consistent across the feed.
    return (
      <div className="flex h-56 w-full items-center justify-center bg-muted md:h-full md:min-h-[260px]">
        <span className="text-xs font-medium text-muted-foreground">
          No photos yet
        </span>
      </div>
    );
  }
  return (
    <ListingPhotoCarousel
      photos={listing.photo_urls}
      title={listing.title}
    />
  );
}

function TripWishVisual({ proposal }: { proposal: HydratedProposal }) {
  const primary =
    proposal.row.destinations[0] ||
    proposal.row.flexible_month ||
    "Anywhere";

  const thumb = proposal.row.thumbnail_url;
  const fromUnsplash =
    proposal.row.thumbnail_source === "unsplash_auto" ||
    proposal.row.thumbnail_source === "unsplash_picked";
  const attribution = proposal.row.thumbnail_attribution;

  if (thumb) {
    return (
      <div className="relative h-56 w-full overflow-hidden md:h-full md:min-h-[260px]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${thumb})` }}
        />
        {/* Soft dark vignette so the destination type stays legible
            on every photo — sky, beach, snow, food. Sits between the
            photo and the concentric rings. */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.42) 75%)",
          }}
        />
        <ConcentricRings />
        <CenteredDestinationLabel
          primary={primary}
          subdest={proposal.row.destinations.slice(1, 3)}
          extraCount={
            proposal.row.destinations.length > 3
              ? proposal.row.destinations.length - 3
              : 0
          }
        />
        {/* Photographer credit — runs the full bottom of the visual.
            With the inverted rings, the outermost ring is the most
            opaque white-veil, which gives this strip enough contrast
            on its own without an extra background pill. The text gets
            a soft drop-shadow as belt-and-suspenders for sky/snow
            photos. Production-tier compliant: linked photographer +
            linked Unsplash, both carrying the utm_source query. */}
        {fromUnsplash && attribution ? (
          <div
            className="absolute inset-x-0 bottom-0 px-4 pb-2 pt-6 text-center text-[11px] font-medium text-white"
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.45)" }}
          >
            <span className="truncate">
              Photo by{" "}
              <a
                href={`${attribution.photographer_url}?utm_source=trustead&utm_medium=referral`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-2 hover:underline"
              >
                {attribution.photographer_name}
              </a>{" "}
              on{" "}
              <a
                href="https://unsplash.com/?utm_source=trustead&utm_medium=referral"
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-2 hover:underline"
              >
                Unsplash
              </a>
            </span>
          </div>
        ) : fromUnsplash ? (
          <div
            className="absolute inset-x-0 bottom-0 px-4 pb-2 pt-6 text-center text-[11px] font-medium text-white"
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.45)" }}
          >
            Destination photo ·{" "}
            <a
              href="https://unsplash.com/?utm_source=trustead&utm_medium=referral"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:underline"
            >
              Unsplash
            </a>
          </div>
        ) : null}
      </div>
    );
  }

  // Fallback: deterministic gradient when no thumbnail was set
  // (legacy proposals + the env where UNSPLASH_ACCESS_KEY is missing).
  const palettes = [
    "from-amber-300 via-orange-400 to-rose-500",
    "from-sky-300 via-blue-500 to-indigo-600",
    "from-emerald-300 via-teal-500 to-cyan-600",
    "from-fuchsia-300 via-pink-500 to-rose-500",
    "from-violet-300 via-purple-500 to-indigo-600",
    "from-lime-300 via-green-500 to-emerald-600",
  ];
  const hashed = hashString(proposal.row.id);
  const palette = palettes[hashed % palettes.length];

  return (
    <div
      className={`relative h-56 w-full overflow-hidden bg-gradient-to-br ${palette} md:h-full md:min-h-[260px]`}
    >
      <ConcentricRings />
      <CenteredDestinationLabel
        primary={primary}
        subdest={proposal.row.destinations.slice(1, 3)}
        extraCount={
          proposal.row.destinations.length > 3
            ? proposal.row.destinations.length - 3
            : 0
        }
      />
    </div>
  );
}

/**
 * Concentric white rings radiating outward from the destination label —
 * the inner rings are nearly transparent (so the photo + type read
 * cleanly), and each successive ring out gets MORE opaque. The outer
 * rings are intentionally drawn well past the visual's edge so the
 * effect feels like it bleeds off the frame, not a contained vignette.
 *
 * Implemented as a stack of `box-shadow` rings on a tiny centered
 * element. The parent's `overflow-hidden` clips the outermost rings,
 * which is what produces the "extends past the card" look at any
 * card height.
 */
function ConcentricRings() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div
        className="h-2 w-2 rounded-full"
        style={{
          boxShadow: [
            "0 0 0 28px rgba(255,255,255,0.03)",
            "0 0 0 56px rgba(255,255,255,0.05)",
            "0 0 0 88px rgba(255,255,255,0.07)",
            "0 0 0 124px rgba(255,255,255,0.10)",
            "0 0 0 164px rgba(255,255,255,0.14)",
            "0 0 0 208px rgba(255,255,255,0.18)",
            "0 0 0 256px rgba(255,255,255,0.22)",
            "0 0 0 308px rgba(255,255,255,0.26)",
            "0 0 0 364px rgba(255,255,255,0.30)",
          ].join(", "),
        }}
      />
    </div>
  );
}

/**
 * Big centered destination label. Sits in the middle of the visual,
 * vertically + horizontally. Heavy drop-shadow so the white text stays
 * readable on every photo (sky, snow, beach, food). The "TRIP WISH"
 * eyebrow is rendered above; secondary destinations sit below.
 */
function CenteredDestinationLabel({
  primary,
  subdest,
  extraCount,
}: {
  primary: string;
  subdest: string[];
  extraCount: number;
}) {
  return (
    <div className="relative z-[1] flex h-full w-full flex-col items-center justify-center px-5 text-center">
      <div
        className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
        style={{ textShadow: "0 1px 6px rgba(0,0,0,0.45)" }}
      >
        Trip Wish
      </div>
      <div
        className="mt-2 line-clamp-2 text-2xl font-semibold leading-tight text-white md:text-3xl"
        style={{ textShadow: "0 2px 10px rgba(0,0,0,0.55)" }}
      >
        {primary}
      </div>
      {subdest.length > 0 && (
        <div
          className="mt-1.5 text-xs font-medium text-white/95"
          style={{ textShadow: "0 1px 6px rgba(0,0,0,0.55)" }}
        >
          {subdest.join(" · ")}
          {extraCount > 0 ? ` +${extraCount}` : ""}
        </div>
      )}
    </div>
  );
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function KindBadge({ kind }: { kind: "trip_wish" | "host_offer" }) {
  const trip = kind === "trip_wish";
  return (
    <span
      className={
        trip
          ? "inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-900"
          : "inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900"
      }
    >
      {trip ? "Trip Wish" : "Host Offer"}
    </span>
  );
}

function HookPill({
  hookType,
  hookDetails,
}: {
  hookType: "discount" | "trade" | "none";
  hookDetails: string | null;
}) {
  if (hookType === "none") return null;
  const Icon =
    hookType === "discount"
      ? BadgePercent
      : hookType === "trade"
        ? ArrowLeftRight
        : Gift;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900"
      title={hookDetails ?? undefined}
    >
      <Icon className="h-3 w-3" />
      <span className="line-clamp-1 max-w-[140px]">
        {hookDetails || hookType}
      </span>
    </span>
  );
}
