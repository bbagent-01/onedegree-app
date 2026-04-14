"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
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

  // Build a status map for current month: date (YYYY-MM-DD) -> status
  const statusByDate = useMemo(() => {
    const map = new Map<string, "available" | "blocked" | "booked">();
    for (const r of ranges) {
      const s = parseYmd(r.start_date);
      const e = parseYmd(r.end_date);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        map.set(
          ymd(d),
          r.status === "blocked" ? "blocked" : "available"
        );
      }
    }
    for (const b of booked) {
      const s = parseYmd(b.check_in);
      const e = parseYmd(b.check_out);
      for (let d = new Date(s); d < e; d.setDate(d.getDate() + 1)) {
        map.set(ymd(d), "booked");
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
      setSelStart(null);
      setSelEnd(null);
      setCustomPrice("");
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

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          Availability calendar
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCursor((c) => addMonths(c, -1))}
            className="rounded-lg p-1.5 hover:bg-muted"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[140px] text-center text-sm font-medium text-foreground">
            {monthLabel}
          </div>
          <button
            type="button"
            onClick={() => setCursor((c) => addMonths(c, 1))}
            className="rounded-lg p-1.5 hover:bg-muted"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((d, idx) => {
              if (!d) return <div key={idx} />;
              const status = statusByDate.get(d);
              const isPast = d < todayIso;
              const selected = inSelection(d);
              return (
                <button
                  key={d}
                  type="button"
                  disabled={isPast || status === "booked"}
                  onClick={() => handleDayClick(d)}
                  className={cn(
                    "relative aspect-square rounded-md border text-xs font-medium transition-colors",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    status === "blocked"
                      ? "border-red-200 bg-red-50 text-red-700 line-through"
                      : status === "booked"
                      ? "border-zinc-300 bg-zinc-100 text-zinc-400 line-through"
                      : "border-border bg-white text-foreground hover:border-brand",
                    selected && "!border-brand !bg-brand/10 !text-brand"
                  )}
                >
                  {Number(d.slice(-2))}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <div className="text-xs text-muted-foreground">
              {selectionRange
                ? `${selectionRange.start} → ${selectionRange.end}`
                : "Click a start and end date to select a range"}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Input
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="Custom $/night"
                className="h-9 w-32"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => applyStatus("available")}
                disabled={!selectionRange || saving}
              >
                Mark available
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => applyStatus("blocked")}
                disabled={!selectionRange || saving}
                className="bg-red-600 hover:bg-red-700"
              >
                Block dates
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-border bg-white" />
              Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-red-200 bg-red-50" />
              Blocked
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-zinc-300 bg-zinc-100" />
              Booked
            </span>
          </div>
        </>
      )}
    </div>
  );
}
