import { Check, Star } from "lucide-react";
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
   * Degrees of separation.
   *   1 = direct vouch (purple "Vouched" pill)
   *   2 = friend of a friend — shield + score + connector dots/avatars
   *   3 = two hops out — bare "3rd°" ordinal
   *   4 = three hops out — bare "4th°" ordinal
   *   null = not connected
   */
  degree?: 1 | 2 | 3 | 4 | null;
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

  // Direct vouch — supersedes everything. Filled purple circle with
  // a white check, "Vouched" label in the same purple. Purple is the
  // 1DB brand color; using it for direct vouches signals "this is
  // the platform-native, strongest signal."
  if (direct) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs tabular-nums",
          className
        )}
      >
        <span
          className="inline-flex items-center gap-1 font-semibold text-brand"
          title="Direct vouch — you vouched for this host"
        >
          <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand text-white">
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
          <span>Vouched</span>
        </span>
        {ratingNode}
      </span>
    );
  }

  // 3° / 4° — multi-hop. Score is always 0 (engine sets it that
  // way per spec), so these branches run BEFORE the score-based
  // em-dash check or they'd collapse into "not connected". The
  // medium variant shows the bridge avatar (the intermediary
  // adjacent to the viewer) so the reader has a face to click on.
  if ((degree === 3 || degree === 4) && !direct) {
    const ordinal = degree === 4 ? "4th" : "3rd";
    const tone = degree === 4 ? "text-zinc-400" : "text-zinc-500";
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs tabular-nums",
          className
        )}
      >
        <span className={cn("font-semibold", tone)}>{ordinal}&deg;</span>
        {isMedium && connectorPaths.length > 0 && (
          <ConnectorAvatars
            connectors={connectorPaths as AvatarConnector[]}
            size="h-5 w-5"
          />
        )}
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
        <span className="inline-flex items-center gap-0.5 font-semibold text-zinc-500">
          <ShieldIcon muted size="h-3.5 w-3.5" />
          <span>—</span>
        </span>
        {ratingNode}
      </span>
    );
  }

  // 2° (friend of a friend) — shield + score + connector dots/
  // avatars. This is the core friends-of-friends case, the whole
  // point of the product, so it gets the richest rendering.
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs tabular-nums",
        className
      )}
    >
      <span className={cn("inline-flex items-center gap-0.5 font-semibold", tier.textClass)}>
        <ShieldIcon score={score} size="h-3.5 w-3.5" />
        <span>{score}</span>
      </span>
      {connectorPaths.length > 0 &&
        (isMedium ? (
          <ConnectorAvatars
            connectors={connectorPaths as AvatarConnector[]}
            size="h-5 w-5"
          />
        ) : (
          <ConnectorDots
            strengths={connectorPaths.map((p) => p.strength)}
            size="h-3 w-3"
          />
        ))}
      {ratingNode}
    </span>
  );
}
