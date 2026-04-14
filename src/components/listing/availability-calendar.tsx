"use client";

import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";

interface Props {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  blockedRanges: { start: string; end: string }[];
  numberOfMonths?: number;
}

function disabledMatcher(blockedRanges: { start: string; end: string }[]) {
  const disabled: Array<{ before: Date } | { from: Date; to: Date }> = [
    { before: new Date(new Date().setHours(0, 0, 0, 0)) },
  ];
  for (const r of blockedRanges) {
    disabled.push({ from: new Date(r.start), to: new Date(r.end) });
  }
  return disabled;
}

export function AvailabilityCalendar({
  value,
  onChange,
  blockedRanges,
  numberOfMonths = 2,
}: Props) {
  // Override shadcn Calendar's hardcoded --cell-size via inline style
  // (class-based override gets overridden by the component's own class).
  return (
    <div
      style={{ ["--cell-size" as string]: "2.75rem" }}
      className="text-[15px]"
    >
      <Calendar
        mode="range"
        selected={value}
        onSelect={onChange}
        numberOfMonths={numberOfMonths}
        disabled={disabledMatcher(blockedRanges)}
        showOutsideDays={false}
      />
    </div>
  );
}
