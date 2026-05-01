"use client";

// Trust badge — production component ported from the locked
// /sandbox/trust-badge variant. One component, four sizes:
//
//   nano   → degree pill only, for inbox thread rows
//   micro  → degree + vouch chip + rating chip, for listing cards
//   medium → adds inline connector avatars overlapping the pill, for
//            host cards on listing detail / proposal cards
//   macro  → big avatar + name + degree pill + bio + connector strip
//            + 3 metric tiles, for the profile page header block
//
// Pure rendering — no DB queries here. Callers pass already-fetched
// data via the props or the derived `TrustBadgeData` shape below.

import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Shield,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Tokens ────────────────────────────────────────────────────────
// One source of truth for the five-tier degree color scale. Every
// pill, every vouch chip, every neutral pulls from here. Inline-styled
// throughout so globals.css's !important degree-pill overrides don't
// blank out arbitrary-value Tailwind classes.

type DegreeTone = { bg: string; fg: string };

export const DEGREE_COLORS = {
  none: { bg: "#A1A1AA", fg: "#0B2E25" }, // no path — neutral cool gray
  d1: { bg: "#1BEAA5", fg: "#0B2E25" }, // 1° — mint
  d2: { bg: "#39BFF8", fg: "#0B2E25" }, // 2° — sky
  d3: { bg: "#FDD34D", fg: "#0B2E25" }, // 3° — mustard
  d4: { bg: "#FF8F8F", fg: "#0B2E25" }, // 4°≥ — coral
} satisfies Record<"none" | "d1" | "d2" | "d3" | "d4", DegreeTone>;

const DEGREE_PILL: Record<
  1 | 2 | 3 | 4,
  { bg: string; fg: string; label: string; outlineColor: string }
> = {
  1: { ...DEGREE_COLORS.d1, label: "1°", outlineColor: DEGREE_COLORS.d1.bg },
  2: { ...DEGREE_COLORS.d2, label: "2°", outlineColor: DEGREE_COLORS.d2.bg },
  3: { ...DEGREE_COLORS.d3, label: "3°", outlineColor: DEGREE_COLORS.d3.bg },
  4: { ...DEGREE_COLORS.d4, label: "4°≥", outlineColor: DEGREE_COLORS.d4.bg },
};

// Alert orange used for the 1° asymmetric vouch-back chip. Click the
// chip to nudge or vouch back.
const ASYMMETRY_ORANGE = "#EA580C";

// Map a vouch score (0-10) to the same tier color scale as the degree
// pill. Single canonical color per tier — stands on every surface.
function vouchTierColor(score: number): string {
  if (score >= 5) return DEGREE_COLORS.d1.bg;
  if (score >= 4) return DEGREE_COLORS.d2.bg;
  if (score >= 3) return DEGREE_COLORS.d3.bg;
  return DEGREE_COLORS.d4.bg;
}

const ICON_CIRCLE = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
    <circle cx="12" cy="12" r="10" />
  </svg>
);
const ICON_SHIELD = (
  <Shield className="h-full w-full" fill="currentColor" strokeWidth={0} />
);

// ── Public types ──────────────────────────────────────────────────

export type DegreeBucket = 1 | 2 | 3 | 4 | null;

// 1° vouch direction — only meaningful when degree===1.
export type VouchDirection = "mutual" | "outgoing" | "incoming";

export interface BadgeConnector {
  id: string;
  name: string;
  avatarUrl: string | null;
  /** True iff the viewer has a direct relationship with this person.
   *  Anonymous intermediaries render as a silhouette. */
  viewerKnows: boolean;
}

export type BadgeSize = "nano" | "micro" | "medium" | "macro";

/** Canonical badge data shape. Adapters in `lib/trust/badge.ts`
 *  build this from a TrustResult + the target user's record. */
export interface TrustBadgeData {
  degree: DegreeBucket;
  /** 1° asymmetry direction. "mutual" suppresses the arrow. */
  vouchDirection?: VouchDirection;
  /** Viewer-relative chain strength (0-10). Only rendered for 2°/3°. */
  connection: number | null;
  /** Absolute platform-wide vouch score (0-10), from users.vouch_score. */
  vouch: number | null;
  /** Host's average rating from past stays (0-5). */
  rating: number | null;
  reviewCount: number;
  connectors: BadgeConnector[];
}

// ── New-member + No-path pills ────────────────────────────────────

