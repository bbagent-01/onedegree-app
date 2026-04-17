/**
 * Trust path computation — server-side only.
 *
 * The viewer's "trust score" to a given target user is a composite of:
 *  - direct vouches (1st degree): viewer -> target
 *  - indirect paths   (2nd degree): viewer -> connector -> target
 *
 * The locked formula (see PROJECT_PLAN.md § Trust Mechanics):
 *
 *   single edge strength =
 *     vouch_type_points (standard=15, inner_circle=25)
 *     * years_known_multiplier
 *     * (voucher.vouch_power / 4)    // vouch_power [1..5], 4 is neutral
 *
 *   1st-degree score = edge(viewer -> target)
 *   2nd-degree score = avg(edge(viewer -> connector), edge(connector -> target))
 *                      across every connector (RPC already sums these per path)
 *
 *   final score = max(direct, summed_2nd_degree)
 *
 * For the RPC implementation see migration 001 — this module wraps it
 * and adds the 1st-degree path + JS fallback.
 *
 * Year-known multipliers (from `vouch-constants.ts` and migration 001):
 *   lt1yr=0.6, 1to3yr=0.8, 4to7yr=1.0, 8to15yr=1.4, 15plusyr=1.8
 */

import { getSupabaseAdmin } from "./supabase";

export type TrustDegree = 1 | 2 | null;

export interface TrustPathUser {
  id: string;
  name: string;
  avatar_url: string | null;
  /**
   * The trust strength of the edge that ENTERS this node — i.e. how
   * strongly the previous node (viewer, or prior intermediary) vouched
   * for this node. The viewer itself has `edge = null`.
   */
  edge: number | null;
  vouch_type?: "standard" | "inner_circle";
}

export interface ConnectorPathSummary {
  id: string;
  name: string;
  avatar_url: string | null;
  /** Individual path strength (viewer→connector→target average). */
  strength: number;
  /** True iff the viewer has a direct vouch for this connector. In the
   *  current single-hop model every connector is directly known by the
   *  viewer; this flag exists for the multi-hop future. */
  viewer_knows: boolean;
}

export interface TrustResult {
  /** Composite trust score (integer, floor). 0 means no path. */
  score: number;
  /** 1 = direct vouch, 2 = through an intermediary, null = no path */
  degree: TrustDegree;
  /**
   * Whether the viewer has personally vouched for the target. Overrides
   * the numeric score everywhere in the UI — a direct vouch is the
   * strongest possible trust signal regardless of any computed score.
   */
  hasDirectVouch: boolean;
  /** Best path from viewer → target. Empty if no path. */
  path: TrustPathUser[];
  /** Every 1st-degree user who could introduce the viewer to the target. */
  mutualConnections: TrustPathUser[];
  /** Raw connector count from RPC (distinct intermediaries). */
  connectionCount: number;
  /**
   * All connector paths sorted strongest → weakest. Feeds the
   * ConnectorDots / ConnectorAvatars sub-components. Each entry is one
   * viewer→connector→target bridge; a connector who appears in
   * multiple paths is de-duplicated to their strongest.
   */
  connectorPaths: ConnectorPathSummary[];
}

export interface TrustResultsByTarget {
  [targetId: string]: TrustResult;
}

const YEARS_MULTIPLIER: Record<string, number> = {
  lt1yr: 0.6,
  "1to3yr": 0.8,
  "4to7yr": 1.0,
  "8to15yr": 1.4,
  "15plusyr": 1.8,
};

const VOUCH_POINTS: Record<string, number> = {
  standard: 15,
  inner_circle: 25,
};

function edgeStrength(
  vouchType: string,
  yearsKnownBucket: string,
  voucherVouchPower: number | null
): number {
  const pts = VOUCH_POINTS[vouchType] ?? 15;
  const mult = YEARS_MULTIPLIER[yearsKnownBucket] ?? 1;
  const vpScale = (voucherVouchPower ?? 4) / 4;
  return pts * mult * vpScale;
}

const EMPTY: TrustResult = {
  score: 0,
  degree: null,
  hasDirectVouch: false,
  path: [],
  mutualConnections: [],
  connectionCount: 0,
  connectorPaths: [],
};

