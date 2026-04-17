import { cn } from "@/lib/utils";
import { trustTier } from "@/lib/trust-data";

interface TrustBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  /** Number of distinct connectors feeding the score — shown on md/lg. */
  connectionCount?: number;
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
  className,
}: TrustBadgeProps) {
  const tier = trustTier(score);

  if (size === "sm") {
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