function NewMemberPill({ size }: { size: BadgeSize }) {
  const cls =
    size === "nano"
      ? "px-1.5 py-[1px] text-[10px]"
      : size === "micro"
        ? "px-2 py-[1px] text-[11px]"
        : size === "medium"
          ? "px-2.5 py-0.5 text-xs"
          : "px-3 py-0.5 text-sm";
  return (
    <span
      className={cn("inline-flex items-center rounded-full font-semibold", cls)}
      style={{ backgroundColor: "#3F3F46", color: "#F4F4F5" }}
    >
      New member
    </span>
  );
}

// Uncontained vouch indicator — no background, no border. Shield +
// number, both colored by the vouch tier scale (same scale as the
// degree pills, picked from the score itself). Glyph height matches
// the rating star at the same badge size.
function VouchPill({
  score,
  size,
}: {
  score: number;
  size: "micro" | "medium";
}) {
  const color = vouchTierColor(score);
  const sz = size === "micro" ? "gap-0.5 text-[11px]" : "gap-1 text-xs";
  const iconSize = size === "micro" ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold tabular-nums",
        sz
      )}
      style={{ color }}
    >
      <span className={iconSize}>{ICON_SHIELD}</span>
      <span>{score.toFixed(1)}</span>
    </span>
  );
}

// ── Core badge ────────────────────────────────────────────────────

export interface TrustBadgeProps {
  size: BadgeSize;
  data: TrustBadgeData;
  /** When the badge sits over a near-white background (listing card
   *  overlay or macro profile card), set `onImage` so the connector
   *  ring color and rating text color flip to the light variant. */
  onImage?: boolean;
  /** Optional click handler for the asymmetric vouch-back arrow. */
  onAsymmetricClick?: (direction: "outgoing" | "incoming") => void;
  /** Render a small `?` circle at the end of the badge to hint that
   *  the badge expands to show trust details on click/hover. Wraps
   *  like TrustTagPopover automatically toggle this on; bare badges
   *  with no popover should leave it off. */
  showHelpHint?: boolean;
  className?: string;
}

function HelpHint({ size }: { size: "micro" | "medium" }) {
  const dim = size === "micro" ? 13 : 15;
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none"
      style={{
        width: dim,
        height: dim,
        backgroundColor: "rgba(245,241,230,0.18)",
        color: "rgba(245,241,230,0.85)",
        fontSize: size === "micro" ? 9 : 10,
      }}
    >
      ?
    </span>
  );
}

