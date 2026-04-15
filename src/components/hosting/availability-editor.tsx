"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Range {
  id: string;
  start_date: string;
  end_date: string;
  status: "available" | "possibly_available" | "blocked";
  custom_price_per_night?: number | null;
}

interface BookedStay {
  id: string;
  check_in: string;
  check_out: string;
}

interface Props {
  listingId: string;
  /** Default nightly price — shown as a tiny label on every available date. */
  defaultPrice?: number | null;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function nightsBetween(start: string, end: string) {
  const s = parseYmd(start);
  const e = parseYmd(end);
  return Math.max(
    1,
    Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Smart range: "May 5 – 12, 2026" | "May 5 – Jun 5, 2026" | "Dec 25, 2026 – Jan 5, 2027" */
function formatRange(startIso: string, endIso: string) {
  const s = parseYmd(startIso);
  const e = parseYmd(endIso);
  const sm = MONTHS_SHORT[s.getMonth()];
  const em = MONTHS_SHORT[e.getMonth()];
  const sd = s.getDate();
  const ed = e.getDate();
  const sy = s.getFullYear();
  const ey = e.getFullYear();
  if (sy !== ey) return `${sm} ${sd}, ${sy} – ${em} ${ed}, ${ey}`;
  if (s.getMonth() !== e.getMonth()) return `${sm} ${sd} – ${em} ${ed}, ${sy}`;
  if (sd === ed) return `${sm} ${sd}, ${sy}`;
  return `${sm} ${sd}–${ed}, ${sy}`;
}

/** Number of months to render in the long-scroll view. */
const MONTHS_AHEAD = 12;

export function AvailabilityEditor({ listingId, defaultPrice }: Props) {
  const [ranges, setRanges] = useState<Range[]>([]);
  const [booked, setBooked] = useState<BookedStay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selStart, setSelStart] = useState<string | null>(null);
  const [selEnd, setSelEnd] = useState<string | null>(null);
  const [customPrice, setCustomPrice] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/availability`);
      if (res.ok) {
        const data = await res.json();
        setRanges(data.ranges || []);
        setBooked(data.bookedStays || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  // Build a status + price map for all loaded dates
  const statusByDate = useMemo(() => {
    const map = new Map<
      string,
      { status: "available" | "blocked" | "booked"; price?: number | null }
    >();
    for (const r of ranges) {
      const s = parseYmd(r.start_date);
      const e = parseYmd(r.end_date);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        map.set(ymd(d), {
          status: r.status === "blocked" ? "blocked" : "available",
          price: r.custom_price_per_night,
        });
      }
    }
    for (const b of booked) {
      const s = parseYmd(b.check_in);
      const e = parseYmd(b.check_out);
      for (let d = new Date(s); d < e; d.setDate(d.getDate() + 1)) {
        map.set(ymd(d), { status: "booked" });
      }
    }
    return map;
  }, [ranges, booked]);

  const selectionRange = useMemo(() => {
    if (!selStart) return null;
    const a = selStart;
    const b = selEnd || selStart;
    return a <= b ? { start: a, end: b } : { start: b, end: a };
  }, [selStart, selEnd]);

  const inSelection = (date: string) => {
    if (!selectionRange) return false;
    return date >= selectionRange.start && date <= selectionRange.end;
  };

  const clearSelection = () => {
    setSelStart(null);
    setSelEnd(null);
    setCustomPrice("");
  };

  const handleDayClick = (date: string) => {
    if (!selStart || (selStart && selEnd)) {
      setSelStart(date);
      setSelEnd(null);
    } else {
      setSelEnd(date);
    }
  };

  const applyStatus = async (status: "available" | "blocked") => {
    if (!selectionRange) {
      toast.error("Select a date range first");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        start_date: selectionRange.start,
        end_date: selectionRange.end,
        status,
      };
      if (status === "available" && customPrice) {
        body.custom_price_per_night = Number(customPrice);
      }
      const res = await fetch(`/api/listings/${listingId}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(status === "blocked" ? "Dates blocked" : "Dates updated");
      clearSelection();
      await loadData();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Build the list of months to render.
  const months = useMemo(() => {
    const start = new Date();
    start.setDate(1);
    const list: { year: number; month: number; label: string }[] = [];
    for (let i = 0; i < MONTHS_AHEAD; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      list.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleString("en-US", { month: "long", year: "numeric" }),
      });
    }
    return list;
  }, []);

  const todayIso = ymd(new Date());

  const selectedNights = selectionRange
    ? nightsBetween(selectionRange.start, selectionRange.end)
    : 0;

