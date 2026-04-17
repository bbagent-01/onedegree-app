import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import { trustTier } from "@/lib/trust-data";

interface TrustBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  /** Number of distinct connectors feeding the score — shown on md/lg. */
  connectionCount?: number;
  /**
   * When true, the viewer has personally vouched for this user.
   * Supersedes the numeric score — renders a green checkmark badge
   * instead. Direct vouches are the strongest signal we have.
   */
  direct?: boolean;
  className?: string;
}

/**
 * 1° vouch score badge. Three sizes:
 *
 *   sm  pill — "[score] 1°" on a tinted background. Used on listing cards,
 *       thread rows, reservation / trip cards.
 *   md  card — score + "1° Vouch Score" label + tier color + connection
 *       count. Used in sidebars and listing detail headers.
 *   lg  panel — same as md but larger, for profile pages.
 *
 * Scale: 0 gray · 1–14 red · 15–29 orange · 30–49 lime · 50–74 emerald · 75+ blue.
 */
export function TrustBadge({
  score,
  size = "sm",
  connectionCount,
  direct = false,
  className,
}: TrustBadgeProps) {
  const tier = trustTier(score);

  if (size === "sm") {
    if (direct) {
      return (
        <div
          className={cn(
            "inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white shadow-sm",
            className
          )}
          title="Direct vouch — you vouched for this person"
        >
          <CheckCircle2 className="h-3 w-3" />
          <span>Direct</span>
        </div>
      );
    }
    const hasCount = typeof connectionCount === "number" && connectionCount > 0;
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums shadow-sm",
          tier.solidClass,
          className
        )}
        title={
          hasCount
            ? `1° vouch score: ${score} across ${connectionCount} connection${connectionCount === 1 ? "" : "s"} (${tier.label})`
            : `1° vouch score: ${score} (${tier.label})`
        }
      >
        <span>{score}</span>
        {hasCount && (
          <span className="text-[11px] font-semibold opacity-85">
            ({connectionCount})
          </span>
        )}
      </div>
    );
  }

  if (size === "md") {
    if (direct) {
      return (
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm shadow-sm ring-2 ring-emerald-500/40",
            className
          )}
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-emerald-800">
              Direct vouch
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              You vouched for them
            </span>
          </div>
        </div>
      );
    }
    return (
      <div
        className={cn(
          "inline-flex flex-col items-start gap-0.5 rounded-xl bg-white px-3.5 py-2 text-sm shadow-sm ring-2",
          tier.ringClass,
          className
        )}
      >
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-xl font-semibold leading-none tabular-nums",
              tier.textClass
            )}
          >
            {score}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            1° Vouch Score
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs">
          <span className={cn("h-2 w-2 rounded-full", tier.dotClass)} />
          <span className="font-medium text-foreground/80">{tier.label}</span>
          {typeof connectionCount === "number" && connectionCount > 0 && (
            <span className="text-muted-foreground">
              · {connectionCount} connection{connectionCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    );
  }

  // lg
  if (direct) {
    return (
      <div
        className={cn(
          "rounded-2xl bg-white p-5 shadow-sm ring-2 ring-emerald-500/40",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          <div>
            <div className="text-base font-semibold text-emerald-800">
              Direct vouch
            </div>
            <div className="text-xs font-medium text-muted-foreground">
              You&apos;ve personally vouched for them
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "rounded-2xl bg-white p-5 shadow-sm ring-2",
        tier.ringClass,
        className
      )}
    >
      <div className="flex items-baseline gap-3">
        <span
          className={cn(
            "text-4xl font-semibold leading-none tabular-nums",
            tier.textClass
          )}
        >
          {score}
        </span>
        <div>
          <div className="text-sm font-semibold text-foreground">
            1° Vouch Score
          </div>
          <div className={cn("text-xs font-medium", tier.textClass)}>
            {tier.label}
          </div>
        </div>
      </div>
      {typeof connectionCount === "number" && connectionCount > 0 && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn("h-1.5 w-1.5 rounded-full", tier.dotClass)} />
          Based on {connectionCount} connection
          {connectionCount !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
