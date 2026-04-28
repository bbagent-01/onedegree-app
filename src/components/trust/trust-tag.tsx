import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShieldIcon } from "./shield-icon";
import { ConnectorDots } from "./connector-dots";
import {
  ConnectorAvatars,
  type AvatarConnector,
} from "./connector-avatars";

interface Props {
  size?: "micro" | "medium";
  /** Composite trust score from viewer → target user. Only rendered
   *  for degree=2 and degree=3 (dampened); 1/4 surface just the
   *  degree pill. */
  score?: number;
  /**
   * Degrees of separation.
   *   1 = direct vouch        → purple "1st°" pill
   *   2 = friend of a friend  → green "2nd°" pill + shield + score + dots
   *   3 = two hops out        → mustard "3rd°" pill + dampened score
   *   4 = three hops out      → zinc "4th°" pill + chain visual
   *   null = not connected    → zinc "Not connected" pill
   */
  degree?: 1 | 2 | 3 | 4 | null;
  /** Legacy direct-vouch flag. The engine also sets degree=1 when
   *  direct=true; kept for callers that still pass it explicitly. */
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
  /**
   * When true on a medium tag, render the subtext line under the row
   * ("0 paths · Ask a friend to vouch" for 0°; "Request intro through
   * bridge" for 4°+). Medium-only; micro never shows subtext.
   */
  showSubtext?: boolean;
  className?: string;
}

interface PillStyle {
  label: string;
  bg: string;
  fg: string;
}

const DEGREE_PILLS: Record<1 | 2 | 3 | 4, PillStyle> = {
  1: { label: "1st\u00B0", bg: "bg-brand", fg: "text-white" },
  2: { label: "2nd\u00B0", bg: "bg-emerald-600", fg: "text-white" },
  // Mustard per Loren's spec: rgb(191 138 13) = #bf8a0d. Arbitrary
  // Tailwind value since this sits between yellow-600 and yellow-700.
  3: { label: "3rd\u00B0", bg: "bg-[#bf8a0d]", fg: "text-white" },
  4: { label: "4th\u00B0", bg: "bg-zinc-500", fg: "text-white" },
};

/**
 * Inline trust tag. Every connected state renders as a color-coded
 * degree pill; only the 2° state goes on to show the shield + score
 * + connector bridges. The two sizes are:
 *
 *   micro   — browse tiles, inbox rows, reservation cards
 *   medium  — host-card on the listing detail, profile header (the
 *             "medium host badge")
 */
