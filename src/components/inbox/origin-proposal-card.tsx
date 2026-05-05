"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface Props {
  proposal: {
    id: string;
    kind: "trip_wish" | "host_offer";
    title: string;
    /** False once the proposal is no longer 'active' (closed, expired,
     *  or deleted-then-set-null). The card stays in the thread for
     *  context but the link is suppressed. */
    isAvailable: boolean;
  };
}

/**
 * Compact thread-header card showing the proposal that started the
 * conversation (S9d Task 2). Renders once per thread when the row has
 * `origin_proposal_id` set; legacy threads (null) get nothing.
 *
 * The kind badge color tracks the rest of the proposal surface:
 * sky-blue for Trip Wish, emerald for Host Offer.
 */
export function OriginProposalCard({ proposal }: Props) {
  const isTrip = proposal.kind === "trip_wish";
  const kindLabel = isTrip ? "Trip Wish" : "Host Offer";
  // Trip vs Host Offer badge — translucent tinted bg + readable
  // light text so the badge sits on the dark forest bg without
  // creating a white island.
  const badgeClass = isTrip
    ? "border border-sky-400/30 bg-sky-400/15 text-sky-200"
    : "border border-[var(--tt-mint-mid)]/40 bg-[var(--tt-mint-mid)]/15 text-[var(--tt-mint)]";

  // Unavailable → static row, no link. Spec wording per S9d brief.
  if (!proposal.isAvailable) {
    return (
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-white/5 px-4 py-2.5">
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full ${badgeClass} px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-70`}
        >
          {kindLabel}
        </span>
        <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          From a {kindLabel} (no longer available)
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/proposals/${proposal.id}`}
      className="flex shrink-0 items-center gap-3 border-b border-border bg-white/5 px-4 py-2.5 transition-colors hover:bg-white/5"
    >
      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded-full ${badgeClass} px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide`}
      >
        {kindLabel}
      </span>
      <div className="min-w-0 flex-1 truncate text-xs text-foreground">
        <span className="text-muted-foreground">From </span>
        <span className="font-semibold">{proposal.title}</span>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
