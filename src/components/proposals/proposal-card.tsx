import Link from "next/link";
import { CalendarDays, MapPin, Users, BadgePercent, ArrowLeftRight, Gift } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrustTag } from "@/components/trust/trust-tag";
import type { HydratedProposal } from "@/lib/proposals-data";
import { MessageAuthorButton } from "./message-author-button";

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
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Header — kind badge + author snippet */}
      <div className="flex items-start gap-3 p-4">
        <Link
          href={authorHref}
          className="shrink-0"
          aria-label={`View ${author.name}'s profile`}
        >
          <Avatar className="h-10 w-10">
            {author.avatar_url && (
              <AvatarImage src={author.avatar_url} alt={author.name} />
            )}
            <AvatarFallback className="text-xs">
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
          </div>
          <div className="mt-1">
            {!isOwn ? (
              <TrustTag
                size="micro"
                score={proposal.trustScore}
                degree={proposal.trustDegree}
                direct={proposal.hasDirectVouch}
              />
            ) : (
              <span className="text-xs text-muted-foreground">Your post</span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <Link href={detailHref} className="flex-1 px-4 pb-3 hover:bg-muted/20">
        <h3 className="line-clamp-2 text-base font-semibold text-foreground">
          {row.title}
        </h3>
        <p className="mt-1.5 line-clamp-3 text-sm leading-6 text-muted-foreground">
          {row.description}
        </p>

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
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
        </div>

        {/* Host-offer: linked listing + hook */}
        {!isTrip && listing && (
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-2">
            {listing.cover_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={listing.cover_photo_url}
                alt={listing.title}
                className="h-10 w-14 shrink-0 rounded object-cover"
              />
            ) : (
              <div className="h-10 w-14 shrink-0 rounded bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold">
                {listing.title}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {listing.area_name}
              </div>
            </div>
            {row.hook_type !== "none" && (
              <HookBadge
                hookType={row.hook_type}
                hookDetails={row.hook_details}
              />
            )}
          </div>
        )}
      </Link>

      {/* Footer — CTAs */}
      <div className="flex items-center gap-2 border-t border-border bg-muted/20 px-4 py-3">
        <Link
          href={detailHref}
          className="inline-flex h-9 items-center rounded-lg border border-border bg-white px-3 text-xs font-semibold hover:bg-muted"
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
  );
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

function HookBadge({
  hookType,
  hookDetails,
}: {
  hookType: "discount" | "trade" | "none";
  hookDetails: string | null;
}) {
  if (hookType === "none") return null;
  const Icon =
    hookType === "discount" ? BadgePercent : hookType === "trade" ? ArrowLeftRight : Gift;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900"
      title={hookDetails ?? undefined}
    >
      <Icon className="h-3 w-3" />
      {hookDetails ? hookDetails.slice(0, 22) : hookType}
    </span>
  );
}
