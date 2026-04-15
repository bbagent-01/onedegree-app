"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Minus, Plus, MapPin } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

/**
 * Mobile-only collapsed search pill. Shows a single "Start your search"
 * button; tapping opens a full-height sheet with stacked Where / When /
 * Who sections and a Search button. Mirrors Airbnb's mobile search UX.
 *
 * Desktop continues to use the inline SearchBar — this component is
 * hidden on md+ by the caller.
 */

interface Props {
  suggestions: { areas: string[]; titles: string[] };
}

interface GuestCounts {
  adults: number;
  children: number;
  infants: number;
  pets: number;
}

function formatRangeLabel(from?: string, to?: string) {
  if (!from && !to) return "Any week";
  try {
    if (from && to)
      return `${format(parseISO(from), "MMM d")} – ${format(parseISO(to), "MMM d")}`;
    if (from) return `${format(parseISO(from), "MMM d")} – …`;
  } catch {
    /* noop */
  }
  return "Any week";
}

function formatGuestsLabel(g: GuestCounts) {
  const total = g.adults + g.children;
  if (total === 0 && g.infants === 0 && g.pets === 0) return "Add guests";
  const parts: string[] = [];
  if (total) parts.push(`${total} guest${total === 1 ? "" : "s"}`);
  if (g.infants) parts.push(`${g.infants} infant${g.infants === 1 ? "" : "s"}`);
  if (g.pets) parts.push(`${g.pets} pet${g.pets === 1 ? "" : "s"}`);
  return parts.join(", ");
}

