"use client";

/**
 * Client-side collapsible wrapper around TripTimeline.
 *
 * Collapsed view (unified across trips page + inbox sidebar since
 * S7): most-recent-completed stage at the top, then the next 3
 * upcoming/current stages. Drops the previous "last-two anchor"
 * pattern — it added a second slice with an ellipsis divider that
 * cluttered the card without adding context.
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
   * Retained for backwards-compatible call sites; both values now
   * feed the same unified trimmer (most recent done + next 3).
   */
  mode?: "default" | "sidebar";
}

/**
 * Unified collapsed-view slicer (S7): the most recent completed
 * stage at the top, then the next 3 not-yet-done stages (current +
 * upcoming). Keeps the reader's eye on "where I am" without burying
 * it under the earlier history; stops short of the trailing anchor
 * pair that the sidebar variant used to surface.
 */
export function trimmedStages(stages: TimelineStage[]): TimelineStage[] {
  if (stages.length === 0) return [];
  const doneStages = stages.filter((s) => s.status === "done");
  const mostRecentDone = doneStages[doneStages.length - 1] ?? null;
  const notDone = stages.filter((s) => s.status !== "done");
  const nextThree = notDone.slice(0, 3);
  return mostRecentDone ? [mostRecentDone, ...nextThree] : nextThree;
}

export function CollapsibleTripTimeline({
  stages,
  compact = false,
  defaultOpen = false,
  // `mode` retained for call-site compatibility; the trimmer is now
  // unified and ignores it.
  mode: _mode = "default",
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const current =
    stages.find((s) => s.status === "current") ??
    stages.find((s) => s.status === "upcoming");

  const collapsed = trimmedStages(stages);
  const hiddenCount = stages.length - collapsed.length;

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
        ) : (
          <TripTimeline stages={collapsed} compact={compact} />
        )}
      </div>
    </div>
  );
}
