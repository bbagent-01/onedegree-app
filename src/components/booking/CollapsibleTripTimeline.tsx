"use client";

/**
 * Client-side collapsible wrapper around TripTimeline.
 *
 * Collapsed view shows all "done" stages plus the next three
 * (current + upcoming) so the reader keeps full context of what's
 * been accomplished and what's coming up soon, but the tail of
 * post-stage stages stays hidden until expanded. Expanded view
 * shows every stage the resolver produced.
 *
 * Header row is clickable to toggle. Used in the inbox sidebar
 * (compact variant) and on /trips/[bookingId].
 */

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TripTimeline } from "./TripTimeline";
import type { TimelineStage } from "@/lib/booking-stage";

interface Props {
  stages: TimelineStage[];
  /** Compact = inbox-sidebar variant (tighter, no per-stage detail). */
  compact?: boolean;
  /** When true, the collapsible starts open. Default false. */
  defaultOpen?: boolean;
}

/** Slice the stage list to the collapsed view: all done + next 3. */
export function trimmedStages(stages: TimelineStage[]): TimelineStage[] {
  const done = stages.filter((s) => s.status === "done");
  const rest = stages.filter((s) => s.status !== "done");
  return [...done, ...rest.slice(0, 3)];
}

export function CollapsibleTripTimeline({
  stages,
  compact = false,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const visible = open ? stages : trimmedStages(stages);
  const hiddenCount = stages.length - visible.length;

  const current =
    stages.find((s) => s.status === "current") ??
    stages.find((s) => s.status === "upcoming");

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-white",
        compact ? "p-3" : "p-4 md:p-6"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left focus-visible:outline-none"
      >
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Trip timeline
          </div>
          <div className="mt-0.5 text-sm font-semibold">
            {current?.label ?? "All done"}
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {open
            ? "Hide"
            : hiddenCount > 0
              ? `Show ${hiddenCount} more`
              : "Show all"}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              open && "rotate-180"
            )}
          />
        </span>
      </button>

      <div
        className={cn(
          "border-t border-border",
          compact ? "mt-3 pt-3" : "mt-4 pt-4"
        )}
      >
        <TripTimeline stages={visible} compact={compact} />
      </div>
    </div>
  );
}
