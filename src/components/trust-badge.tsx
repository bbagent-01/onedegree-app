import { cn } from "@/lib/utils";
import { trustTier } from "@/lib/trust-data";

interface TrustBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Visual indicator of the viewer's 1° vouch score to a target user.
 *
 * - sm: colored dot + number (listing cards, thread rows)
 * - md: number + label + colored ring (sidebars, profile cards)
 * - lg: number + breakdown + colored ring (profile headers)
 *
 * Thresholds match PROJECT_PLAN.md § Trust Mechanics:
 *   <25   "Distant"       rose
 *   25-49 "Building"      amber
 *   50-74 "Solid"         emerald
 *   75+   "Strong"        blue
 */
export function TrustBadge({ score, size = "sm", className }: TrustBadgeProps) {
  const tier = trustTier(score);

  if (size === "sm") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2 py-0.5 text-xs font-semibold shadow-sm ring-1 ring-black/5",
          className
        )}
      >
        <span className={cn("h-2 w-2 rounded-full", tier.dotClass)} />
        <span className={cn("tabular-nums", tier.textClass)}>{score}</span>
      </div>
    );
  }

  if (size === "md") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium shadow-sm ring-2",
          tier.ringClass,
          className
        )}
      >
        <span className={cn("h-2.5 w-2.5 rounded-full", tier.dotClass)} />
        <span className={cn("tabular-nums font-semibold", tier.textClass)}>
          {score}
        </span>
        <span className="text-foreground/80">{tier.label}</span>
      </div>
    );
  }

  // lg
  return (
    <div
      className={cn(
        "inline-flex flex-col items-start gap-0.5 rounded-2xl bg-white px-4 py-3 shadow-sm ring-2",
        tier.ringClass,
        className
      )}
    >
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "text-2xl font-semibold tabular-nums",
            tier.textClass
          )}
        >
          {score}
        </span>
        <span className="text-sm font-medium text-foreground/80">
          {tier.label}
        </span>
      </div>
      <div className="text-xs text-muted-foreground">
        Your 1° Score with this host
      </div>
    </div>
  );
}