/**
 * Compute trust paths from `viewerId` to each target user.
 * Batched — a single DB round-trip per query type.
 *
 * - Direct vouches: 1 query on `vouches` filtered by viewer→targets.
 * - Indirect paths: calls the `calculate_one_degree_scores` RPC.
 * - Mutual connections: 1 query on `vouches` to get the chain of
 *   intermediaries for each target.
 * - User profile hydration: 1 `users` query at the end.
 */
export async function computeTrustPaths(
  viewerId: string,
  targetIds: string[]
): Promise<TrustResultsByTarget> {
  const out: TrustResultsByTarget = {};
  if (!viewerId || targetIds.length === 0) return out;

  const unique = [...new Set(targetIds)].filter((id) => id && id !== viewerId);
  if (unique.length === 0) {
    // Viewer looking at themselves / no real targets.
    for (const id of targetIds) out[id] = EMPTY;
    return out;
  }

  const supabase = getSupabaseAdmin();

  // 1. Direct vouches from the viewer to any target.
  const { data: directRows } = await supabase
    .from("vouches")
    .select(
      "voucher_id, vouchee_id, vouch_type, years_known_bucket"
    )
    .eq("voucher_id", viewerId)
    .in("vouchee_id", unique);

  // Also load the viewer's vouch_power for edge scaling.
  const { data: viewerRow } = await supabase
    .from("users")
    .select("id, vouch_power")
    .eq("id", viewerId)
    .maybeSingle();

  const viewerVouchPower =
    (viewerRow as { vouch_power: number | null } | null)?.vouch_power ?? 4;

  type DirectRow = {
    voucher_id: string;
    vouchee_id: string;
    vouch_type: "standard" | "inner_circle";
    years_known_bucket: string;
  };
  const directByTarget = new Map<
    string,
    { score: number; vouch_type: "standard" | "inner_circle" }
  >();
  for (const r of (directRows || []) as DirectRow[]) {
    const s = edgeStrength(r.vouch_type, r.years_known_bucket, viewerVouchPower);
    directByTarget.set(r.vouchee_id, { score: s, vouch_type: r.vouch_type });
  }

  // 2. Indirect 2-hop paths via the RPC.
  type RpcRow = {
    target_id: string;
    score: number;
    connection_count: number;
  };
  let indirectRows: RpcRow[] = [];
  try {
    const { data } = await supabase.rpc("calculate_one_degree_scores", {
      p_viewer_id: viewerId,
      p_target_ids: unique,
    });
    indirectRows = (data || []) as RpcRow[];
  } catch {
    // RPC may not be deployed — fall back to JS.
    indirectRows = await computeIndirectFallback(
      supabase,
      viewerId,
      unique,
      viewerVouchPower
    );
  }

  const indirectByTarget = new Map<
    string,
    { score: number; connectionCount: number }
  >();
  for (const r of indirectRows) {
    indirectByTarget.set(r.target_id, {
      score: r.score,
      connectionCount: r.connection_count,
    });
  }

  // 3. Pull the chain users we need (direct vouches + intermediaries).
  //    Connectors = users who the viewer vouched for AND who vouched
  //    for one of the targets.
  const { data: viewerEdges } = await supabase
    .from("vouches")
    .select("vouchee_id, vouch_type, years_known_bucket")
    .eq("voucher_id", viewerId);

  type EdgeRow = {
    vouchee_id: string;
    vouch_type: "standard" | "inner_circle";
    years_known_bucket: string;
  };
  const viewerEdgeMap = new Map<string, EdgeRow>();
  for (const e of (viewerEdges || []) as EdgeRow[]) {
    viewerEdgeMap.set(e.vouchee_id, e);
  }
  const candidateIds = [...viewerEdgeMap.keys()];

  // connector -> target edges (only needed for the chosen targets).
  const { data: connTargetEdges } =
    candidateIds.length > 0
      ? await supabase
          .from("vouches")
          .select("voucher_id, vouchee_id, vouch_type, years_known_bucket")
          .in("voucher_id", candidateIds)
          .in("vouchee_id", unique)
      : { data: [] };

  type ConnRow = {
    voucher_id: string;
    vouchee_id: string;
    vouch_type: "standard" | "inner_circle";
    years_known_bucket: string;
  };
  const connectorsByTarget = new Map<string, ConnRow[]>();
  for (const r of (connTargetEdges || []) as ConnRow[]) {
    const arr = connectorsByTarget.get(r.vouchee_id) || [];
    arr.push(r);
    connectorsByTarget.set(r.vouchee_id, arr);
  }

  // 4. Hydrate user profiles for viewer + connectors + targets.
  const profileIds = new Set<string>([viewerId, ...unique]);
  for (const arr of connectorsByTarget.values()) {
    for (const r of arr) profileIds.add(r.voucher_id);
  }

  type ProfileRow = {
    id: string;
    name: string;
    avatar_url: string | null;
    vouch_power: number | null;
  };
  const { data: profiles } = await supabase
    .from("users")
    .select("id, name, avatar_url, vouch_power")
    .in("id", [...profileIds]);

  const profileById = new Map<string, ProfileRow>(
    ((profiles || []) as ProfileRow[]).map((p) => [p.id, p])
  );

  // 5. Assemble results for every target.
  for (const targetId of unique) {
    const direct = directByTarget.get(targetId);
    const indirect = indirectByTarget.get(targetId);
    const directScore = direct?.score ?? 0;
    const indirectScore = indirect?.score ?? 0;

    const score = Math.floor(Math.max(directScore, indirectScore));
    const hasDirectVouch = directScore > 0;
    // A direct vouch always wins. The composite score still reflects
    // the stronger of direct/indirect, but the badge/UI treats the
    // connection as direct whenever the viewer has personally vouched
    // for the target.
    const degree: TrustDegree = hasDirectVouch
      ? 1
      : indirectScore > 0
        ? 2
        : null;

    const viewerProfile = profileById.get(viewerId);
    const targetProfile = profileById.get(targetId);

    // Build the "best" path.
    let path: TrustPathUser[] = [];
    if (degree === 1 && viewerProfile && targetProfile) {
      path = [
        {
          id: viewerProfile.id,
          name: viewerProfile.name,
          avatar_url: viewerProfile.avatar_url,
          edge: null,
        },
        {
          id: targetProfile.id,
          name: targetProfile.name,
          avatar_url: targetProfile.avatar_url,
          edge: Math.round(directScore),
          vouch_type: direct!.vouch_type,
        },
      ];
    } else if (degree === 2 && viewerProfile && targetProfile) {
      // Pick the strongest single connector path.
      const rows = connectorsByTarget.get(targetId) || [];
      let bestStrength = -1;
      let bestRow: ConnRow | null = null;
      for (const r of rows) {
        const viewerEdge = viewerEdgeMap.get(r.voucher_id);
        if (!viewerEdge) continue;
        const connectorProfile = profileById.get(r.voucher_id);
        const connectorVp = connectorProfile?.vouch_power ?? 4;
        const viewerEdgeStrength = edgeStrength(
          viewerEdge.vouch_type,
          viewerEdge.years_known_bucket,
          viewerVouchPower
        );
        const connectorEdgeStrength = edgeStrength(
          r.vouch_type,
          r.years_known_bucket,
          connectorVp
        );
        const pathAvg = (viewerEdgeStrength + connectorEdgeStrength) / 2;
        if (pathAvg > bestStrength) {
          bestStrength = pathAvg;
          bestRow = r;
        }
      }

      if (bestRow) {
        const connectorProfile = profileById.get(bestRow.voucher_id);
        const viewerEdge = viewerEdgeMap.get(bestRow.voucher_id)!;
        const viewerEdgeStrength = edgeStrength(
          viewerEdge.vouch_type,
          viewerEdge.years_known_bucket,
          viewerVouchPower
        );
        const connectorEdgeStrength = edgeStrength(
          bestRow.vouch_type,
          bestRow.years_known_bucket,
          connectorProfile?.vouch_power ?? 4
        );
        path = [
          {
            id: viewerProfile.id,
            name: viewerProfile.name,
            avatar_url: viewerProfile.avatar_url,
            edge: null,
          },
          {
            id: connectorProfile?.id ?? bestRow.voucher_id,
            name: connectorProfile?.name ?? "Connection",
            avatar_url: connectorProfile?.avatar_url ?? null,
            edge: Math.round(viewerEdgeStrength),
            vouch_type: viewerEdge.vouch_type,
          },
          {
            id: targetProfile.id,
            name: targetProfile.name,
            avatar_url: targetProfile.avatar_url,
            edge: Math.round(connectorEdgeStrength),
            vouch_type: bestRow.vouch_type,
          },
        ];
      }
    }

    // Mutual connections — every connector who vouched for this target.
    // Also build the full connectorPaths list sorted by individual
    // path strength so the UI can render per-connector dots / avatars
    // with each one colored by its own bucket.
    const mutualConnections: TrustPathUser[] = [];
    const seen = new Set<string>();
    const pathsByConnector = new Map<string, ConnectorPathSummary>();

    for (const r of connectorsByTarget.get(targetId) || []) {
      const prof = profileById.get(r.voucher_id);
      if (!prof) continue;

      if (!seen.has(r.voucher_id)) {
        seen.add(r.voucher_id);
        mutualConnections.push({
          id: prof.id,
          name: prof.name,
          avatar_url: prof.avatar_url,
          edge: null,
        });
      }

      const viewerEdge = viewerEdgeMap.get(r.voucher_id);
      if (!viewerEdge) continue;
      const viewerStrength = edgeStrength(
        viewerEdge.vouch_type,
        viewerEdge.years_known_bucket,
        viewerVouchPower
      );
      const connectorStrength = edgeStrength(
        r.vouch_type,
        r.years_known_bucket,
        prof.vouch_power ?? 4
      );
      const pathAvg = (viewerStrength + connectorStrength) / 2;

      const existing = pathsByConnector.get(r.voucher_id);
      if (!existing || pathAvg > existing.strength) {
        pathsByConnector.set(r.voucher_id, {
          id: prof.id,
          name: prof.name,
          avatar_url: prof.avatar_url,
          strength: pathAvg,
          // Every connector is a 1st-hop vouchee of the viewer in the
          // current single-hop model.
          viewer_knows: true,
        });
      }
    }

    const connectorPaths = [...pathsByConnector.values()].sort(
      (a, b) => b.strength - a.strength
    );

    out[targetId] = {
      score,
      degree,
      hasDirectVouch,
      path,
      mutualConnections,
      connectionCount: indirect?.connectionCount ?? mutualConnections.length,
      connectorPaths,
    };
  }

  // Fill in self / unknown targets with the empty result.
  for (const id of targetIds) {
    if (!out[id]) out[id] = EMPTY;
  }
  return out;
}

