/**
 * Backward-compat adapter for the new TrustBadge.
 *
 * Every existing render site in the app passes the legacy prop shape
 * (`score`, `degree`, `direct`, `connectorPaths`, `hostRating`,
 * `hostReviewCount`). This file maps those props onto the canonical
 * TrustBadgeData shape and renders the new visual, so the locked
 * variant ports into every surface in one move.
 *
 * Newer call sites that already have `users.vouch_score` and
 * `users.host_review_count` available can pass them via `vouchScore`
 * / explicit overrides; older sites omit them and the badge falls
 * back to suppressing the chip.
 *
 * The legacy `showSubtext` prop is preserved as an opt-in subtext
 * line under the badge — used on the profile-page Trust Score card
 * to spell out 0° / 4° gating.
 */

import { TrustBadge, type BadgeSize } from "./trust-badge";
import {
  toTrustBadgeData,
  type BadgeHostFields,
  type BadgeTrustSlice,
} from "@/lib/trust/badge";
import { cn } from "@/lib/utils";

interface Props {
  /** Render size. "micro"/"medium" map directly; "nano" only used
   *  for the tightest surfaces (inbox row). */
  size?: BadgeSize;
  /** Composite trust score on the legacy 0-100ish scale. Internally
   *  rescaled to 0-10 for the connection metric. */
  score?: number;
  /** Degrees of separation from viewer to target. */
  degree?: 1 | 2 | 3 | 4 | null;
  /** Legacy direct-vouch flag — the engine also sets degree=1 when
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
  /** Host's average rating from past stays (0-5). */
  hostRating?: number | null;
  /** Host's total reviews received. */
  hostReviewCount?: number;
  /** Host's platform-wide vouch score (users.vouch_score, 0-10).
   *  Newer call sites pass this; older ones omit and the chip
   *  suppresses. */
  vouchScore?: number | null;
  /** True iff the target has vouched the viewer. Drives the 1°
   *  asymmetric arrow. Optional — when omitted the badge defaults to
   *  "mutual" (no arrow). */
  hasIncomingVouch?: boolean;
  /** Explicit 1° vouch direction override. Trumps hasIncomingVouch. */
  vouchDirection?: "mutual" | "outgoing" | "incoming";
  /** Subtext line under the badge (medium-only legacy affordance). */
  showSubtext?: boolean;
  /** Render the badge over a near-white background (listing card
   *  overlay). Flips connector ring + rating text to the light
   *  variant. */
  onImage?: boolean;
  /** Render the small `?` hint indicating the badge is hoverable.
   *  TrustTagPopover sets this automatically; pass false on bare
   *  TrustTags that don't open a popover. */
  showHelpHint?: boolean;
  className?: string;
}

const SUBTEXT_BY_DEGREE: Record<string, string> = {
  none: "0 paths to this host · Ask a friend to vouch for them",
  d3: "Distant connection · 2 hops away from your network",
  d4: "Distant connection · Request intro through bridge",
};

export function TrustTag({
  size = "micro",
  score = 0,
  degree = null,
  direct = false,
  connectorPaths = [],
  hostRating,
  hostReviewCount = 0,
  vouchScore,
  hasIncomingVouch,
  vouchDirection,
  showSubtext = false,
  onImage = false,
  showHelpHint = false,
  className,
}: Props) {
  // Normalize direct → degree=1 so the locked-variant rules see a
  // single, consistent input.
  const effectiveDegree: 1 | 2 | 3 | 4 | null = direct ? 1 : degree;

  const trustSlice: BadgeTrustSlice = {
    degree: effectiveDegree,
    score,
    hasDirectVouch: direct,
    hasIncomingVouch,
    connectorPaths,
  };
  const hostFields: BadgeHostFields = {
    vouch_score: vouchScore ?? null,
    host_rating: hostRating ?? null,
    host_review_count: hostReviewCount ?? 0,
  };

  const data = toTrustBadgeData(trustSlice, hostFields);

  // Caller-supplied direction wins over auto-detected.
  if (vouchDirection) data.vouchDirection = vouchDirection;

  const badge = (
    <TrustBadge
      size={size}
      data={data}
      onImage={onImage}
      showHelpHint={showHelpHint}
      className={className}
    />
  );

  if (size === "medium" && showSubtext) {
    let subtext: string | null = null;
    if (effectiveDegree === null) subtext = SUBTEXT_BY_DEGREE.none;
    else if (effectiveDegree === 3) subtext = SUBTEXT_BY_DEGREE.d3;
    else if (effectiveDegree === 4) subtext = SUBTEXT_BY_DEGREE.d4;
    if (subtext) {
      return (
        <span className={cn("flex flex-col gap-0.5", className)}>
          {badge}
          <span className="text-xs text-muted-foreground">{subtext}</span>
        </span>
      );
    }
  }

  return badge;
}