export function TrustBadge({
  size,
  data,
  onImage = false,
  onAsymmetricClick,
  showHelpHint = false,
  className,
}: TrustBadgeProps) {
  if (size === "macro") {
    // Macro is its own component below — keep this entrypoint simple.
    return (
      <span className={className}>
        <MacroBadgeInner data={data} onAsymmetricClick={onAsymmetricClick} />
      </span>
    );
  }

  const isColdStart =
    data.degree === null &&
    data.connection === null &&
    data.vouch === null &&
    data.rating === null;
  if (isColdStart)
    return (
      <span className={className}>
        <NewMemberPill size={size} />
      </span>
    );

  const degreeStyle = data.degree ? DEGREE_PILL[data.degree] : null;
  const degreeSizeCls =
    size === "nano"
      ? "px-1.5 py-[1px] text-[10px] leading-[1.1]"
      : size === "micro"
        ? "px-2 py-[1px] text-[11px]"
        : "px-2.5 py-0.5 text-xs";

  // Connection score lives INSIDE the degree pill. Only shown for
  // 2°/3° (1° intentionally suppresses; 4°+ is too long to score).
  const showConnectionInPill =
    data.degree === 2 || data.degree === 3;

  // 1° asymmetric direction — drives the orange right segment.
  const vouchArrow =
    data.degree === 1 && data.vouchDirection && data.vouchDirection !== "mutual"
      ? data.vouchDirection
      : null;

  let degreeChip: React.ReactNode;
  if (!degreeStyle) {
    // degree=null but not cold-start (rare) — neutral "No path" pill.
    degreeChip = (
      <span
        className={cn(
          "inline-flex items-center rounded-full font-semibold",
          size === "nano"
            ? "px-1.5 py-[1px] text-[10px]"
            : "px-2 py-[1px] text-[11px]"
        )}
        style={{
          backgroundColor: DEGREE_COLORS.none.bg,
          color: DEGREE_COLORS.none.fg,
        }}
      >
        No path
      </span>
    );
  } else if (showConnectionInPill && data.connection !== null) {
    // Two-segment combo pill — degree (filled) | connection (outlined).
    // Inner segments use borderRadius:0 so the rounded outer doesn't
    // curve into the divider.
    degreeChip = (
      <span
        className="inline-flex items-stretch overflow-hidden rounded-full font-semibold tabular-nums"
        style={{ border: `1px solid ${degreeStyle.outlineColor}` }}
      >
        <span
          className={cn("inline-flex items-center", degreeSizeCls)}
          style={{
            backgroundColor: degreeStyle.bg,
            color: degreeStyle.fg,
            borderRadius: 0,
          }}
        >
          {degreeStyle.label}
        </span>
        <span
          className={cn("inline-flex items-center", degreeSizeCls)}
          style={{
            backgroundColor: "transparent",
            color: degreeStyle.outlineColor,
            borderLeft: `1px solid ${degreeStyle.outlineColor}`,
            borderRadius: 0,
          }}
        >
          {data.connection.toFixed(1)}
        </span>
      </span>
    );
  } else if (vouchArrow) {
    // 1° asymmetric — combo pill (mint | gap | orange arrow). The
    // right segment is a real <button>; click eventually opens the
    // vouch-back / nudge flow.
    const arrowDim = size === "nano" ? 10 : size === "micro" ? 12 : 14;
    const isOutgoing = vouchArrow === "outgoing";
    const arrowTitle = isOutgoing
      ? "You vouched for them — they haven't vouched back. Click to nudge."
      : "They vouched for you — you haven't vouched back. Click to vouch back.";
    degreeChip = (
      <span
        className="inline-flex items-stretch overflow-hidden rounded-full font-semibold"
        style={{
          gap: "2px",
          border: "1px solid rgba(11,46,37,0.14)",
        }}
      >
        <span
          className={cn("inline-flex items-center", degreeSizeCls)}
          style={{
            backgroundColor: degreeStyle.bg,
            color: degreeStyle.fg,
            borderRadius: 0,
          }}
        >
          {degreeStyle.label}
        </span>
        <button
          type="button"
          title={arrowTitle}
          aria-label={
            isOutgoing
              ? "Vouch-back pending — nudge for return vouch"
              : "Vouch them back"
          }
          className={cn(
            "inline-flex items-center transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1",
            degreeSizeCls
          )}
          style={{
            backgroundColor: ASYMMETRY_ORANGE,
            color: "#FFFFFF",
            borderRadius: 0,
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAsymmetricClick?.(vouchArrow);
          }}
        >
          {isOutgoing ? (
            <ArrowRight style={{ width: arrowDim, height: arrowDim }} />
          ) : (
            <ArrowLeft style={{ width: arrowDim, height: arrowDim }} />
          )}
        </button>
      </span>
    );
  } else {
    // Single-segment pill — 1° mutual and 4°≥. Medium gets a fixed
    // 22px height so it lines up with the inline connector avatars.
    degreeChip = (
      <span
        className={cn(
          "inline-flex items-center rounded-full font-semibold",
          degreeSizeCls
        )}
        style={{
          backgroundColor: degreeStyle.bg,
          color: degreeStyle.fg,
          height: size === "medium" ? 22 : undefined,
        }}
      >
        {degreeStyle.label}
      </span>
    );
  }

  // Nano — degree-only.
  if (size === "nano") {
    return (
      <span className={cn("inline-flex items-center", className)}>
        {degreeChip}
      </span>
    );
  }

  // 1° suppresses the standalone vouch chip per spec. Below-coral
  // scores (< 3) also suppress — the chip is meant to validate hosts
  // who have a lot of vouches even without a strong viewer connection,
  // so a low score adds noise rather than signal. The full vouch
  // value still shows in the trust-detail popover.
  const showVouch =
    data.vouch !== null && data.vouch >= 3 && data.degree !== 1;
  const showRating = data.rating !== null && data.reviewCount > 0;

  // Rating — uncontained star + value + (count). Always full white
  // on dark surfaces; deep forest on light. No penalized red flip
  // (per Loren — the rating value already speaks for itself).
  const ratingTextColor = onImage ? "#0B2E25" : "#FFFFFF";
  const ratingMutedColor = onImage
    ? "rgba(11,46,37,0.55)"
    : "rgba(255,255,255,0.6)";
  const ratingDim = size === "micro" ? 12 : 14;
  const ratingTextSize = size === "micro" ? "text-[11px]" : "text-xs";
  const ratingNode = showRating ? (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-semibold tabular-nums",
        ratingTextSize
      )}
      style={{ color: ratingTextColor }}
    >
      <Star
        style={{ width: ratingDim, height: ratingDim, color: ratingTextColor }}
        fill="currentColor"
      />
      <span>{data.rating!.toFixed(1)}</span>
      <span className="font-normal" style={{ color: ratingMutedColor }}>
        ({data.reviewCount})
      </span>
    </span>
  ) : null;

  // Medium — connector strip overlaps the pill's right edge.
  const medConnectorRing = onImage ? "#FFFFFF" : "#07221B";
  const medConnectorBg = onImage ? "#F1F5F4" : "rgba(245,241,230,0.18)";
  const medConnectorSilhouetteFill = onImage
    ? "rgba(11,46,37,0.5)"
    : "rgba(245,241,230,0.65)";
  const medConnectorStrip =
    size === "medium" && data.connectors.length > 0 ? (
      <span
        className="inline-flex items-center -space-x-1.5"
        style={{ marginLeft: -10 }}
      >
        {data.connectors.slice(0, 4).map((c) => (
          <span
            key={c.id}
            title={c.viewerKnows ? c.name : "Mutual connection"}
            className="inline-flex items-center justify-center overflow-hidden rounded-full"
            style={{
              width: 22,
              height: 22,
              border: `2px solid ${medConnectorRing}`,
              backgroundColor: medConnectorBg,
            }}
          >
            {c.viewerKnows && c.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={c.avatarUrl}
                alt={c.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill={medConnectorSilhouetteFill}
                className="h-3.5 w-3.5"
                aria-hidden
              >
                <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5Z" />
              </svg>
            )}
          </span>
        ))}
      </span>
    ) : null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full",
        onImage && "px-1.5 py-0.5 shadow-sm",
        className
      )}
      style={onImage ? { backgroundColor: "rgba(255,255,255,0.95)" } : undefined}
    >
      {degreeChip}
      {size === "micro" && (
        <>
          {showVouch && <VouchPill score={data.vouch!} size="micro" />}
          {ratingNode}
          {showHelpHint && <HelpHint size="micro" />}
        </>
      )}
      {size === "medium" && (
        <>
          {medConnectorStrip}
          {showVouch && <VouchPill score={data.vouch!} size="medium" />}
          {ratingNode}
          {showHelpHint && <HelpHint size="medium" />}
        </>
      )}
    </span>
  );
}

