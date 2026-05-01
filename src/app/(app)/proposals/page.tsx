import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Plus, BellRing } from "lucide-react";
import { getEffectiveUserId } from "@/lib/impersonation/session";
import { fetchVisibleProposals } from "@/lib/proposals-data";
import { ProposalsFeedWithFilters } from "@/components/proposals/feed-with-filters";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ProposalsFeedPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in?redirect=/proposals");
  const viewerId = await getEffectiveUserId(clerkId);
  if (!viewerId) redirect("/sign-in?redirect=/proposals");

  const sp = await searchParams;
  const kindParam = typeof sp.kind === "string" ? sp.kind : "all";
  const kind: "trip_wish" | "host_offer" | "all" =
    kindParam === "trip_wish" || kindParam === "host_offer" ? kindParam : "all";
  // Convenience alias so /proposals?author=me routes to the viewer's own
  // posts without exposing their UUID in the URL.
  const authorRaw = typeof sp.author === "string" ? sp.author : undefined;
  const authorParam = authorRaw === "me" ? viewerId : authorRaw;
  // Carry client-side filter params across tab switches so toggling
  // kind doesn't silently wipe a search the user just typed.
  const carryFilters = {
    q: typeof sp.q === "string" ? sp.q : "",
    dest: typeof sp.dest === "string" ? sp.dest : "",
    from: typeof sp.from === "string" ? sp.from : "",
    to: typeof sp.to === "string" ? sp.to : "",
  };
  // Always include the viewer's own posts — seeing "what does my post
  // look like in the feed" is part of the onboarding loop for alpha.
  // The old discovery-only behavior can return later if the feed gets
  // noisy, but until then visibility wins over novelty.
  const includeOwn = true;

  const items = await fetchVisibleProposals({
    viewerId,
    kind,
    authorId: authorParam,
    includeOwn,
  });

  return (
    <div className="mx-auto w-full max-w-[960px] px-4 py-6 md:px-6 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold md:text-3xl">
            {authorParam === viewerId
              ? "Your proposals"
              : authorParam
                ? "Their proposals"
                : "Proposals in your network"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Trip Wishes and Host Offers from people you can see — bounded by
            each post&apos;s preview network.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/alerts"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-white px-4 text-sm font-semibold hover:bg-muted"
          >
            <BellRing className="h-4 w-4" />
            Alerts
          </Link>
          <Link
            href="/proposals/new"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90"
          >
            <Plus className="h-4 w-4" />
            Create
          </Link>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        <TabLink
          label="All"
          href={tabHref(authorParam, "all", carryFilters)}
          active={kind === "all"}
        />
        <TabLink
          label="Trip Wishes"
          href={tabHref(authorParam, "trip_wish", carryFilters)}
          active={kind === "trip_wish"}
        />
        <TabLink
          label="Host Offers"
          href={tabHref(authorParam, "host_offer", carryFilters)}
          active={kind === "host_offer"}
        />
      </div>

      <Suspense fallback={null}>
        {items.length === 0 ? (
          <div className="mt-6">
            <EmptyState kind={kind} />
          </div>
        ) : (
          <ProposalsFeedWithFilters proposals={items} viewerId={viewerId} />
        )}
      </Suspense>
    </div>
  );
}

function tabHref(
  author: string | undefined,
  kind: string,
  carry: { q: string; dest: string; from: string; to: string }
) {
  const params = new URLSearchParams();
  if (author) params.set("author", author);
  if (kind !== "all") params.set("kind", kind);
  if (carry.q) params.set("q", carry.q);
  if (carry.dest) params.set("dest", carry.dest);
  if (carry.from) params.set("from", carry.from);
  if (carry.to) params.set("to", carry.to);
  const s = params.toString();
  return s ? `/proposals?${s}` : "/proposals";
}

function TabLink({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "inline-flex h-10 items-center rounded-full bg-foreground px-4 text-sm font-semibold text-background"
          : "inline-flex h-10 items-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground hover:bg-muted"
      }
    >
      {label}
    </Link>
  );
}

function EmptyState({ kind }: { kind: string }) {
  const label =
    kind === "trip_wish"
      ? "Trip Wishes"
      : kind === "host_offer"
        ? "Host Offers"
        : "proposals";
  return (
    <div className="rounded-2xl border border-border bg-white p-10 text-center">
      <p className="text-lg font-semibold">No {label} in your network yet.</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Invite friends to grow your network, or post your own.
      </p>
      <div className="mt-5 flex items-center justify-center gap-2">
        <Link
          href="/invite"
          className="inline-flex h-10 items-center rounded-lg border border-border bg-white px-4 text-sm font-semibold hover:bg-muted"
        >
          Invite someone
        </Link>
        <Link
          href="/proposals/new"
          className="inline-flex h-10 items-center rounded-lg bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90"
        >
          Create a proposal
        </Link>
      </div>
    </div>
  );
}