/**
 * Single-target convenience wrapper.
 */
export async function computeTrustPath(
  viewerId: string,
  targetId: string
): Promise<TrustResult> {
  const res = await computeTrustPaths(viewerId, [targetId]);
  return res[targetId] || EMPTY;
}

/**
 * JS fallback if the `calculate_one_degree_scores` RPC isn't deployed.
 * Mirrors the RPC's formula path-by-path. Only used on RPC failure.
 */
async function computeIndirectFallback(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  viewerId: string,
  targetIds: string[],
  viewerVouchPower: number
): Promise<
  Array<{ target_id: string; score: number; connection_count: number }>
> {
  const { data: viewerEdges } = await supabase
    .from("vouches")
    .select("vouchee_id, vouch_type, years_known_bucket")
    .eq("voucher_id", viewerId);

  type Edge = {
    vouchee_id: string;
    vouch_type: "standard" | "inner_circle";
    years_known_bucket: string;
  };
  const viewerEdgeMap = new Map<string, Edge>();
  for (const e of (viewerEdges || []) as Edge[]) {
    viewerEdgeMap.set(e.vouchee_id, e);
  }
  const connectorIds = [...viewerEdgeMap.keys()];
  if (connectorIds.length === 0) {
    return targetIds.map((t) => ({
      target_id: t,
      score: 0,
      connection_count: 0,
    }));
  }

  const { data: connEdges } = await supabase
    .from("vouches")
    .select("voucher_id, vouchee_id, vouch_type, years_known_bucket")
    .in("voucher_id", connectorIds)
    .in("vouchee_id", targetIds);

  const { data: connectorProfiles } = await supabase
    .from("users")
    .select("id, vouch_power")
    .in("id", connectorIds);
  const vpById = new Map<string, number>(
    ((connectorProfiles || []) as { id: string; vouch_power: number | null }[]).map(
      (p) => [p.id, p.vouch_power ?? 4]
    )
  );

  type ConnEdge = {
    voucher_id: string;
    vouchee_id: string;
    vouch_type: "standard" | "inner_circle";
    years_known_bucket: string;
  };
  const totals = new Map<string, { score: number; count: number }>();
  for (const e of (connEdges || []) as ConnEdge[]) {
    const viewerEdge = viewerEdgeMap.get(e.voucher_id);
    if (!viewerEdge) continue;
    const viewerStrength = edgeStrength(
      viewerEdge.vouch_type,
      viewerEdge.years_known_bucket,
      viewerVouchPower
    );
    const connStrength = edgeStrength(
      e.vouch_type,
      e.years_known_bucket,
      vpById.get(e.voucher_id) ?? 4
    );
    const pathAvg = (viewerStrength + connStrength) / 2;
    const t = totals.get(e.vouchee_id) || { score: 0, count: 0 };
    t.score += pathAvg;
    t.count += 1;
    totals.set(e.vouchee_id, t);
  }

  return targetIds.map((t) => {
    const rec = totals.get(t) || { score: 0, count: 0 };
    return {
      target_id: t,
      score: Math.round(rec.score),
      connection_count: rec.count,
    };
  });
}

