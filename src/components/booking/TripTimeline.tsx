import { Check, Circle, CircleDot, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimelineStage } from "@/lib/booking-stage";

interface Props {
  stages: TimelineStage[];
  /**
   * Compact mode drops per-stage detail text and shrinks the
   * spacing — used in the inbox sidebar where horizontal room is
   * tight. The full-detail variant is rendered on the reservation
   * detail page.
   */
  compact?: boolean;
}

function fmtTimestamp(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Vertical stepper for the booking / stay lifecycle. Consumes the
 * TimelineStage[] produced by `resolveStages`. Each row gets an
 * icon styled by its status:
 *   - done         → filled check, muted connecting line above
 *   - current      → filled dot, brand-colored label
 *   - upcoming     → hollow circle, muted label
 *   - future-feature → hollow circle with dashed label (clearly
 *                      not live yet, per Chunks 3–4 placeholders)
 *   - skipped      → muted filled dot
 *
 * The terminal declined/cancelled variants use an X icon and stop
 * the timeline — the resolver already trims stages after them.
 */
export function TripTimeline({ stages, compact = false }: Props) {
  return (
    <ol
      className={cn(
        "relative",
        compact ? "space-y-3" : "space-y-4"
      )}
    >
      {stages.map((stage, idx) => {
        const isLast = idx === stages.length - 1;
        const isTerminal = stage.key === "declined" || stage.key === "cancelled";
        return (
          <li key={stage.key} className="relative flex gap-3">
            {/* Connector line */}
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[11px] top-5 h-[calc(100%+0.25rem)] w-px",
                  stage.status === "done" || stage.status === "current"
                    ? "bg-foreground/40"
                    : "bg-border"
                )}
              />
            )}

            {/* Icon bubble */}
            <span
              className={cn(
                "relative z-10 mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border",
                stage.status === "done" &&
                  !isTerminal &&
                  "border-foreground bg-foreground text-background",
                stage.status === "current" &&
                  "border-brand bg-brand text-white",
                stage.status === "upcoming" &&
                  "border-border bg-white text-muted-foreground",
                stage.status === "future-feature" &&
                  "border-dashed border-border bg-white text-muted-foreground",
                stage.status === "skipped" &&
                  "border-border bg-muted text-muted-foreground",
                isTerminal && "border-zinc-500 bg-zinc-500 text-white"
              )}
            >
              {isTerminal ? (
                <XCircle className="h-3.5 w-3.5" />
              ) : stage.status === "done" ? (
                <Check className="h-3 w-3" />
              ) : stage.status === "current" ? (
                <CircleDot className="h-3 w-3" />
              ) : (
                <Circle className="h-2 w-2" />
              )}
            </span>

            {/* Label + detail */}
            <div className="min-w-0 flex-1 pb-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={cn(
                    "text-sm",
                    stage.status === "done" && "font-semibold text-foreground",
                    stage.status === "current" &&
                      "font-semibold text-foreground",
                    stage.status === "upcoming" && "text-muted-foreground",
                    stage.status === "future-feature" &&
                      "text-muted-foreground italic",
                    stage.status === "skipped" && "text-muted-foreground"
                  )}
                >
                  {stage.label}
                </span>
                {stage.at && fmtTimestamp(stage.at) && (
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {fmtTimestamp(stage.at)}
                  </span>
                )}
              </div>
              {!compact && stage.detail && (
                <p
                  className={cn(
                    "mt-0.5 text-xs leading-relaxed",
                    stage.status === "current"
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {stage.detail}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
