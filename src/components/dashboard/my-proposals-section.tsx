import Link from "next/link";
import { Plus } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase";
import type {
  ProposalHookType,
  ProposalKind,
  ProposalStatus,
  ProposalVisibilityMode,
} from "@/lib/proposals-data";

/**
 * Owner-facing list of a user's proposals (all statuses). Lives under
 * /dashboard?tab=proposals. Pure server component that renders a compact
 * table-style list with a status pill and inline Edit / Delete links.
 *
 * Intentionally NOT using the ProposalCard component — cards are tuned
 * for discovery (visual-left, info-right, large). The management view
 * prefers density: 10 rows visible at once > 3 cards.
 */

interface OwnProposalRow {
  id: string;
  kind: ProposalKind;
  title: string;
  status: ProposalStatus;
  visibility_mode: ProposalVisibilityMode;
  hook_type: ProposalHookType;
  destinations: string[];
  start_date: string | null;
  end_date: string | null;
  flexible_month: string | null;
  created_at: string;
  expires_at: string;
}

function dateLine(r: OwnProposalRow): string {
  if (r.flexible_month) return r.flexible_month;
  if (!r.start_date && !r.end_date) return "Flexible";
  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  if (r.start_date && r.end_date) {
    if (r.start_date === r.end_date) return fmt(r.start_date);
    return `${fmt(r.start_date)} – ${fmt(r.end_date)}`;
  }
  return fmt((r.start_date ?? r.end_date) as string);
}

export async function MyProposalsSection({
  userId,
}: {
  userId: string;
}) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("proposals")
    .select(
      "id, kind, title, status, visibility_mode, hook_type, destinations, start_date, end_date, flexible_month, created_at, expires_at"
    )
    .eq("author_id", userId)
    .order("status", { ascending: true }) // active first
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as OwnProposalRow[];
  const active = rows.filter((r) => r.status === "active");
  const archived = rows.filter((r) => r.status !== "active");

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Your proposals
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Trip Wishes are unlimited. Host Offers cap at 5 active.
          </p>
        </div>
        <Link
          href="/proposals/new"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90"
        >
          <Plus className="h-4 w-4" />
          Post a proposal
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
          <p className="text-base font-medium text-foreground">
            You haven&apos;t posted a proposal yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Post a Trip Wish to tell hosts where you want to go, or a Host
            Offer to share open dates on your listing.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <Link
              href="/proposals/new"
              className="inline-flex h-10 items-center rounded-lg bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90"
            >
              Post a proposal
            </Link>
            <Link
              href="/proposals"
              className="inline-flex h-10 items-center rounded-lg border border-border bg-white px-4 text-sm font-semibold hover:bg-muted"
            >
              See the feed
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <ProposalList
            heading="Active"
            rows={active}
            emptyLabel="No active proposals."
          />
          {archived.length > 0 && (
            <ProposalList
              heading="Closed & expired"
              rows={archived}
              emptyLabel=""
            />
          )}
        </div>
      )}
    </section>
  );
}

function ProposalList({
  heading,
  rows,
  emptyLabel,
}: {
  heading: string;
  rows: OwnProposalRow[];
  emptyLabel: string;
}) {
  if (rows.length === 0 && !emptyLabel) return null;
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {heading} · {rows.length}
      </div>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-white">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-4 p-4">
              <KindPill kind={r.kind} />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/proposals/${r.id}`}
                  className="block truncate text-sm font-semibold hover:underline"
                >
                  {r.title}
                </Link>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {dateLine(r)}
                  {r.destinations.length > 0 && (
                    <> · {r.destinations.slice(0, 3).join(" · ")}</>
                  )}
                </div>
              </div>
              <StatusPill status={r.status} />
              <Link
                href={`/proposals/${r.id}/edit`}
                className="inline-flex h-9 items-center rounded-lg border border-border bg-white px-3 text-xs font-semibold hover:bg-muted"
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function KindPill({ kind }: { kind: ProposalKind }) {
  const trip = kind === "trip_wish";
  return (
    <span
      className={
        trip
          ? "inline-flex shrink-0 items-center rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-100"
          : "inline-flex shrink-0 items-center rounded-full bg-[var(--tt-mint-mid)]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--tt-mint)]"
      }
    >
      {trip ? "Trip Wish" : "Host Offer"}
    </span>
  );
}

function StatusPill({ status }: { status: ProposalStatus }) {
  const cls =
    status === "active"
      ? "bg-[var(--tt-mint-mid)]/20 text-[var(--tt-mint)]"
      : status === "expired"
        ? "bg-amber-400/15 text-amber-100"
        : "bg-white/10 text-[var(--tt-cream)]";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {status}
    </span>
  );
}