// ── Macro (profile page header block) ─────────────────────────────
// Big detail card. Used on the host's profile page where there's
// room to spell out each metric. Caller wraps it with their own
// avatar/name/bio chrome — this component only renders the degree
// pill row + connector strip + metric tiles.

function MetricTile({
  icon,
  label,
  value,
  unit,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  sub: string;
  tone: "connection" | "vouch" | "rating-good" | "rating-bad" | "muted";
}) {
  const palette =
    tone === "muted"
      ? { bg: "#F1F5F4", fg: "#525252", border: "#E5E5E5" }
      : tone === "connection"
        ? { bg: "#EFF6FF", fg: "#1D4ED8", border: "#BFDBFE" }
        : tone === "vouch"
          ? { bg: "#FAF5FF", fg: "#6B21A8", border: "#E9D5FF" }
          : tone === "rating-good"
            ? { bg: "#FFFBEB", fg: "#B45309", border: "#FDE68A" }
            : { bg: "#FEF2F2", fg: "#B91C1C", border: "#FECACA" };
  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: palette.bg,
        border: `1px solid ${palette.border}`,
      }}
    >
      <div
        className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em]"
        style={{ color: palette.fg }}
      >
        <span className="h-3 w-3">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span
          className="text-2xl font-semibold tabular-nums"
          style={{ color: palette.fg }}
        >
          {value}
        </span>
        <span className="text-xs" style={{ color: palette.fg, opacity: 0.65 }}>
          {unit}
        </span>
      </div>
      <div
        className="mt-1 text-[11px]"
        style={{ color: palette.fg, opacity: 0.75 }}
      >
        {sub}
      </div>
    </div>
  );
}

interface MacroBadgeInnerProps {
  data: TrustBadgeData;
  onAsymmetricClick?: (direction: "outgoing" | "incoming") => void;
}