  const renderMonth = (m: { year: number; month: number; label: string }) => {
    const firstDow = new Date(m.year, m.month, 1).getDay();
    const totalDays = daysInMonth(m.year, m.month);
    const days: (string | null)[] = [];
    for (let i = 0; i < firstDow; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) {
      days.push(ymd(new Date(m.year, m.month, d)));
    }
    return (
      <div key={m.label} className="space-y-2">
        <div className="sticky top-0 z-10 -mx-5 border-b border-border bg-white/95 px-5 py-2 text-base font-bold text-foreground backdrop-blur md:-mx-6 md:px-6">
          {m.label}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, idx) => {
            if (!d) return <div key={`empty-${idx}`} />;
            const info = statusByDate.get(d);
            const status = info?.status;
            const customPx = info?.price;
            const displayPrice =
              status === "available" && customPx != null
                ? customPx
                : defaultPrice;
            const isPast = d < todayIso;
            const isToday = d === todayIso;
            const selected = inSelection(d);
            const disabled = isPast || status === "booked";
            return (
              <button
                key={d}
                type="button"
                disabled={disabled}
                onClick={() => handleDayClick(d)}
                className={cn(
                  "group relative flex min-h-[58px] flex-col items-start justify-between rounded-lg border p-1.5 text-left transition-all",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  !disabled && "hover:border-brand hover:shadow-sm",
                  status === "blocked"
                    ? "border-zinc-300 bg-[repeating-linear-gradient(45deg,theme(colors.zinc.100)_0,theme(colors.zinc.100)_6px,theme(colors.zinc.200)_6px,theme(colors.zinc.200)_12px)]"
                    : status === "booked"
                      ? "border-brand/30 bg-brand/10"
                      : "border-border bg-white",
                  selected &&
                    "!border-brand !bg-brand/20 !shadow-md ring-2 ring-brand/30"
                )}
              >
                <span
                  className={cn(
                    "text-xs font-semibold",
                    status === "blocked"
                      ? "text-zinc-500 line-through"
                      : status === "booked"
                        ? "text-brand/70 line-through"
                        : "text-foreground",
                    isToday && "text-brand",
                    selected && "!text-brand"
                  )}
                >
                  {Number(d.slice(-2))}
                </span>
                {isToday && !selected && (
                  <span className="absolute right-1 top-1 h-1 w-1 rounded-full bg-brand" />
                )}
                {!disabled && status !== "blocked" && displayPrice != null && (
                  <span
                    className={cn(
                      "text-[9px] font-semibold leading-none",
                      customPx != null
                        ? "text-emerald-700"
                        : "text-muted-foreground"
                    )}
                  >
                    ${displayPrice}
                  </span>
                )}
                {status === "blocked" && (
                  <span className="text-[9px] font-semibold uppercase text-zinc-500">
                    Blocked
                  </span>
                )}
                {status === "booked" && (
                  <span className="text-[9px] font-semibold uppercase text-brand">
                    Booked
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left: scrollable multi-month calendar (spans 2 cols on desktop) */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm md:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div
                ref={scrollRef}
                className="max-h-[640px] space-y-6 overflow-y-auto pr-1"
              >
                {months.map(renderMonth)}
              </div>

              {/* Legend */}
              <div className="mt-5 flex flex-wrap gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded border border-border bg-white" />
                  Available
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded border border-zinc-300 bg-[repeating-linear-gradient(45deg,theme(colors.zinc.100)_0,theme(colors.zinc.100)_3px,theme(colors.zinc.200)_3px,theme(colors.zinc.200)_6px)]" />
                  Blocked
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded border border-brand/30 bg-brand/10" />
                  Booked
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded border border-brand bg-brand/20" />
                  Selected
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: sticky sidebar editor */}
      <div className="lg:col-span-1">
        <div className="lg:sticky lg:top-24">
          <div
            className={cn(
              "rounded-2xl border p-5 shadow-sm transition-colors md:p-6",
              selectionRange
                ? "border-brand bg-brand/5"
                : "border-dashed border-border bg-muted/30"
            )}
          >
            {selectionRange ? (
              <div className="space-y-5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-brand">
                    Date range selected
                  </div>
                  <div className="mt-1.5 text-lg font-bold leading-snug text-foreground">
                    {formatRange(selectionRange.start, selectionRange.end)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {selectedNights} night{selectedNights === 1 ? "" : "s"}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Custom $/night (optional)
                  </label>
                  <Input
                    type="number"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder={
                      defaultPrice != null
                        ? `default $${defaultPrice}`
                        : "e.g. 199"
                    }
                    className="h-11 w-full rounded-xl border-2 border-border !bg-white px-3 text-base font-medium shadow-sm focus-visible:border-brand"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    onClick={() => applyStatus("available")}
                    disabled={saving}
                    className="!h-11 !rounded-xl !text-sm !font-semibold bg-brand hover:bg-brand-600"
                  >
                    Mark available
                  </Button>
                  <Button
                    type="button"
                    onClick={() => applyStatus("blocked")}
                    disabled={saving}
                    className="!h-11 !rounded-xl !text-sm !font-semibold bg-zinc-700 hover:bg-zinc-800"
                  >
                    Block dates
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearSelection}
                    disabled={saving}
                    className="!h-11 !rounded-xl !text-sm !font-semibold"
                  >
                    <X className="mr-1 h-4 w-4" />
                    Clear selection
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">
                  How to edit dates
                </p>
                <ol className="mt-3 space-y-2 list-decimal pl-4">
                  <li>Click a start date in the calendar.</li>
                  <li>Click an end date to complete the range.</li>
                  <li>
                    Block the range, or mark it available with an optional
                    custom nightly price.
                  </li>
                </ol>
                {defaultPrice != null && (
                  <p className="mt-4 rounded-lg bg-white p-3 text-xs">
                    Your default nightly price is{" "}
                    <span className="font-semibold text-foreground">
                      ${defaultPrice}
                    </span>
                    . Each available date in the calendar shows this price;
                    set a custom price above to override it for a range.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
