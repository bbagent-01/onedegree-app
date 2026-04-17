import { CheckCircle2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { trustTier } from "@/lib/trust-data";
import { ShieldIcon } from "./shield-icon";
import { ConnectorDots } from "./connector-dots";
import {
  ConnectorAvatars,
  type AvatarConnector,
} from "./connector-avatars";

interface Props {
  size?: "micro" | "medium";
  /** Trust score from viewer → target user. Ignored when direct=true. */
  score?: number;
  /**
   * Degrees of separation. 1 = direct/single-connector (score shown),
   * 2+ = multi-hop (shown as "2°", no score). `null` = not connected.
   */
  degree?: 1 | 2 | null;
  /** When true, viewer directly vouched for target — renders a green
   *  checkmark + "Vouched" label in place of the score + dots. */
  direct?: boolean;
  /** Sorted strongest → weakest by individual path strength. */
  connectorPaths?: Array<{
    id: string;
    name: string;
    avatar_url: string | null;
    strength: number;
    viewer_knows: boolean;
  }>;
  /** Host's guest rating average (0-5). */
  hostRating?: number | null;
  /** Host's total reviews received. */
  hostReviewCount?: number;
  className?: string;
}

/**
 * Inline trust tag shown next to a host name everywhere (tiles,
 * listing detail, inbox, trips, reservations, profile). Two sizes:
 *
 *   micro   — abstract colored dots for each connector
 *   medium  — overlapping connector avatars instead of dots
 *
 * The degree symbol (°) is reserved for hops only, so the 1° case
 * renders a bare score with no ° decoration.
 */
export function TrustTag({
  size = "micro",
  score = 0,
  degree = null,
  direct = false,
  connectorPaths = [],
  hostRating,
  hostReviewCount = 0,
  className,
}: Props) {
  const tier = trustTier(score);
  const isMedium = size === "medium";
  const hasRating =
    typeof hostRating === "number" && hostRating > 0 && hostReviewCount > 0;

  // Rating is the same in all states — render once and reuse.
  const ratingNode = hasRating ? (
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
  );

  // Direct vouch — supersedes everything. Green check, "Vouched" label.
  if (direct) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs tabular-nums",
          className
        )}
      >
        <span
          className="inline-flex items-center gap-0.5 font-semibold text-emerald-700"
          title="Direct vouch — you vouched for this host"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Vouched</span>
        </span>
        {ratingNode}
      </span>
    );
  }

  // 2°+ — no score, just the degree label and a muted shield.
  if (degree && degree >= 2 && !direct && !connectorPaths.length) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs tabular-nums",
          className
        )}
      >
        <ShieldIcon muted size="h-3.5 w-3.5" />
        <span className="font-semibold text-zinc-600">{degree}°</span>
        {ratingNode}
      </span>
    );
  }

  // Not connected — em-dash in place of the score.
  if (!degree || score === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs tabular-nums",
          className
        )}
      >
        <ShieldIcon muted size="h-3.5 w-3.5" />
        <span className="font-semibold text-zinc-500">—</span>
        {ratingNode}
      </span>
    );
  }

  // 1° — shield, score, connector dots/avatars.
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs tabular-nums",
        className
      )}
    >
      <ShieldIcon score={score} size="h-3.5 w-3.5" />
      <span className={cn("font-semibold", tier.textClass)}>{score}</span>
      {connectorPaths.length > 0 &&
        (isMedium ? (
          <ConnectorAvatars
            connectors={connectorPaths as AvatarConnector[]}
            size="h-5 w-5"
          />
        ) : (
          <ConnectorDots
            strengths={connectorPaths.map((p) => p.strength)}
            size="h-2 w-2"
          />
        ))}
      {ratingNode}
    </span>
  );
}