function MacroBadgeInner({ data, onAsymmetricClick }: MacroBadgeInnerProps) {
  const isColdStart =
    data.degree === null &&
    data.connection === null &&
    data.vouch === null &&
    data.rating === null;

  const isFirstDegree = data.degree === 1;
  const showConnection =
    !isFirstDegree &&
    data.connection !== null &&
    data.degree !== null &&
    data.degree < 4;
  const showVouch = !isFirstDegree && data.vouch !== null;
  const showRating = data.rating !== null && data.reviewCount > 0;
  const ratingWarn = data.rating !== null && data.rating < 3.5;

  const knownConnectorCount = data.connectors.filter((c) => c.viewerKnows).length;
  const totalConnectorCount = data.connectors.length;

  if (isColdStart) {
    return (
      <div
        className="rounded-xl p-5 text-sm"
        style={{
          backgroundColor: "#F1F5F4",
          border: "1px solid #E5E5E5",
          color: "rgba(11,46,37,0.7)",
        }}
      >
        New to Trustead — no vouches or reviews yet. Invite a friend to vouch and
        start a chain.
      </div>
    );
  }

  if (isFirstDegree) {
    const dir = data.vouchDirection ?? "mutual";
    const directVouchCopy =
      dir === "mutual"
        ? "You and this host have vouched for each other"
        : dir === "outgoing"
          ? "You vouched for this host · no return vouch yet"
          : "This host vouched for you · you haven't vouched back";
    return (
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: "#ECFDF5",
            border: "1px solid #A7F3D0",
            color: "#065F46",
          }}
        >
          <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#047857]">
            Direct vouch
          </div>
          <div className="mt-1.5 text-sm font-semibold leading-snug">
            {directVouchCopy}
          </div>
          {dir !== "mutual" && (
            <button
              type="button"
              onClick={() => onAsymmetricClick?.(dir)}
              className="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: ASYMMETRY_ORANGE }}
            >
              {dir === "outgoing" ? (
                <>
                  <ArrowRight className="h-3.5 w-3.5" />
                  Nudge for vouch back
                </>
              ) : (
                <>
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Vouch them back
                </>
              )}
            </button>
          )}
        </div>
        {showRating ? (
          <MetricTile
            icon={<Star className="h-full w-full" fill="currentColor" />}
            label="Rating"
            value={data.rating!.toFixed(1)}
            unit="★"
            sub={`Across ${data.reviewCount} ${data.reviewCount === 1 ? "review" : "reviews"}`}
            tone={ratingWarn ? "rating-bad" : "rating-good"}
          />
        ) : (
          <MetricTile
            icon={<Star className="h-full w-full" fill="currentColor" />}
            label="Rating"
            value="—"
            unit=""
            sub="No reviews yet"
            tone="muted"
          />
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
      {showConnection ? (
        <MetricTile
          icon={ICON_CIRCLE}
          label="Connection"
          value={data.connection!.toFixed(1)}
          unit="/ 10"
          sub={
            knownConnectorCount > 0
              ? `Reachable through ${knownConnectorCount} ${knownConnectorCount === 1 ? "connection" : "connections"} in your network`
              : `Reachable through ${totalConnectorCount} ${totalConnectorCount === 1 ? "chain" : "chains"} in your network`
          }
          tone="connection"
        />
      ) : (
        <MetricTile
          icon={ICON_CIRCLE}
          label="Connection"
          value="—"
          unit=""
          sub="Too far in the network to score"
          tone="muted"
        />
      )}
      {showVouch ? (
        <MetricTile
          icon={ICON_SHIELD}
          label="Vouch"
          value={data.vouch!.toFixed(1)}
          unit="/ 10"
          sub="Platform-wide vouch score"
          tone="vouch"
        />
      ) : (
        <MetricTile
          icon={ICON_SHIELD}
          label="Vouch"
          value="—"
          unit=""
          sub="Not enough vouches yet"
          tone="muted"
        />
      )}
      {showRating ? (
        <MetricTile
          icon={<Star className="h-full w-full" fill="currentColor" />}
          label="Rating"
          value={data.rating!.toFixed(1)}
          unit="★"
          sub={`Across ${data.reviewCount} ${data.reviewCount === 1 ? "review" : "reviews"}`}
          tone={ratingWarn ? "rating-bad" : "rating-good"}
        />
      ) : (
        <MetricTile
          icon={<Star className="h-full w-full" fill="currentColor" />}
          label="Rating"
          value="—"
          unit=""
          sub="No reviews yet"
          tone="muted"
        />
      )}
    </div>
  );
}

/** Profile-page degree pill — same combo / asymmetric / single-segment
 *  rules as the medium badge, sized for the larger header surface.
 *  Lives next to the host's name in the macro block. */
export function MacroDegreePill({
  data,
  onAsymmetricClick,
}: {
  data: TrustBadgeData;
  onAsymmetricClick?: (direction: "outgoing" | "incoming") => void;
}) {
  const isColdStart =
    data.degree === null &&
    data.connection === null &&
    data.vouch === null &&
    data.rating === null;

  if (isColdStart) {
    return (
      <span
        className="inline-flex items-center rounded-full px-3 py-0.5 text-sm font-semibold"
        style={{ backgroundColor: "#3F3F46", color: "#F4F4F5" }}
      >
        New member
      </span>
    );
  }

  if (!data.degree) {
    return (
      <span
        className="inline-flex items-center rounded-full px-3 py-0.5 text-sm font-semibold"
        style={{
          backgroundColor: DEGREE_COLORS.none.bg,
          color: DEGREE_COLORS.none.fg,
        }}
      >
        No path
      </span>
    );
  }

  const degreeStyle = DEGREE_PILL[data.degree];

  if ((data.degree === 2 || data.degree === 3) && data.connection !== null) {
    return (
      <span
        className="inline-flex items-stretch overflow-hidden rounded-full text-sm font-semibold tabular-nums"
        style={{ border: `1px solid ${degreeStyle.outlineColor}` }}
      >
        <span
          className="inline-flex items-center px-3 py-0.5"
          style={{
            backgroundColor: degreeStyle.bg,
            color: degreeStyle.fg,
            borderRadius: 0,
          }}
        >
          {degreeStyle.label}
        </span>
        <span
          className="inline-flex items-center px-3 py-0.5"
          style={{
            color: degreeStyle.outlineColor,
            borderLeft: `1px solid ${degreeStyle.outlineColor}`,
            borderRadius: 0,
          }}
        >
          {data.connection.toFixed(1)}
        </span>
      </span>
    );
  }

  if (
    data.degree === 1 &&
    data.vouchDirection &&
    data.vouchDirection !== "mutual"
  ) {
    const isOutgoing = data.vouchDirection === "outgoing";
    return (
      <span
        className="inline-flex items-stretch overflow-hidden rounded-full text-sm font-semibold"
        style={{ gap: "2px", border: "1px solid rgba(11,46,37,0.14)" }}
      >
        <span
          className="inline-flex items-center px-3 py-0.5"
          style={{
            backgroundColor: degreeStyle.bg,
            color: degreeStyle.fg,
            borderRadius: 0,
          }}
        >
          {degreeStyle.label}
        </span>
        <button
          type="button"
          title={
            isOutgoing
              ? "You vouched for them — they haven't vouched back. Click to nudge."
              : "They vouched for you — you haven't vouched back. Click to vouch back."
          }
          className="inline-flex items-center px-2.5 py-0.5 transition-opacity hover:opacity-90"
          style={{
            backgroundColor: ASYMMETRY_ORANGE,
            color: "#FFFFFF",
            borderRadius: 0,
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAsymmetricClick?.(data.vouchDirection as "outgoing" | "incoming");
          }}
        >
          {isOutgoing ? (
            <ArrowRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-0.5 text-sm font-semibold"
      style={{
        backgroundColor: degreeStyle.bg,
        color: degreeStyle.fg,
        border:
          data.degree === 1 ? "1px solid rgba(11,46,37,0.14)" : undefined,
      }}
    >
      {degreeStyle.label}
    </span>
  );
}

/** Connector strip for the macro block. Pulled out so the host
 *  profile page can render it inline next to the bio without the
 *  whole macro block. */
export function MacroConnectorStrip({
  connectors,
}: {
  connectors: BadgeConnector[];
}) {
  if (connectors.length === 0) return null;
  const known = connectors.filter((c) => c.viewerKnows);
  const anonCount = connectors.length - known.length;
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center -space-x-1.5">
        {connectors.slice(0, 4).map((c) => (
          <span
            key={c.id}
            title={c.viewerKnows ? c.name : "Mutual connection"}
            className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full"
            style={{ border: "2px solid #FFFFFF", backgroundColor: "#F1F5F4" }}
          >
            {c.viewerKnows && c.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={c.avatarUrl}
                alt={c.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="rgba(11,46,37,0.5)"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5Z" />
              </svg>
            )}
          </span>
        ))}
      </span>
      <span className="text-xs" style={{ color: "rgba(11,46,37,0.62)" }}>
        {known.map((c) => c.name).join(", ")}
        {anonCount > 0 && (known.length > 0 ? ` + ${anonCount} mutual` : `${anonCount} mutual connection${anonCount === 1 ? "" : "s"}`)}
      </span>
    </div>
  );
}