function pillSummary(
  location: string,
  range: DateRange | undefined,
  guests: GuestCounts
): string {
  const anyValue =
    location ||
    range?.from ||
    range?.to ||
    guests.adults + guests.children + guests.infants + guests.pets > 0;
  if (!anyValue) return "Start your search";
  const parts: string[] = [];
  if (location) parts.push(location);
  if (range?.from) {
    parts.push(
      formatRangeLabel(
        range.from ? format(range.from, "yyyy-MM-dd") : undefined,
        range.to ? format(range.to, "yyyy-MM-dd") : undefined
      )
    );
  }
  const guestTotal = guests.adults + guests.children;
  if (guestTotal) parts.push(`${guestTotal} guest${guestTotal === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

export function MobileSearchPill({ suggestions }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  // Hydrate from URL so the pill summary reflects the active search
  const [location, setLocation] = useState(params.get("location") ?? "");
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const from = params.get("from");
    const to = params.get("to");
    return {
      from: from ? parseISO(from) : undefined,
      to: to ? parseISO(to) : undefined,
    };
  });
  const [guests, setGuests] = useState<GuestCounts>(() => {
    const g = parseInt(params.get("guests") ?? "0", 10) || 0;
    return { adults: g, children: 0, infants: 0, pets: 0 };
  });

  // Keep local state synced when URL changes externally (e.g. clear filters)
  useEffect(() => {
    setLocation(params.get("location") ?? "");
    const from = params.get("from");
    const to = params.get("to");
    setRange({
      from: from ? parseISO(from) : undefined,
      to: to ? parseISO(to) : undefined,
    });
    const g = parseInt(params.get("guests") ?? "0", 10) || 0;
    setGuests((prev) => ({ ...prev, adults: g }));
  }, [params]);

  const filteredSuggestions = useMemo(() => {
    const q = location.trim().toLowerCase();
    if (!q) return suggestions.areas.slice(0, 6);
    const pool = [...new Set([...suggestions.areas, ...suggestions.titles])];
    return pool.filter((s) => s.toLowerCase().includes(q)).slice(0, 6);
  }, [location, suggestions]);

  const applySearch = useCallback(() => {
    const url = new URLSearchParams(params.toString());
    const set = (k: string, v?: string) => {
      if (v) url.set(k, v);
      else url.delete(k);
    };
    set("location", location || undefined);
    set("from", range?.from ? format(range.from, "yyyy-MM-dd") : undefined);
    set("to", range?.to ? format(range.to, "yyyy-MM-dd") : undefined);
    const g = guests.adults + guests.children;
    set("guests", g > 0 ? String(g) : undefined);
    router.push(`/browse?${url.toString()}`);
    setOpen(false);
  }, [location, range, guests, params, router]);

  const clearAll = () => {
    setLocation("");
    setRange(undefined);
    setGuests({ adults: 0, children: 0, infants: 0, pets: 0 });
  };

  const summary = pillSummary(location, range, guests);
  const isDefault = summary === "Start your search";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={cn(
          "flex h-14 w-full items-center gap-3 rounded-full border border-border bg-white px-5 shadow-sm transition-shadow hover:shadow",
          "text-left"
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-foreground" />
        <span
          className={cn(
            "flex-1 truncate text-sm font-medium",
            isDefault ? "text-foreground" : "text-foreground"
          )}
        >
          {summary}
        </span>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="h-[92dvh] max-h-[92dvh] w-full max-w-none gap-0 rounded-t-3xl p-0"
      >
        <SheetHeader className="shrink-0 border-b border-border px-5 py-4">
          <SheetTitle className="text-lg font-semibold">
            Start your search
          </SheetTitle>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5">
          {/* Where */}
            <section className="rounded-2xl border border-border p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Where
              </div>
              <div className="mt-1 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Search destinations"
                  className="h-10 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                />
              </div>
              {filteredSuggestions.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {filteredSuggestions.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => setLocation(s)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* When */}
            <section className="rounded-2xl border border-border p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                When
              </div>
              <div className="mt-1 text-sm font-medium">
                {formatRangeLabel(
                  range?.from ? format(range.from, "yyyy-MM-dd") : undefined,
                  range?.to ? format(range.to, "yyyy-MM-dd") : undefined
                )}
              </div>
              <div className="mt-3 flex justify-center">
                <Calendar
                  mode="range"
                  numberOfMonths={1}
                  selected={range}
                  onSelect={setRange}
                  disabled={{ before: new Date() }}
                />
              </div>
              {(range?.from || range?.to) && (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setRange(undefined)}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Clear dates
                  </button>
                </div>
              )}
            </section>

          {/* Who */}
          <section className="rounded-2xl border border-border p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Who
            </div>
            <GuestCounter value={guests} onChange={setGuests} />
          </section>
        </div>

        <div
          className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-white px-5 py-4"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={clearAll}
            className="text-sm font-semibold underline-offset-4 hover:underline"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={applySearch}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function GuestCounter({
  value,
  onChange,
}: {
  value: GuestCounts;
  onChange: (v: GuestCounts) => void;
}) {
  const rows: {
    key: keyof GuestCounts;
    label: string;
    sub: string;
    min: number;
  }[] = [
    { key: "adults", label: "Adults", sub: "Ages 13+", min: 0 },
    { key: "children", label: "Children", sub: "Ages 2–12", min: 0 },
    { key: "infants", label: "Infants", sub: "Under 2", min: 0 },
    { key: "pets", label: "Pets", sub: "Service animals welcome", min: 0 },
  ];
  return (
    <div className="mt-2 space-y-3">
      {rows.map((r) => (
        <div
          key={r.key}
          className="flex items-center justify-between border-t border-border/60 pt-3 first:border-0 first:pt-0"
        >
          <div>
            <div className="text-sm font-medium">{r.label}</div>
            <div className="text-xs text-muted-foreground">{r.sub}</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={value[r.key] <= r.min}
              onClick={() => onChange({ ...value, [r.key]: value[r.key] - 1 })}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border disabled:opacity-40"
              aria-label={`Decrease ${r.label}`}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-4 text-center text-sm tabular-nums">
              {value[r.key]}
            </span>
            <button
              type="button"
              onClick={() => onChange({ ...value, [r.key]: value[r.key] + 1 })}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border"
              aria-label={`Increase ${r.label}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