/**
 * Tier configuration used by TrustBadge, TrustGate, and filter UI.
 * Low scores are neutral gray (not alarming) and warmer colors
 * signal progressively stronger trust. Red is reserved for errors
 * and is intentionally absent from the trust scale.
 *
 *   0        Not connected          zinc
 *   1–14     Weak                   zinc (same gray family, subtle)
 *   15–29    Modest                 orange
 *   30–49    Strong                 lime (yellow-green)
 *   50–74    Very strong            emerald
 *   75+      Extremely strong       blue
 */
export type TrustTierKey =
  | "none"
  | "weak"
  | "modest"
  | "strong"
  | "very_strong"
  | "extremely_strong";

export interface TrustTier {
  key: TrustTierKey;
  label: string;
  /** Dot / accent color. */
  dotClass: string;
  /** Ring color used for md/lg pill outlines. */
  ringClass: string;
  /** Foreground text color used when on a white background. */
  textClass: string;
  /** Soft tinted background + text used on small badges over photos. */
  tintClass: string;
  /** Solid colored background used when emphasis is needed. */
  solidClass: string;
}

export function trustTier(score: number): TrustTier {
  if (score >= 75) {
    return {
      key: "extremely_strong",
      label: "Extremely strong",
      dotClass: "bg-blue-500",
      ringClass: "ring-blue-500/40",
      textClass: "text-blue-700",
      tintClass: "bg-blue-50 text-blue-800 ring-blue-200",
      solidClass: "bg-blue-600 text-white",
    };
  }
  if (score >= 50) {
    return {
      key: "very_strong",
      label: "Very strong",
      dotClass: "bg-emerald-500",
      ringClass: "ring-emerald-500/40",
      textClass: "text-emerald-700",
      tintClass: "bg-emerald-50 text-emerald-800 ring-emerald-200",
      solidClass: "bg-emerald-600 text-white",
    };
  }
  if (score >= 30) {
    return {
      key: "strong",
      label: "Strong",
      dotClass: "bg-lime-500",
      ringClass: "ring-lime-500/40",
      textClass: "text-lime-700",
      tintClass: "bg-lime-50 text-lime-800 ring-lime-200",
      solidClass: "bg-lime-600 text-white",
    };
  }
  if (score >= 15) {
    return {
      key: "modest",
      label: "Modest",
      dotClass: "bg-orange-500",
      ringClass: "ring-orange-500/40",
      textClass: "text-orange-700",
      tintClass: "bg-orange-50 text-orange-800 ring-orange-200",
      solidClass: "bg-orange-500 text-white",
    };
  }
  if (score >= 1) {
    return {
      key: "weak",
      label: "Weak",
      dotClass: "bg-zinc-400",
      ringClass: "ring-zinc-400/40",
      textClass: "text-zinc-600",
      tintClass: "bg-zinc-50 text-zinc-700 ring-zinc-200",
      solidClass: "bg-zinc-500 text-white",
    };
  }
  return {
    key: "none",
    label: "Not connected",
    dotClass: "bg-zinc-300",
    ringClass: "ring-zinc-200",
    textClass: "text-zinc-500",
    tintClass: "bg-zinc-50 text-zinc-600 ring-zinc-200",
    solidClass: "bg-zinc-400 text-white",
  };
}

/**
 * Resolve a Clerk user id to the internal users.id PK. Cached per
 * request via the Next.js fetch cache — safe for frequent calls.
 */
export async function getInternalUserIdFromClerk(
  clerkId: string | null | undefined
): Promise<string | null> {
  if (!clerkId) return null;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}
