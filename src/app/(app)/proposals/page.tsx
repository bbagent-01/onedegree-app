import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Plus, BellRing } from "lucide-react";
import { getEffectiveUserId } from "@/lib/impersonation/session";
import { fetchVisibleProposals } from "@/lib/proposals-data";
import { ProposalCard } from "@/components/proposals/proposal-card";

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
  const authorParam = typeof sp.author === "string" ? sp.author : undefined;
  const includeOwn = authorParam != null && authorParam === viewerId;

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
          <h1 className="text-2xl font-semibold md:text-3xl">
            {authorParam && !includeOwn
              ? "Their proposals"
              : includeOwn
                ? "Your proposals"
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
        <TabLink label="All" href={tabHref(authorParam, "all")} active={kind === "all"} />
        <TabLink
          label="Trip Wishes"
          href={tabHref(authorParam, "trip_wish")}
          active={kind === "trip_wish"}
        />
        <TabLink
          label="Host Offers"
          href={tabHref(authorParam, "host_offer")}
          active={kind === "host_offer"}
        />
      </div>

      <Suspense fallback={null}>
        <div className="mt-6">
          {items.length === 0 ? (
            <EmptyState kind={kind} />
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {items.map((p) => (
                <li key={p.row.id}>
                  <ProposalCard proposal={p} viewerId={viewerId} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Suspense>
    </div>
  );
}

function tabHref(author: string | undefined, kind: string) {
  const q = new URLSearchParams();
  if (author) q.set("author", author);
  if (kind !== "all") q.set("kind", kind);
  const s = q.toString();
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
