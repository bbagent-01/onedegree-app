/**
 * TrustBadge data adapter.
 *
 * Builds the canonical `TrustBadgeData` shape consumed by the
 * TrustBadge component (src/components/trust/trust-badge.tsx) from
 * the existing trust + user data flows. Pure JS — no DB queries; the
 * caller is responsible for already having the trust path computed
 * and the host fields hydrated.
 *
 * Where used:
 *   - browse-data → BrowseListing host fields + per-listing trust
 *   - profile page → computeTrustPath + the host's user record
 *   - inbox / proposals / trips / reservations → existing trust slice
 *     + the participant's user record
 */

import type { ConnectorPathSummary } from "@/lib/trust-data";
import type {
  BadgeConnector,
  TrustBadgeData,
  VouchDirection,
} from "@/components/trust/trust-badge";

/** Host fields the badge wants from the target user's record. All
 *  optional — the badge degrades gracefully when fields are missing. */
export interface BadgeHostFields {
  /** users.vouch_score — Trust v2 user-level 0-10 score (mig 046). */
  vouch_score?: number | null;
  /** users.host_rating — average host rating from past stays (0-5). */
  host_rating?: number | null;
  /** users.host_review_count — total host reviews. */
  host_review_count?: number | null;
}

/** TrustResult-shaped slice. Lets callers pass either a full
 *  TrustResult or the narrower per-listing trust shape they already
 *  carry (BrowseListingTrust, etc.). */
export interface BadgeTrustSlice {
  degree: 1 | 2 | 3 | 4 | null;
  /** Composite trust score on the legacy 0-100ish scale. Rescaled
   *  to 0-10 for the connection metric. */
  score?: number | null;
  hasDirectVouch?: boolean;
  /** True iff the target has vouched for the viewer (incoming). Used
   *  to detect 1° asymmetry. */
  hasIncomingVouch?: boolean;
  connectorPaths?: ConnectorPathSummary[];
}

/**
 * Map the legacy 0-100ish composite score to the locked variant's
 * 0-10 connection scale. Anything ≥ 100 caps at 10.0. Returns null
 * when the score is unset / 0 (no path).
 */
function rescaleConnection(score: number | null | undefined): number | null {
  if (score === null || score === undefined || score <= 0) return null;
  const v = score / 10;
  if (v >= 10) return 10;
  return Math.round(v * 10) / 10;
}

function mapConnectors(
  paths: ConnectorPathSummary[] | undefined
): BadgeConnector[] {
  if (!paths || paths.length === 0) return [];
  // De-dupe by id (a connector who appears in multiple paths shows once).
  const seen = new Set<string>();
  const out: BadgeConnector[] = [];
  for (const p of paths) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push({
      id: p.id,
      name: p.name,
      avatarUrl: p.avatar_url,
      viewerKnows: p.viewer_knows,
    });
  }
  return out;
}

function deriveVouchDirection(
  trust: BadgeTrustSlice
): VouchDirection | undefined {
  if (trust.degree !== 1) return undefined;
  // Asymmetry detection requires knowing both directions of the
  // direct edge. When the caller hasn't supplied hasIncomingVouch we
  // default to "mutual" — the engine will eventually wire the signal
  // through; until then the safe default suppresses the orange chip.
  if (typeof trust.hasIncomingVouch !== "boolean") return "mutual";
  const outgoing = trust.hasDirectVouch ?? false;
  const incoming = trust.hasIncomingVouch;
  if (outgoing && incoming) return "mutual";
  if (outgoing && !incoming) return "outgoing";
  if (!outgoing && incoming) return "incoming";
  return "mutual";
}

/**
 * Cold-start detection. A user with no trust signal AND no rating
 * AND no inbound vouches is a "New member". Currently we can only
 * see the host side fields — degree=null + vouch_score=null/0 +
 * no rating is the closest we can detect at this layer.
 */
function isColdStart(
  trust: BadgeTrustSlice,
  host: BadgeHostFields
): boolean {
  if (trust.degree !== null) return false;
  const noVouch = !host.vouch_score || host.vouch_score === 0;
  const noRating =
    !host.host_rating ||
    !host.host_review_count ||
    host.host_review_count === 0;
  return noVouch && noRating;
}

/**
 * Build TrustBadgeData from a viewer→target trust slice + the
 * target's user record fields. Use this everywhere a TrustBadge
 * is rendered so the prop shape stays consistent.
 */
export function toTrustBadgeData(
  trust: BadgeTrustSlice | null | undefined,
  host: BadgeHostFields | null | undefined
): TrustBadgeData {
  const t: BadgeTrustSlice = trust ?? { degree: null };
  const h: BadgeHostFields = host ?? {};

  if (isColdStart(t, h)) {
    return {
      degree: null,
      connection: null,
      vouch: null,
      rating: null,
      reviewCount: 0,
      connectors: [],
    };
  }

  const direct = t.hasDirectVouch ?? false;
  const effectiveDegree =
    t.degree ?? (direct ? (1 as const) : null);

  return {
    degree: effectiveDegree,
    vouchDirection: deriveVouchDirection({ ...t, degree: effectiveDegree }),
    connection: rescaleConnection(t.score ?? null),
    vouch:
      typeof h.vouch_score === "number" && h.vouch_score > 0
        ? Math.round(h.vouch_score * 10) / 10
        : null,
    rating:
      typeof h.host_rating === "number" && h.host_rating > 0
        ? h.host_rating
        : null,
    reviewCount: h.host_review_count ?? 0,
    connectors: mapConnectors(t.connectorPaths),
  };
}
