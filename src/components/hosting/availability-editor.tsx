"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
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

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
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

export function AvailabilityEditor({ listingId }: Props) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [ranges, setRanges] = useState<Range[]>([]);
  const [booked, setBooked] = useState<BookedStay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selStart, setSelStart] = useState<string | null>(null);
  const [selEnd, setSelEnd] = useState<string | null>(null);
  const [customPrice, setCustomPrice] = useState("");

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

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const totalDays = daysInMonth(year, month);
  const monthLabel = cursor.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
  const todayIso = ymd(new Date());

  const days: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) days.push(null);
  for (let d = 1; d <= totalDays; d++) {
    days.push(ymd(new Date(year, month, d)));
  }

  const selectedNights = selectionRange
    ? nightsBetween(selectionRange.start, selectionRange.end)
    : 0;

  return (
    <div className="space-y-5">
      {/* Month header */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-white px-5 py-4 shadow-sm">
        <button
          type="button"
          onClick={() => setCursor((c) => addMonths(c, -1))}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-foreground/40"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-lg font-bold text-foreground md:text-xl">
          {monthLabel}
        </div>
        <button
          type="button"
          onClick={() => setCursor((c) => addMonths(c, 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-foreground/40"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Calendar card */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1.5">
              {days.map((d, idx) => {
                if (!d) return <div key={idx} />;
                const info = statusByDate.get(d);
                const status = info?.status;
                const price = info?.price;
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
                      "group relative flex min-h-[68px] flex-col items-start justify-between rounded-xl border-2 p-2 text-left transition-all",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      !disabled && "hover:border-brand hover:shadow-sm",
                      status === "blocked"
                        ? "border-red-200 bg-red-50"
                        : status === "booked"
                          ? "border-zinc-200 bg-zinc-100"
                          : "border-border bg-white",
                      selected &&
                        "!border-brand !bg-brand/10 !shadow-md ring-2 ring-brand/30"
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        status === "blocked"
                          ? "text-red-700 line-through"
                          : status === "booked"
                            ? "text-zinc-400 line-through"
                            : "text-foreground",
                        isToday && "text-brand",
                        selected && "!text-brand"
                      )}
                    >
                      {Number(d.slice(-2))}
                    </span>
                    {isToday && !selected && (
                      <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
                    )}
                    {price && status !== "blocked" && status !== "booked" && (
                      <span className="text-[10px] font-semibold text-emerald-700">
                        ${price}
                      </span>
                    )}
                    {status === "blocked" && (
                      <span className="text-[10px] font-semibold uppercase text-red-600">
                        Blocked
                      </span>
                    )}
                    {status === "booked" && (
                      <span className="text-[10px] font-semibold uppercase text-zinc-500">
                        Booked
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-5 flex flex-wrap gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded border-2 border-border bg-white" />
                Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded border-2 border-red-200 bg-red-50" />
                Blocked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded border-2 border-zinc-200 bg-zinc-100" />
                Booked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded border-2 border-brand bg-brand/10" />
                Selected
              </span>
            </div>
          </>
        )}
      </div>

      {/* Selection action bar */}
      <div
        className={cn(
          "rounded-2xl border-2 p-5 shadow-sm transition-colors md:p-6",
          selectionRange
            ? "border-brand bg-brand/5"
            : "border-dashed border-border bg-muted/30"
        )}
      >
        {selectionRange ? (
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-brand">
                Date range selected
              </div>
              <div className="mt-1 text-base font-bold text-foreground">
                {selectionRange.start} → {selectionRange.end}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {selectedNights} night{selectedNights === 1 ? "" : "s"} ·
                click{" "}
                <button
                  type="button"
                  onClick={clearSelection}
                  className="underline hover:text-foreground"
                >
                  clear
                </button>{" "}
                to start over
              </div>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Custom $/night (optional)
                </label>
                <Input
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="e.g. 199"
                  className="h-12 w-40 rounded-xl border-2 border-border !bg-white px-3 text-base font-medium shadow-sm focus-visible:border-brand"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearSelection}
                  disabled={saving}
                  className="!h-12 !rounded-xl !px-5 !text-sm !font-semibold"
                >
                  <X className="mr-1 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => applyStatus("blocked")}
                  disabled={saving}
                  className="!h-12 !rounded-xl !px-5 !text-sm !font-semibold bg-red-600 hover:bg-red-700"
                >
                  Block dates
                </Button>
                <Button
                  type="button"
                  onClick={() => applyStatus("available")}
                  disabled={saving}
                  className="!h-12 !rounded-xl !px-5 !text-sm !font-semibold bg-brand hover:bg-brand-600"
                >
                  Mark available
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              Click a start date, then an end date to select a range.
            </p>
            <p className="mt-1">
              Then block it off, or mark it available with an optional custom
              nightly price.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
