import { CheckCircle2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { trustTier } from "@/lib/trust-data";

interface Props {
  /** Viewer's 1° vouch score with the host. 0 = no connection. */
  score: number;
  /** Distinct connectors feeding the score. */
  connectionCount?: number;
  /** When true, viewer has directly vouched for the host (supersedes score). */
  direct?: boolean;
  /** Host's average guest-submitted rating. null = no reviews yet. */
  hostRating?: number | null;
  /** Number of reviews the host has received. */
  hostReviewCount?: number;
  className?: string;
}

/**
 * Compact single-line host meta:
 *
 *   30° (2) · ★ 4.8 (12)
 *   ✓ · ★ 4.8 (12)                     (direct vouch)
 *   0° · ★ 4.8 (12)                    (not connected)
 *   30° (2) · New host                 (no rating yet)
 *
 * Used directly next to "Hosted by …" on listing tiles and in the
 * inline host card on the listing detail page. Trust info is colored
 * by tier; rating sits in muted foreground next to it.
 */
export function HostInlineMeta({
  score,
  connectionCount,
  direct = false,
  hostRating,
  hostReviewCount = 0,
  className,
}: Props) {
  const tier = trustTier(score);
  const hasCount = typeof connectionCount === "number" && connectionCount > 0;
  const hasRating =
    typeof hostRating === "number" && hostRating > 0 && hostReviewCount > 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs tabular-nums",
        className
      )}
    >
      {direct ? (
        <span
          className="inline-flex items-center gap-0.5 font-semibold text-emerald-700"
          title="Direct vouch — you vouched for this host"
        >
          <CheckCircle2 className="h-3 w-3" />
          <span>Vouched</span>
        </span>
      ) : (
        <span
          className={cn("font-semibold", tier.textClass)}
          title={`1° vouch score: ${score} (${tier.label})`}
        >
          {score}°
          {hasCount && (
            <span className="ml-0.5 font-semibold opacity-80">
              ({connectionCount})
            </span>
          )}
        </span>
      )}

      {hasRating ? (
        <span className="flex items-center gap-0.5 text-muted-foreground">
          <span aria-hidden>·</span>
          <Star className="h-3 w-3 fill-foreground text-foreground" />
          <span className="font-medium text-foreground">
            {hostRating!.toFixed(1)}
          </span>
          <span>({hostReviewCount})</span>
        </span>
      ) : (
        <span className="text-muted-foreground">· New host</span>
      )}
    </span>
  );
}
