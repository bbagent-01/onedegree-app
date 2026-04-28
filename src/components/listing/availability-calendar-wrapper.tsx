"use client";

import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { AvailabilityCalendar } from "./availability-calendar";

export function AvailabilityCalendarWrapper({
  blockedRanges,
}: {
  blockedRanges: { start: string; end: string }[];
}) {
  const [range, setRange] = useState<DateRange | undefined>();
  return (
    <div className="flex justify-center">
      <AvailabilityCalendar
        value={range}
        onChange={setRange}
        blockedRanges={blockedRanges}
      />
    </div>
  );
}
