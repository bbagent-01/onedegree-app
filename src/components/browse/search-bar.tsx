"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Minus, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";

interface SearchBarProps {
  suggestions: { areas: string[]; titles: string[] };
  compact?: boolean;
}

interface GuestCounts {
  adults: number;
  children: number;
  infants: number;
  pets: number;
}

function formatRange(from?: string, to?: string) {
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

function formatGuests(g: GuestCounts) {
  const total = g.adults + g.children;
  if (total === 0 && g.infants === 0 && g.pets === 0) return "Add guests";
  const parts: string[] = [];
  if (total) parts.push(`${total} guest${total === 1 ? "" : "s"}`);
  if (g.infants) parts.push(`${g.infants} infant${g.infants === 1 ? "" : "s"}`);
  if (g.pets) parts.push(`${g.pets} pet${g.pets === 1 ? "" : "s"}`);
  return parts.join(", ");
}

export function SearchBar({ suggestions, compact }: SearchBarProps) {
  const router = useRouter();
  const params = useSearchParams();

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

  const [locOpen, setLocOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const locInputRef = useRef<HTMLInputElement>(null);

  const updateUrl = useCallback(
    (next: {
      location?: string;
      from?: string;
      to?: string;
      guests?: number;
    }) => {
      const url = new URLSearchParams(params.toString());
      const set = (k: string, v?: string) => {
        if (v) url.set(k, v);
        else url.delete(k);
      };
      set("location", next.location);
      set("from", next.from);
      set("to", next.to);
      set(
        "guests",
        next.guests && next.guests > 0 ? String(next.guests) : undefined
      );
      router.push(`/browse?${url.toString()}`);
    },
    [params, router]
  );

  // Debounced location push
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (location !== (params.get("location") ?? "")) {
        updateUrl({
          location: location || undefined,
          from: params.get("from") ?? undefined,
          to: params.get("to") ?? undefined,
          guests: parseInt(params.get("guests") ?? "0", 10) || undefined,
        });
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const filteredSuggestions = useMemo(() => {
    const q = location.trim().toLowerCase();
    if (!q) return suggestions.areas.slice(0, 8);
    const pool = [
      ...new Set([...suggestions.areas, ...suggestions.titles]),
    ];
    return pool.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);
  }, [location, suggestions]);

  const commitDates = (r: DateRange | undefined) => {
    setRange(r);
    const from = r?.from ? format(r.from, "yyyy-MM-dd") : undefined;
    const to = r?.to ? format(r.to, "yyyy-MM-dd") : undefined;
    updateUrl({
      location: location || undefined,
      from,
      to,
      guests: guests.adults + guests.children || undefined,
    });
  };

  const commitGuests = (g: GuestCounts) => {
    setGuests(g);
    updateUrl({
      location: location || undefined,
      from: range?.from ? format(range.from, "yyyy-MM-dd") : undefined,
      to: range?.to ? format(range.to, "yyyy-MM-dd") : undefined,
      guests: g.adults + g.children || undefined,
    });
  };

  const submitSearch = () => {
    updateUrl({
      location: location || undefined,
      from: range?.from ? format(range.from, "yyyy-MM-dd") : undefined,
      to: range?.to ? format(range.to, "yyyy-MM-dd") : undefined,
      guests: guests.adults + guests.children || undefined,
    });
  };

  return (
    <div
      className={cn(
        "flex items-center rounded-full border border-border bg-white shadow-sm hover:shadow transition-shadow",
        compact ? "h-12" : "h-14"
      )}
    >
      {/* Location */}
      <Popover open={locOpen} onOpenChange={setLocOpen}>
        <PopoverTrigger
          className="flex h-full flex-1 flex-col justify-center rounded-l-full px-6 text-left hover:bg-muted transition-colors"
          onClick={() => {
            setTimeout(() => locInputRef.current?.focus(), 0);
          }}
        >
          <span className="text-xs font-semibold">Where</span>
          <span
            className={cn(
              "text-sm truncate",
              location ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {location || "Search destinations"}
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-3">
          <input
            ref={locInputRef}
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Search destinations"
            className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/30"
          />
          {filteredSuggestions.length > 0 && (
            <ul className="mt-2 max-h-64 overflow-auto">
              {filteredSuggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => {
                      setLocation(s);
                      setLocOpen(false);
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PopoverContent>
      </Popover>

      <span className="h-8 w-px bg-border" />

      {/* Dates */}
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger className="flex h-full flex-col justify-center px-6 text-left hover:bg-muted transition-colors">
          <span className="text-xs font-semibold">When</span>
          <span className="text-sm text-muted-foreground">
            {formatRange(
              range?.from ? format(range.from, "yyyy-MM-dd") : undefined,
              range?.to ? format(range.to, "yyyy-MM-dd") : undefined
            )}
          </span>
        </PopoverTrigger>
        <PopoverContent align="center" className="w-auto p-2">
          <Calendar
            mode="range"
            numberOfMonths={
              typeof window !== "undefined" && window.innerWidth < 768 ? 1 : 2
            }
            selected={range}
            onSelect={commitDates}
            disabled={{ before: new Date() }}
          />
          {(range?.from || range?.to) && (
            <div className="mt-2 flex justify-end px-2">
              <button
                type="button"
                onClick={() => commitDates(undefined)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Clear dates
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <span className="h-8 w-px bg-border" />

      {/* Guests */}
      <Popover open={guestsOpen} onOpenChange={setGuestsOpen}>
        <PopoverTrigger className="flex h-full flex-col justify-center px-6 text-left hover:bg-muted transition-colors">
          <span className="text-xs font-semibold">Who</span>
          <span className="text-sm text-muted-foreground">
            {formatGuests(guests)}
          </span>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-4">
          <GuestCounter value={guests} onChange={commitGuests} />
        </PopoverContent>
      </Popover>

      <button
        type="button"
        onClick={submitSearch}
        aria-label="Search"
        className="m-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-600 transition-colors"
      >
        <Search className="h-4 w-4" />
      </button>
    </div>
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
    { key: "pets", label: "Pets", sub: "Bringing a service animal?", min: 0 },
  ];

  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.key} className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{r.label}</div>
            <div className="text-xs text-muted-foreground">{r.sub}</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={value[r.key] <= r.min}
              onClick={() =>
                onChange({ ...value, [r.key]: value[r.key] - 1 })
              }
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
              onClick={() =>
                onChange({ ...value, [r.key]: value[r.key] + 1 })
              }
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