export function TrustTag({
  size = "micro",
  score = 0,
  degree = null,
  direct = false,
  connectorPaths = [],
  hostRating,
  hostReviewCount = 0,
  showSubtext = false,
  className,
}: Props) {
  const isMedium = size === "medium";
  const hasRating =
    typeof hostRating === "number" && hostRating > 0 && hostReviewCount > 0;

  // Rating is the same across states — render once and reuse.
  const ratingNode = hasRating ? (
    <span className="flex items-center gap-0.5 text-muted-foreground">
      <span aria-hidden>&middot;</span>
      <Star
        className={cn(
          isMedium ? "h-3.5 w-3.5" : "h-3 w-3",
          "fill-foreground text-foreground"
        )}
      />
      <span className="font-medium text-foreground">
        {hostRating!.toFixed(1)}
      </span>
      <span>({hostReviewCount})</span>
    </span>
  ) : (
    <span className="text-muted-foreground">&middot; New host</span>
  );

  // Normalize direct → degree=1 so the pill selection is uniform.
  const effectiveDegree: 1 | 2 | 3 | 4 | null = direct ? 1 : degree;

  // 0° (not connected, or 5°+ beyond BFS reach). Dark pill labeled
  // "No Connection" per Loren's spec; no shield — the pill carries
  // the whole signal. Optional subtext ("0 paths · Ask a friend to
  // vouch for them") renders beneath on medium tags.
  if (!effectiveDegree) {
    const row = (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 tabular-nums",
          isMedium ? "text-sm" : "text-xs"
        )}
      >
        <span
          className={cn(
            "inline-flex items-center rounded-full bg-zinc-900 font-semibold text-white",
            isMedium ? "px-2.5 py-0.5 text-xs" : "px-2 py-[1px] text-[11px]"
          )}
        >
          No Connection
        </span>
        {ratingNode}
      </span>
    );
    if (isMedium && showSubtext) {
      return (
        <span className={cn("flex flex-col gap-0.5", className)}>
          {row}
          <span className="text-xs text-muted-foreground">
            0 paths to this host &middot; Ask a friend to vouch for them
          </span>
        </span>
      );
    }
    return <span className={className}>{row}</span>;
  }

  const pill = DEGREE_PILLS[effectiveDegree];

  const is2nd = effectiveDegree === 2;
  const is3rd = effectiveDegree === 3;
  const is4th = effectiveDegree === 4;

  // 3° medium uses the same shape as 2° + a single mustard dot
  // before the bridge avatar to hint at the anonymous intermediary.
  // 4° medium uses two anonymous zinc dots + the bridge; no score.
  // Connector paths for 3°/4° are per-hop strengths, where the
  // entry at index 0 is the first hop out of the viewer (bridge).
  const bridgeOnly = connectorPaths.filter((p) => p.viewer_knows);
  const anonHops = connectorPaths.filter((p) => !p.viewer_knows);

  const row = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 tabular-nums",
        isMedium ? "text-sm" : "text-xs"
      )}
    >
      <span
        className={cn(
          "inline-flex items-center rounded-full font-semibold",
          pill.bg,
          pill.fg,
          isMedium ? "px-2.5 py-0.5 text-xs" : "px-2 py-[1px] text-[11px]"
        )}
      >
        {pill.label}
      </span>

      {/* 2°: emerald shield + score + connector dots/avatars */}
      {is2nd && (
        <>
          <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-700">
            <ShieldIcon
              score={score}
              size={isMedium ? "h-4 w-4" : "h-3.5 w-3.5"}
            />
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
        </>
      )}

      {/* 3°: mustard shield + dampened score. The dots here count
          distinct bridges (viewer's 1° connections who reach the
          host via a 3° chain), not hops on any single chain.
          Medium additionally shows one anon intermediate dot to
          signal the chain length, then the bridge avatar(s). */}
      {is3rd && (
        <>
          <span className="inline-flex items-center gap-0.5 font-semibold text-[#bf8a0d]">
            <ShieldIcon
              tone="mustard"
              size={isMedium ? "h-4 w-4" : "h-3.5 w-3.5"}
            />
            {score > 0 && <span>{score}</span>}
          </span>
          {!isMedium && bridgeOnly.length > 0 && (
            <ConnectorDots
              strengths={bridgeOnly.map((p) => p.strength)}
              size="h-3 w-3"
              tone="mustard"
            />
          )}
          {isMedium && bridgeOnly.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-5 w-5 rounded-full bg-[#e6b95c] ring-2 ring-white" />
              <span className="h-px w-2 bg-[#d4a024]" aria-hidden />
              <ConnectorAvatars
                connectors={bridgeOnly as AvatarConnector[]}
                size="h-5 w-5"
              />
            </span>
          )}
        </>
      )}

      {/* 4°: zinc shield + dampened score. Same bridge-count
          semantics as 3° — dots = distinct 1° bridges who reach
          the host via a 4° chain. Medium shows two anon zinc dots
          + dash + bridge avatar(s). */}
      {is4th && (
        <>
          <span className="inline-flex items-center gap-0.5 font-semibold text-zinc-600">
            <ShieldIcon
              muted
              size={isMedium ? "h-4 w-4" : "h-3.5 w-3.5"}
            />
            {score > 0 && <span>{score}</span>}
          </span>
          {!isMedium && bridgeOnly.length > 0 && (
            <span className="inline-flex items-center -space-x-1">
              {bridgeOnly.slice(0, 4).map((_, i) => (
                <span
                  key={i}
                  className="inline-block h-3 w-3 rounded-full bg-zinc-300 ring-2 ring-white"
                />
              ))}
              {bridgeOnly.length > 4 && (
                <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-zinc-500 text-[8px] font-semibold text-white ring-2 ring-white">
                  +{bridgeOnly.length - 4}
                </span>
              )}
            </span>
          )}
          {isMedium && bridgeOnly.length > 0 && (
            <span className="inline-flex items-center gap-1">
              {Array.from({ length: 2 }).map((_, i) => (
                <span
                  key={`dot-${i}`}
                  className="inline-flex items-center gap-1"
                >
                  <span className="inline-block h-5 w-5 rounded-full bg-zinc-300" />
                  <span className="h-px w-2 bg-zinc-300" aria-hidden />
                </span>
              ))}
              <ConnectorAvatars
                connectors={bridgeOnly as AvatarConnector[]}
                size="h-5 w-5"
              />
            </span>
          )}
        </>
      )}

      {ratingNode}
    </span>
  );

  // Wrap with subtext when the caller opts in (medium only). Same
  // pattern as the 0° state; keeps micro tags dense and lets medium
  // surface explanatory copy alongside the pill.
  if (isMedium && showSubtext && (is3rd || is4th)) {
    const subtext = is3rd
      ? "Distant connection \u00B7 2 hops away from your network"
      : "Distant connection \u00B7 Request intro through bridge";
    return (
      <span className={cn("flex flex-col gap-0.5", className)}>
        {row}
        <span className="text-xs text-muted-foreground">{subtext}</span>
      </span>
    );
  }
  return <span className={className}>{row}</span>;
}
