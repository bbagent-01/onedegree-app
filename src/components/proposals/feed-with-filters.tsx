"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, MapPin, Search, Tag, X } from "lucide-react";
import type { HydratedProposal } from "@/lib/proposals-data";
import { ProposalCard } from "./proposal-card";

/**
 * Client-side filter bar over the already-visibility-checked proposal
 * list. Server still gates by kind via URL (tabs are real Links, so the
 * URL stays shareable), but search/destination/date filters happen here
 * for instant feedback as the user types. URL params mirror the local
 * state so a filtered view can be shared by copying the URL.
 */

interface Props {
  proposals: HydratedProposal[];
  viewerId: string;
}

const FILTER_KEYS = ["q", "dest", "from", "to"] as const;

function parseFlexibleMonthRange(
  s: string
): { start: string; end: string } | null {
  const t = s.trim();
  if (!t) return null;
  const monthIdx = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  const m1 = t.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (m1) {
    const idx = monthIdx.indexOf(m1[1].toLowerCase());
    if (idx < 0) return null;
    const y = parseInt(m1[2], 10);
    return monthRange(y, idx);
  }
  const m2 = t.match(/^(\d{4})-(\d{2})$/);
  if (m2) return monthRange(parseInt(m2[1], 10), parseInt(m2[2], 10) - 1);
  return null;
}

function monthRange(year: number, monthIdx: number) {
  const start = new Date(Date.UTC(year, monthIdx, 1));
  const end = new Date(Date.UTC(year, monthIdx + 1, 0));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

function applyFilters(
  rows: HydratedProposal[],
  q: string,
  dest: string,
  from: string,
  to: string
): HydratedProposal[] {
  const qNorm = q.trim().toLowerCase();
  const destNorm = dest.trim().toLowerCase();
  const fromIso = from || null;
  const toIso = to || null;

  return rows.filter((h) => {
    const r = h.row;

    if (destNorm) {
      const hit = r.destinations.some((d) =>
        d.toLowerCase().includes(destNorm)
      );
      if (!hit) return false;
    }

    if (qNorm) {
      const blob =
        `${r.title} ${r.description} ${r.destinations.join(" ")}`.toLowerCase();
      if (!blob.includes(qNorm)) return false;
    }

    if (fromIso || toIso) {
      // Resolve the proposal's effective [pStart, pEnd] either from
      // concrete dates or flexible_month. If neither resolves we fall
      // back to "match everything" so undated wishes don't get hidden
      // by a date filter.
      let pStart = r.start_date;
      let pEnd = r.end_date;
      if ((!pStart || !pEnd) && r.flexible_month) {
        const parsed = parseFlexibleMonthRange(r.flexible_month);
        if (parsed) {
          pStart = pStart ?? parsed.start;
          pEnd = pEnd ?? parsed.end;
        }
      }
      if (!pStart && !pEnd) return true;
      const aStart = fromIso ?? "0000-01-01";
      const aEnd = toIso ?? "9999-12-31";
      const s = pStart ?? aStart;
      const e = pEnd ?? aEnd;
      if (!(s <= aEnd && e >= aStart)) return false;
    }

    return true;
  });
}

export function ProposalsFeedWithFilters({ proposals, viewerId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(() => searchParams.get("q") ?? "");
  const [dest, setDest] = useState(() => searchParams.get("dest") ?? "");
  const [from, setFrom] = useState(() => searchParams.get("from") ?? "");
  const [to, setTo] = useState(() => searchParams.get("to") ?? "");

  // Sync URL params when local filter state changes. Use replace so the
  // back button still escapes /proposals in one step, and preserve all
  // other params (kind tab, author=me, etc.).
  useEffect(() => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    const set = (k: string, v: string) => {
      const trimmed = v.trim();
      if (trimmed) params.set(k, trimmed);
      else params.delete(k);
    };
    set("q", q);
    set("dest", dest);
    set("from", from);
    set("to", to);
    const next = params.toString();
    const current = searchParams.toString();
    if (next !== current) {
      router.replace(next ? `/proposals?${next}` : "/proposals", {
        scroll: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, dest, from, to]);

  const filtered = useMemo(
    () => applyFilters(proposals, q, dest, from, to),
    [proposals, q, dest, from, to]
  );

  const hasActiveFilter =
    q.trim() !== "" ||
    dest.trim() !== "" ||
    from.trim() !== "" ||
    to.trim() !== "";

  const clearAll = () => {
    setQ("");
    setDest("");
    setFrom("");
    setTo("");
  };

  return (
    <>
      <div className="mt-5 rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, description, destination…"
              className="h-11 w-full rounded-lg border-2 border-border bg-white pl-9 pr-3 text-sm font-medium shadow-sm focus:border-foreground/60 focus:outline-none"
              aria-label="Search proposals"
            />
          </div>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              placeholder="Destination"
              className="h-11 w-full rounded-lg border-2 border-border bg-white pl-9 pr-3 text-sm font-medium shadow-sm focus:border-foreground/60 focus:outline-none"
              aria-label="Filter by destination"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-11 w-full rounded-lg border-2 border-border bg-white pl-7 pr-2 text-xs font-medium shadow-sm focus:border-foreground/60 focus:outline-none"
                aria-label="From date"
              />
            </div>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-11 w-full rounded-lg border-2 border-border bg-white pl-7 pr-2 text-xs font-medium shadow-sm focus:border-foreground/60 focus:outline-none"
                aria-label="To date"
              />
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              title="Tag filtering ships in a later session"
              className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-full border border-dashed border-border bg-muted/30 px-3 text-xs font-semibold text-muted-foreground"
            >
              <Tag className="h-3 w-3" />
              Tags (coming soon)
            </button>
            <span className="text-xs text-muted-foreground">
              {filtered.length} of {proposals.length}
            </span>
          </div>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-white px-3 text-xs font-semibold hover:bg-muted"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="mt-6">
        {filtered.length === 0 ? (
          <FilteredEmpty
            hadAny={proposals.length > 0}
            hasActiveFilter={hasActiveFilter}
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {filtered.map((p) => (
              <li key={p.row.id}>
                <ProposalCard proposal={p} viewerId={viewerId} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function FilteredEmpty({
  hadAny,
  hasActiveFilter,
}: {
  hadAny: boolean;
  hasActiveFilter: boolean;
}) {
  if (hadAny && hasActiveFilter) {
    return (
      <div className="rounded-2xl border border-border bg-white p-10 text-center">
        <p className="text-lg font-semibold">No matches.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Try a broader destination or date range — or clear filters to see
          everything in your network.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-white p-10 text-center">
      <p className="text-lg font-semibold">No proposals in your network yet.</p>
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

// Exported so the parent server page can preserve unrelated keys (kind,
// author) when constructing tab links.
export const PROPOSAL_FEED_FILTER_KEYS = FILTER_KEYS;
