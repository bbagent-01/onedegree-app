"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  AvailabilityRange,
  BookedStay,
  DayInfo,
  DayStatus,
} from "./types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_COLORS: Record<DayStatus, string> = {
  available: "bg-emerald-100 text-emerald-900 border-emerald-200",
  possibly_available: "bg-amber-100 text-amber-900 border-amber-200",
  blocked: "bg-gray-100 text-gray-400 border-gray-200",
  booked: "bg-violet-100 text-violet-900 border-violet-200",
  prep: "bg-gray-50 text-gray-400 border-dashed border-gray-300",
  empty: "bg-white text-foreground-secondary border-transparent",
};

function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return formatDateStr(d);
}

interface CalendarGridProps {
  ranges: AvailabilityRange[];
  bookedStays: BookedStay[];
  prepDays: number;
  mode: "edit" | "readonly";
  onSelectRange?: (start: string, end: string) => void;
  onBookedStayClick?: (stayId: string) => void;
}

export function CalendarGrid({
  ranges,
  bookedStays,
  prepDays,
  mode,
  onSelectRange,
  onBookedStayClick,
}: CalendarGridProps) {
  const today = new Date();
  const todayStr = formatDateStr(today);
  const [baseMonth, setBaseMonth] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));

  // Selection state for click-drag
  const [selectStart, setSelectStart] = useState<string | null>(null);
  const [selectEnd, setSelectEnd] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);

  // Build day status map + guest info for booked days
  const { dayMap, bookedGuestMap } = useMemo(() => {
    const map = new Map<string, { status: DayStatus; price: number | null; rangeId: string | null }>();
    const guestMap = new Map<string, { stayId: string; guestName?: string; guestAvatar?: string | null }>();

    // 1. Availability ranges
    for (const range of ranges) {
      let d = range.start_date;
      while (d <= range.end_date) {
        map.set(d, {
          status: range.status as DayStatus,
          price: range.custom_price_per_night,
          rangeId: range.id,
        });
        d = addDays(d, 1);
      }
    }

    // 2. Booked stays (override availability)
    for (const stay of bookedStays) {
      let d = stay.check_in;
      while (d < stay.check_out) {
        map.set(d, { status: "booked", price: null, rangeId: null });
        guestMap.set(d, {
          stayId: stay.id,
          guestName: stay.guest_name,
          guestAvatar: stay.guest_avatar_url,
        });
        d = addDays(d, 1);
      }
    }

    // 3. Prep days around booked stays
    if (prepDays > 0) {
      for (const stay of bookedStays) {
        for (let i = 1; i <= prepDays; i++) {
          const prepDate = addDays(stay.check_in, -i);
          const existing = map.get(prepDate);
          if (!existing || (existing.status !== "booked")) {
            map.set(prepDate, { status: "prep", price: null, rangeId: null });
          }
        }
        for (let i = 0; i < prepDays; i++) {
          const prepDate = addDays(stay.check_out, i);
          const existing = map.get(prepDate);
          if (!existing || (existing.status !== "booked")) {
            map.set(prepDate, { status: "prep", price: null, rangeId: null });
          }
        }
      }
    }

    return { dayMap: map, bookedGuestMap: guestMap };
  }, [ranges, bookedStays, prepDays]);

  function getDayInfo(dateStr: string): DayInfo {
    const entry = dayMap.get(dateStr);
    return {
      date: dateStr,
      status: entry?.status ?? "empty",
      price: entry?.price ?? null,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
      rangeId: entry?.rangeId ?? null,
    };
  }

  function getBookedGuest(dateStr: string) {
    return bookedGuestMap.get(dateStr) ?? null;
  }

  const handleDayClick = useCallback(
    (dateStr: string) => {
      if (mode !== "edit") return;
      const info = getDayInfo(dateStr);

      // Booked days → open the stay instead of selecting
      if (info.status === "booked") {
        const guest = bookedGuestMap.get(dateStr);
        if (guest && onBookedStayClick) {
          onBookedStayClick(guest.stayId);
        }
        return;
      }
      if (info.status === "prep") return;

      if (!selecting) {
        setSelectStart(dateStr);
        setSelectEnd(dateStr);
        setSelecting(true);
      } else {
        const start = selectStart!;
        const end = dateStr;
        const [finalStart, finalEnd] = start <= end ? [start, end] : [end, start];
        setSelecting(false);
        setSelectStart(null);
        setSelectEnd(null);
        onSelectRange?.(finalStart, finalEnd);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, selecting, selectStart, onSelectRange, onBookedStayClick, bookedGuestMap]
  );

  const handleDayHover = useCallback(
    (dateStr: string) => {
      if (selecting && selectStart) {
        setSelectEnd(dateStr);
      }
    },
    [selecting, selectStart]
  );

  function isInSelection(dateStr: string): boolean {
    if (!selectStart || !selectEnd) return false;
    const [s, e] =
      selectStart <= selectEnd
        ? [selectStart, selectEnd]
        : [selectEnd, selectStart];
    return dateStr >= s && dateStr <= e;
  }

  function navigateMonth(direction: -1 | 1) {
    setBaseMonth((prev) => {
      let m = prev.month + direction;
      let y = prev.year;
      if (m < 0) {
        m = 11;
        y--;
      } else if (m > 11) {
        m = 0;
        y++;
      }
      return { year: y, month: m };
    });
  }

  const secondMonth = {
    year: baseMonth.month === 11 ? baseMonth.year + 1 : baseMonth.year,
    month: (baseMonth.month + 1) % 12,
  };

  const monthLabel = (y: number, m: number) =>
    new Date(y, m).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateMonth(-1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex gap-8 text-sm font-semibold text-foreground">
          <span>{monthLabel(baseMonth.year, baseMonth.month)}</span>
          <span className="hidden md:inline">
            {monthLabel(secondMonth.year, secondMonth.month)}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateMonth(1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Calendar grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MonthGrid
          year={baseMonth.year}
          month={baseMonth.month}
          getDayInfo={getDayInfo}
          getBookedGuest={getBookedGuest}
          isInSelection={isInSelection}
          onDayClick={handleDayClick}
          onDayHover={handleDayHover}
          mode={mode}
          selecting={selecting}
        />
        <div className="hidden md:block">
          <MonthGrid
            year={secondMonth.year}
            month={secondMonth.month}
            getDayInfo={getDayInfo}
            getBookedGuest={getBookedGuest}
            isInSelection={isInSelection}
            onDayClick={handleDayClick}
            onDayHover={handleDayHover}
            mode={mode}
            selecting={selecting}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-foreground-secondary">
        {mode === "edit" ? (
          <>
            <LegendDot color="bg-emerald-200" label="Available" />
            <LegendDot color="bg-amber-200" label="Possibly available" />
            <LegendDot color="bg-gray-200" label="Blocked" />
            <LegendDot color="bg-violet-200" label="Booked" />
            <LegendDot color="bg-gray-100 border border-dashed border-gray-300" label="Prep day" />
          </>
        ) : (
          <>
            <LegendDot color="bg-emerald-200" label="Available" />
            <LegendDot color="bg-amber-200" label="Possibly available" />
            <LegendDot color="bg-violet-200" label="Booked" />
          </>
        )}
      </div>

      {selecting && mode === "edit" && (
        <p className="mt-2 text-xs text-primary font-medium">
          Click another date to complete your selection
        </p>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("size-3 rounded-sm", color)} />
      <span>{label}</span>
    </div>
  );
}

function MonthGrid({
  year,
  month,
  getDayInfo,
  getBookedGuest,
  isInSelection,
  onDayClick,
  onDayHover,
  mode,
  selecting,
}: {
  year: number;
  month: number;
  getDayInfo: (date: string) => DayInfo;
  getBookedGuest: (date: string) => { stayId: string; guestName?: string; guestAvatar?: string | null } | null;
  isInSelection: (date: string) => boolean;
  onDayClick: (date: string) => void;
  onDayHover: (date: string) => void;
  mode: "edit" | "readonly";
  selecting: boolean;
}) {
  const days = getMonthDays(year, month);
  const firstDayOfWeek = days[0].getDay();

  return (
    <div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-medium text-foreground-tertiary py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px">
        {/* Empty cells for offset */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {days.map((date) => {
          const dateStr = formatDateStr(date);
          const info = getDayInfo(dateStr);
          const guest = getBookedGuest(dateStr);
          const inSelection = isInSelection(dateStr);
          const isInteractive =
            mode === "edit" &&
            info.status !== "prep";
          const isBookedClickable = mode === "edit" && info.status === "booked";

          // In readonly mode, hide blocked/prep dates (show as empty), but show booked
          const displayStatus =
            mode === "readonly" && (info.status === "blocked" || info.status === "prep")
              ? "empty"
              : info.status;

          return (
            <button
              key={dateStr}
              type="button"
              disabled={!isInteractive && mode === "edit"}
              onClick={() => onDayClick(dateStr)}
              onMouseEnter={() => onDayHover(dateStr)}
              title={
                info.status === "booked" && guest?.guestName
                  ? `${guest.guestName} — Click to view stay`
                  : undefined
              }
              className={cn(
                "aspect-square flex flex-col items-center justify-center rounded-lg text-xs relative transition-all border",
                STATUS_COLORS[displayStatus],
                info.isToday && "ring-2 ring-primary ring-offset-1",
                info.isPast && mode === "edit" && "opacity-40",
                inSelection && "ring-2 ring-primary/60 bg-primary-light/50",
                isInteractive && !isBookedClickable && "cursor-pointer hover:ring-2 hover:ring-primary/40",
                isBookedClickable && "cursor-pointer hover:ring-2 hover:ring-violet-400",
                selecting && isInteractive && !isBookedClickable && "cursor-crosshair",
                !isInteractive && mode === "edit" && "cursor-default"
              )}
            >
              {/* Guest avatar on booked days (edit mode) */}
              {info.status === "booked" && guest?.guestAvatar && mode === "edit" && (
                <img
                  src={guest.guestAvatar}
                  alt=""
                  className="absolute -top-1 -right-1 size-4 rounded-full border border-white object-cover"
                />
              )}
              {/* Guest initial on booked days without avatar (edit mode) */}
              {info.status === "booked" && !guest?.guestAvatar && guest?.guestName && mode === "edit" && (
                <span className="absolute -top-1 -right-1 size-4 rounded-full bg-violet-300 border border-white flex items-center justify-center text-[7px] font-bold text-white">
                  {guest.guestName.charAt(0)}
                </span>
              )}
              <span className="font-medium">{date.getDate()}</span>
              {info.price !== null && displayStatus !== "empty" && (
                <span className="text-[8px] leading-none opacity-70">
                  ${Math.round(info.price)}
                </span>
              )}
              {/* Show guest first name on booked days in edit mode */}
              {info.status === "booked" && guest?.guestName && mode === "edit" && (
                <span className="text-[7px] leading-none text-violet-700 truncate max-w-full px-0.5">
                  {guest.guestName.split(" ")[0]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
