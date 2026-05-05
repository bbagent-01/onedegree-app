import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  ArrowLeft,
  BellRing,
  CalendarDays,
  MapPin,
  Users,
  BadgePercent,
  ArrowLeftRight,
  Gift,
  ShieldCheck,
} from "lucide-react";
import { getEffectiveUserId } from "@/lib/impersonation/session";
import { fetchProposalById } from "@/lib/proposals-data";
import type { AccessRule } from "@/lib/trust/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrustTag } from "@/components/trust/trust-tag";
import { ConnectionPopover } from "@/components/trust/connection-breakdown";
import { MessageAuthorButton } from "@/components/proposals/message-author-button";
import { ShareToFriendButton } from "@/components/proposals/share-to-friend-button";
import { AuthorActions } from "@/components/proposals/author-actions";

export const runtime = "edge";
export const dynamic = "force-dynamic";

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

function describeRule(rule: AccessRule): string {
  switch (rule.type) {
    case "anyone_anywhere":
      return "Anyone (incl. not signed in) can see this.";
    case "anyone":
      return "Anyone signed in can see this.";
    case "min_score":
      return `People with a 1° trust score ≥ ${rule.threshold ?? 0} can see this.`;
    case "max_degrees":
      return `People within ${rule.threshold ?? 2}° of the author can see this.`;
    case "specific_people":
      return `${rule.user_ids?.length ?? 0} specific people can see this.`;
    default:
      return "—";
  }
}

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect(`/sign-in?redirect=/proposals/${id}`);
  const viewerId = await getEffectiveUserId(clerkId);
  if (!viewerId) redirect(`/sign-in?redirect=/proposals/${id}`);

  const proposal = await fetchProposalById(id, viewerId);
  if (!proposal) notFound();

  const { row, author, listing } = proposal;
  const isAuthor = row.author_id === viewerId;
  const isTrip = row.kind === "trip_wish";
  const kindLabel = isTrip ? "Trip Wish" : "Host Offer";
  const firstName = author.name.split(" ")[0] ?? "them";

  const dateLine = (() => {
    if (row.flexible_month) return row.flexible_month;
    if (!row.start_date && !row.end_date) return "Flexible dates";
    const fmt = (iso: string) =>
      new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    if (row.start_date && row.end_date) {
      if (row.start_date === row.end_date) return fmt(row.start_date);
      return `${fmt(row.start_date)} – ${fmt(row.end_date)}`;
    }
    return fmt((row.start_date ?? row.end_date) as string);
  })();

  return (
    <div className="mx-auto w-full max-w-[820px] px-4 py-6 md:px-6 md:py-10">
      <Link
        href="/proposals"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to proposals
      </Link>

      {/* Header card */}
      <div className="mt-4 rounded-2xl border border-border bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-start gap-4">
          <Link
            href={`/profile/${author.id}`}
            aria-label={`View ${author.name}'s profile`}
            className="shrink-0"
          >
            <Avatar className="h-14 w-14">
              {author.avatar_url && (
                <AvatarImage src={author.avatar_url} alt={author.name} />
              )}
              <AvatarFallback>{initials(author.name)}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/profile/${author.id}`}
                className="text-base font-semibold hover:underline"
              >
                {author.name}
              </Link>
              <span
                className={
                  isTrip
                    ? "inline-flex items-center gap-1 rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-100"
                    : "inline-flex items-center gap-1 rounded-full bg-[var(--tt-mint-mid)]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-mint)]"
                }
              >
                {kindLabel}
              </span>
              {row.status !== "active" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-cream)]">
                  {row.status}
                </span>
              )}
            </div>
            {!isAuthor && (
              <div className="mt-1">
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
            )}
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2">
            {!isAuthor && (
              <>
                <MessageAuthorButton
                  proposalId={row.id}
                  authorId={author.id}
                  authorFirstName={firstName}
                  listingId={listing?.id ?? null}
                  kindLabel={kindLabel}
                  title={row.title}
                />
                <ShareToFriendButton
                  proposalId={row.id}
                  proposalTitle={row.title}
                  kindLabel={kindLabel}
                />
              </>
            )}
          </div>
        </div>

        <h1 className="mt-6 text-2xl font-semibold md:text-3xl">{row.title}</h1>

        <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {row.destinations.length > 0 && (
            <div className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{row.destinations.join(" · ")}</span>
            </div>
          )}
          <div className="inline-flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {dateLine}
          </div>
          {isTrip && row.guest_count && (
            <div className="inline-flex items-center gap-2">
              <Users className="h-4 w-4" />
              {row.guest_count} guest{row.guest_count === 1 ? "" : "s"}
            </div>
          )}
          {row.hook_type !== "none" && (
            <div className="inline-flex items-center gap-2">
              {row.hook_type === "discount" ? (
                <BadgePercent className="h-4 w-4" />
              ) : row.hook_type === "trade" ? (
                <ArrowLeftRight className="h-4 w-4" />
              ) : (
                <Gift className="h-4 w-4" />
              )}
              {row.hook_details}
            </div>
          )}
        </div>

        <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-foreground">
          {row.description}
        </p>

        {!isTrip && listing && (
          <Link
            href={`/listings/${listing.id}`}
            className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 hover:bg-muted/50"
          >
            {listing.cover_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={listing.cover_photo_url}
                alt={listing.title}
                className="h-14 w-20 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="h-14 w-20 shrink-0 rounded-lg bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {listing.title}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {listing.area_name}
              </div>
            </div>
            <span className="shrink-0 text-xs font-semibold text-muted-foreground">
              View listing →
            </span>
          </Link>
        )}

        {/* Visibility hint — shows the resolved rule so the author can
            tell at a glance what network they're actually reaching
            (vs. what they intended). */}
        <div className="mt-6 flex items-start gap-2 rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5" />
          <span>
            <strong className="font-semibold text-foreground">
              {row.visibility_mode === "inherit"
                ? isTrip
                  ? "Inherited from your profile preview network"
                  : "Inherited from this listing's preview network"
                : "Custom audience"}
              :
            </strong>{" "}
            {describeRule(proposal.effectiveRule)}
          </span>
        </div>

        {/* Actions row */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {isAuthor ? (
            <AuthorActions proposalId={row.id} status={row.status} />
          ) : (
            <Link
              href={`/alerts?prefill_kind=${row.kind}&prefill_dest=${encodeURIComponent(row.destinations.join(","))}`}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-white px-4 text-sm font-semibold hover:bg-muted"
            >
              <BellRing className="h-4 w-4" />
              Save as alert
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
