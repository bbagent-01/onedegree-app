"use client";

import { Calendar } from "@/components/ui/calendar";
import { getDefaultClassNames, type DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

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
  const dn = getDefaultClassNames();
  return (
    <Calendar
      mode="range"
      selected={value}
      onSelect={onChange}
      numberOfMonths={numberOfMonths}
      disabled={disabledMatcher(blockedRanges)}
      showOutsideDays={false}
      className="w-full text-[16px]"
      classNames={{
        root: cn("w-full", dn.root),
        months: cn("relative flex w-full flex-col gap-4 md:flex-row md:gap-10", dn.months),
        month: cn("flex min-w-0 flex-1 flex-col gap-4", dn.month),
      }}
    />
  );
}
