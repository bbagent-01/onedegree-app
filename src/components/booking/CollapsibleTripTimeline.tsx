"use client";

/**
 * Client-side collapsible wrapper around TripTimeline.
 *
 * Two collapsed modes:
 *   - "default" (trips page): shows all done stages + next 3
 *     upcoming so the reader keeps full context.
 *   - "sidebar" (inbox): shows current + next 3 (4 max), plus the
 *     last two stages (Checked out / Reviewed) as anchors with an
 *     ellipsis divider between the two slices when there's a gap.
 *     Keeps the sidebar short so it doesn't push payment handles
 *     and the counterparty card below the fold.
 *
 * Header row is clickable to toggle. Expanded view always shows
 * every stage the resolver produced regardless of mode.
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
  /**
   * Collapsed-state trimming strategy.
   *   "default" — done stages + next 3 upcoming (trips-page default).
   *   "sidebar" — current + next 3, plus last two anchor stages with
   *   an ellipsis divider when there's a gap.
   */
  mode?: "default" | "sidebar";
}

/** Slice the stage list to the default collapsed view: all done + next 3. */
export function trimmedStages(stages: TimelineStage[]): TimelineStage[] {
  const done = stages.filter((s) => s.status === "done");
  const rest = stages.filter((s) => s.status !== "done");
  return [...done, ...rest.slice(0, 3)];
}

/**
 * Sidebar-mode trimming. Returns the top slice (current + up to 3
 * upcoming), and optionally the last-two anchor pair split off when a
 * gap exists between the two slices.
 */
function sidebarTrimmed(stages: TimelineStage[]): {
  top: TimelineStage[];
  anchor: TimelineStage[]; // empty when no gap
} {
  if (stages.length === 0) return { top: [], anchor: [] };

  // Find the "current" anchor; fall back to the first upcoming. If
  // neither exists (everything's done) the whole list renders as-is.
  const currentIdx = stages.findIndex((s) => s.status === "current");
  const upcomingIdx = stages.findIndex((s) => s.status === "upcoming");
  const startIdx =
    currentIdx >= 0 ? currentIdx : upcomingIdx >= 0 ? upcomingIdx : -1;

  if (startIdx < 0) {
    return { top: stages, anchor: [] };
  }

  const topEnd = Math.min(stages.length, startIdx + 4); // current + 3
  const anchorStart = Math.max(0, stages.length - 2);

  // If the top slice already reaches the anchor pair, render the
  // contiguous run from current → end (no ellipsis needed).
  if (topEnd >= anchorStart) {
    return { top: stages.slice(startIdx), anchor: [] };
  }

  return {
    top: stages.slice(startIdx, topEnd),
    anchor: stages.slice(anchorStart),
  };
}

export function CollapsibleTripTimeline({
  stages,
  compact = false,
  defaultOpen = false,
  mode = "default",
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const current =
    stages.find((s) => s.status === "current") ??
    stages.find((s) => s.status === "upcoming");

  // Derive the collapsed view per mode.
  const collapsed =
    mode === "sidebar"
      ? sidebarTrimmed(stages)
      : { top: trimmedStages(stages), anchor: [] as TimelineStage[] };

  const hiddenCount =
    stages.length - (collapsed.top.length + collapsed.anchor.length);

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
        {open ? (
          <TripTimeline stages={stages} compact={compact} />
        ) : collapsed.anchor.length > 0 ? (
          <div className={cn("space-y-2")}>
            <TripTimeline stages={collapsed.top} compact={compact} />
            <div
              aria-hidden
              className="pl-[11px] text-xs font-semibold leading-none text-muted-foreground/70"
            >
              &middot;&middot;&middot;
            </div>
            <TripTimeline stages={collapsed.anchor} compact={compact} />
          </div>
        ) : (
          <TripTimeline stages={collapsed.top} compact={compact} />
        )}
      </div>
    </div>
  );
}
