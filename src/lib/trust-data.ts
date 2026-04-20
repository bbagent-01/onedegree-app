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
import {
  YEARS_MULTIPLIER as CANONICAL_YEARS_MULTIPLIER,
  VOUCH_BASE_POINTS as CANONICAL_VOUCH_POINTS,
} from "./trust/types";

export type TrustDegree = 1 | 2 | 3 | 4 | null;

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

// Canonical multipliers live in src/lib/trust/types.ts — importing
// them here keeps trust-data.ts and compute-score.ts in sync so the
// badge and the popover always compute the same number. Previously
// this file had its own drifted copy (1to3yr=0.8, 4to7yr=1.0) which
// made the listing badge disagree with the "show math" breakdown.
const YEARS_MULTIPLIER = CANONICAL_YEARS_MULTIPLIER;
const VOUCH_POINTS = CANONICAL_VOUCH_POINTS;

/**
 * Clamp a stored vouch_power into a [0.5, 1.5] multiplier. Post-
 * migration-014b values live there already; legacy rows carrying the
 * raw 1–5 guest_rating get divided by 4 first.
 */
function clampVp(raw: number | null | undefined): number {
  const v = typeof raw === "number" && isFinite(raw) ? raw : 1.0;
  const multiplier = v >= 2 ? v / 4 : v;
  return Math.max(0.5, Math.min(1.5, multiplier));
}

function edgeStrength(
  vouchType: string,
  yearsKnownBucket: string,
  voucherVouchPower: number | null
): number {
  const pts =
    (VOUCH_POINTS as Record<string, number>)[vouchType] ?? 15;
  const mult =
    (YEARS_MULTIPLIER as Record<string, number>)[yearsKnownBucket] ?? 1;
  return pts * mult * clampVp(voucherVouchPower);
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

    // Math.round (not floor) so 75.75 → 76 matches the "Total" line
    // in the popover's math view instead of silently dropping .75.
    const score = Math.round(Math.max(directScore, indirectScore));
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

  // Multi-hop upgrade pass: targets still at degree=null that the
  // viewer reaches via 3 or 4 edges. Score stays 0; path is
  // hydrated so the trust-detail popover can draw the chain.
  let unresolved = targetIds.filter(
    (id) => id !== viewerId && out[id]?.degree == null
  );
  const multiHopChains = new Map<string, { chain: string[]; degree: 3 | 4 }>();
  if (unresolved.length > 0) {
    const reach3 = await findNDegreeReach(
      supabase,
      viewerId,
      unresolved,
      "outgoing",
      3
    );
    for (const [id, chain] of reach3) {
      multiHopChains.set(id, { chain, degree: 3 });
    }
    unresolved = unresolved.filter((id) => !reach3.has(id));
  }
  if (unresolved.length > 0) {
    const reach4 = await findNDegreeReach(
      supabase,
      viewerId,
      unresolved,
      "outgoing",
      4
    );
    for (const [id, chain] of reach4) {
      multiHopChains.set(id, { chain, degree: 4 });
    }
  }
  if (multiHopChains.size > 0) {
    await applyMultiHopChains(supabase, out, multiHopChains, "outgoing");
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
 * Reverse-batched trust paths: for each potential voucher in
 * `sourceIds`, compute how much they trust `viewerId` (i.e. paths
 * `source → connector → viewer`). Mirrors `computeTrustPaths` but
 * with voucher_id / vouchee_id roles flipped, so one viewer can be
 * compared against many potential hosts in a single round-trip.
 *
 * Used on the guest side everywhere a listing/host/trip is shown:
 * the displayed "Trust Score" is the host's trust of the viewer,
 * matching the host→guest vetting direction of the platform.
 */
export async function computeIncomingTrustPaths(
  sourceIds: string[],
  viewerId: string
): Promise<TrustResultsByTarget> {
  const out: TrustResultsByTarget = {};
  if (!viewerId || sourceIds.length === 0) return out;

  const unique = [...new Set(sourceIds)].filter(
    (id) => id && id !== viewerId
  );
  if (unique.length === 0) {
    for (const id of sourceIds) out[id] = EMPTY;
    return out;
  }

  const supabase = getSupabaseAdmin();

  // 1. Direct vouches from each source to the viewer.
  const { data: directRows } = await supabase
    .from("vouches")
    .select("voucher_id, vouchee_id, vouch_type, years_known_bucket")
    .in("voucher_id", unique)
    .eq("vouchee_id", viewerId);

  type DirectRow = {
    voucher_id: string;
    vouchee_id: string;
    vouch_type: "standard" | "inner_circle";
    years_known_bucket: string;
  };

  // Need each source's vouch_power to compute their direct edge.
  const { data: sourceRows } = await supabase
    .from("users")
    .select("id, name, avatar_url, vouch_power")
    .in("id", unique);
  type SourceRow = {
    id: string;
    name: string;
    avatar_url: string | null;
    vouch_power: number | null;
  };
  const sourceById = new Map<string, SourceRow>(
    ((sourceRows || []) as SourceRow[]).map((s) => [s.id, s])
  );

  const directBySource = new Map<
    string,
    { score: number; vouch_type: "standard" | "inner_circle" }
  >();
  for (const r of (directRows || []) as DirectRow[]) {
    const vp = sourceById.get(r.voucher_id)?.vouch_power ?? 4;
    const s = edgeStrength(r.vouch_type, r.years_known_bucket, vp);
    directBySource.set(r.voucher_id, { score: s, vouch_type: r.vouch_type });
  }

  // 2. For each source, fetch their outgoing vouches (connector
  //    candidates — these are the people each source vouched for).
  const { data: sourceEdges } = await supabase
    .from("vouches")
    .select("voucher_id, vouchee_id, vouch_type, years_known_bucket")
    .in("voucher_id", unique);

  type EdgeRow = {
    voucher_id: string;
    vouchee_id: string;
    vouch_type: "standard" | "inner_circle";
    years_known_bucket: string;
  };
  // source → [connector edges]
  const sourceEdgesMap = new Map<string, EdgeRow[]>();
  for (const e of (sourceEdges || []) as EdgeRow[]) {
    const arr = sourceEdgesMap.get(e.voucher_id) || [];
    arr.push(e);
    sourceEdgesMap.set(e.voucher_id, arr);
  }

  // 3. Any vouch into the viewer — these tell us which connectors
  //    vouched for the viewer.
  const allConnectorIds = [
    ...new Set(
      ((sourceEdges || []) as EdgeRow[]).map((e) => e.vouchee_id)
    ),
  ];
  const { data: connectorIntoViewer } =
    allConnectorIds.length > 0
      ? await supabase
          .from("vouches")
          .select("voucher_id, vouch_type, years_known_bucket")
          .in("voucher_id", allConnectorIds)
          .eq("vouchee_id", viewerId)
      : { data: [] };

  type ConnIntoViewer = {
    voucher_id: string;
    vouch_type: "standard" | "inner_circle";
    years_known_bucket: string;
  };
  const connectorIntoViewerMap = new Map<string, ConnIntoViewer>();
  for (const r of (connectorIntoViewer || []) as ConnIntoViewer[]) {
    // Keep one edge per connector. If they have multiple vouches of
    // the viewer the schema wouldn't let that happen (unique pair),
    // but just in case.
    connectorIntoViewerMap.set(r.voucher_id, r);
  }

  // 4. Hydrate every profile involved (sources + connectors + viewer).
  const profileIds = new Set<string>([viewerId]);
  for (const id of unique) profileIds.add(id);
  for (const cid of connectorIntoViewerMap.keys()) profileIds.add(cid);

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

  // 5. Assemble results per source.
  const viewerProfile = profileById.get(viewerId);
  for (const sourceId of unique) {
    const sourceProfile = profileById.get(sourceId);
    const direct = directBySource.get(sourceId);
    const directScore = direct?.score ?? 0;

    // Indirect: for each source→connector edge, if that connector
    // also vouched for the viewer, build a path. Sum uses harmonic
    // dampening — same formula as the outgoing direction.
    const rawPaths: Array<{
      connector_id: string;
      link_a: number;
      link_b: number;
      path_strength: number;
    }> = [];
    const sourceOutgoingEdges = sourceEdgesMap.get(sourceId) || [];
    const sourceVp = sourceProfile?.vouch_power ?? 4;

    for (const e of sourceOutgoingEdges) {
      const connIntoViewer = connectorIntoViewerMap.get(e.vouchee_id);
      if (!connIntoViewer) continue;
      const connectorProfile = profileById.get(e.vouchee_id);
      const connectorVp = connectorProfile?.vouch_power ?? 4;

      // link_a: source → connector, using source's vouch power
      const linkA = edgeStrength(
        e.vouch_type,
        e.years_known_bucket,
        sourceVp
      );
      // link_b: connector → viewer, using connector's vouch power
      const linkB = edgeStrength(
        connIntoViewer.vouch_type,
        connIntoViewer.years_known_bucket,
        connectorVp
      );
      const pathStrength = (linkA + linkB) / 2;
      rawPaths.push({
        connector_id: e.vouchee_id,
        link_a: linkA,
        link_b: linkB,
        path_strength: pathStrength,
      });
    }

    rawPaths.sort((a, b) => b.path_strength - a.path_strength);
    const indirectScoreRaw = rawPaths.reduce(
      (sum, p, i) => sum + p.path_strength / (i + 1),
      0
    );

    const score = Math.round(Math.max(directScore, indirectScoreRaw));
    const hasDirectVouch = directScore > 0;
    const degree: TrustDegree = hasDirectVouch
      ? 1
      : indirectScoreRaw > 0
        ? 2
        : null;

    // Build the best path (source → [connector] → viewer).
    let path: TrustPathUser[] = [];
    if (degree === 1 && sourceProfile && viewerProfile) {
      path = [
        {
          id: sourceProfile.id,
          name: sourceProfile.name,
          avatar_url: sourceProfile.avatar_url,
          edge: null,
        },
        {
          id: viewerProfile.id,
          name: viewerProfile.name,
          avatar_url: viewerProfile.avatar_url,
          edge: Math.round(directScore),
          vouch_type: direct!.vouch_type,
        },
      ];
    } else if (degree === 2 && sourceProfile && viewerProfile && rawPaths[0]) {
      const best = rawPaths[0];
      const connectorProfile = profileById.get(best.connector_id);
      path = [
        {
          id: sourceProfile.id,
          name: sourceProfile.name,
          avatar_url: sourceProfile.avatar_url,
          edge: null,
        },
        {
          id: connectorProfile?.id ?? best.connector_id,
          name: connectorProfile?.name ?? "Connection",
          avatar_url: connectorProfile?.avatar_url ?? null,
          edge: Math.round(best.link_a),
        },
        {
          id: viewerProfile.id,
          name: viewerProfile.name,
          avatar_url: viewerProfile.avatar_url,
          edge: Math.round(best.link_b),
        },
      ];
    }

    // Deduplicate connectors for mutualConnections + connectorPaths.
    const seen = new Set<string>();
    const mutualConnections: TrustPathUser[] = [];
    const pathsByConnector = new Map<string, ConnectorPathSummary>();
    for (const p of rawPaths) {
      const prof = profileById.get(p.connector_id);
      if (!prof) continue;
      if (!seen.has(p.connector_id)) {
        seen.add(p.connector_id);
        mutualConnections.push({
          id: prof.id,
          name: prof.name,
          avatar_url: prof.avatar_url,
          edge: null,
        });
      }
      const existing = pathsByConnector.get(p.connector_id);
      if (!existing || p.path_strength > existing.strength) {
        pathsByConnector.set(p.connector_id, {
          id: prof.id,
          name: prof.name,
          avatar_url: prof.avatar_url,
          strength: p.path_strength,
          viewer_knows: true,
        });
      }
    }
    const connectorPaths = [...pathsByConnector.values()].sort(
      (a, b) => b.strength - a.strength
    );

    out[sourceId] = {
      score,
      degree,
      hasDirectVouch,
      path,
      mutualConnections,
      connectionCount: mutualConnections.length,
      connectorPaths,
    };
  }

  for (const id of sourceIds) {
    if (!out[id]) out[id] = EMPTY;
  }

  // Multi-hop upgrade pass: any source still at degree=null gets
  // checked for a 3-hop or 4-hop chain to the viewer. Score stays 0;
  // the degree + hydrated chain feeds the "3rd°"/"4th°" rendering
  // and the trust-detail popover.
  let unresolved = unique.filter((id) => out[id]?.degree == null);
  const multiHopChains = new Map<string, { chain: string[]; degree: 3 | 4 }>();
  if (unresolved.length > 0) {
    const reach3 = await findNDegreeReach(
      supabase,
      viewerId,
      unresolved,
      "incoming",
      3
    );
    for (const [id, chain] of reach3) {
      multiHopChains.set(id, { chain, degree: 3 });
    }
    unresolved = unresolved.filter((id) => !reach3.has(id));
  }
  if (unresolved.length > 0) {
    const reach4 = await findNDegreeReach(
      supabase,
      viewerId,
      unresolved,
      "incoming",
      4
    );
    for (const [id, chain] of reach4) {
      multiHopChains.set(id, { chain, degree: 4 });
    }
  }
  if (multiHopChains.size > 0) {
    await applyMultiHopChains(supabase, out, multiHopChains, "incoming");
  }

  return out;
}

/**
 * Identify which candidate users reach `anchorId` in exactly N
 * edges (3 or 4) — `candidate → ... → anchor`. Used as a
 * post-processing pass over the 1°/2° engine to upgrade
 * `degree: null` results into `degree: N` when a multi-hop chain
 * exists. No score is computed; the spec calls for a bare ordinal
 * label beyond 2°.
 *
 * `direction = "incoming"` walks backward (who-reaches-anchor via
 * chains ending in vouches-for-anchor); `direction = "outgoing"`
 * walks forward (who-does-anchor-reach via chains starting with
 * anchor-vouched-for-X).
 *
 * The alpha graph is tiny (<500 edges), so this is an in-memory BFS
 * over a small number of vouches queries rather than a recursive RPC.
 *
 * Returns the set of candidate ids reachable in *exactly* `depth`
 * edges (never in fewer) — the caller layers these on top of the
 * existing 1°/2° results.
 */
async function findNDegreeReach(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  anchorId: string,
  candidateIds: string[],
  direction: "incoming" | "outgoing",
  depth: 3 | 4
): Promise<Map<string, string[]>> {
  // Returns a Map<candidateId, chain>. For "incoming" the chain is
  // ordered [candidate, ..., anchor]; for "outgoing" it's
  // [anchor, ..., candidate] — always matching the TrustResult.path
  // convention (start=acting user, end=other party).
  const reach = new Map<string, string[]>();
  if (candidateIds.length === 0) return reach;

  const l1Col = direction === "incoming" ? "voucher_id" : "vouchee_id";
  const l1MatchCol = direction === "incoming" ? "vouchee_id" : "voucher_id";

  // BFS outward from the anchor, recording each node's predecessor
  // in the direction the walk travels. At the final hop we walk the
  // parent map backward to reconstruct the chain.
  const parent = new Map<string, string>();
  const visited = new Set<string>([anchorId]);
  let frontier = new Set<string>([anchorId]);

  for (let i = 1; i < depth; i++) {
    if (frontier.size === 0) return reach;
    const { data: rows } = await supabase
      .from("vouches")
      .select(`${l1Col}, ${l1MatchCol}`)
      .in(l1MatchCol, [...frontier]);
    const next = new Set<string>();
    for (const r of rows ?? []) {
      const row = r as Record<string, string>;
      const n = row[l1Col];
      const prev = row[l1MatchCol];
      if (!n || visited.has(n)) continue;
      visited.add(n);
      parent.set(n, prev);
      next.add(n);
    }
    frontier = next;
  }

  if (frontier.size === 0) return reach;

  // Final hop: candidates adjacent to the frontier. A candidate that
  // also appears closer than `depth` hops is ignored (it was already
  // visited).
  const { data: finalRows } = await supabase
    .from("vouches")
    .select(`${l1Col}, ${l1MatchCol}`)
    .in(l1MatchCol, [...frontier])
    .in(l1Col, candidateIds);
  for (const r of finalRows ?? []) {
    const row = r as Record<string, string>;
    const candidate = row[l1Col];
    const frontierNode = row[l1MatchCol];
    if (!candidate || visited.has(candidate)) continue;
    if (reach.has(candidate)) continue; // first path wins

    // Walk back: candidate → frontierNode → parent(frontierNode) → ... → anchor.
    const back: string[] = [candidate];
    let cur: string | undefined = frontierNode;
    for (let hop = 0; hop < depth && cur; hop++) {
      back.push(cur);
      if (cur === anchorId) break;
      cur = parent.get(cur);
    }
    const chain = direction === "incoming" ? back : [...back].reverse();
    reach.set(candidate, chain);
  }
  return reach;
}

/**
 * Dampening factors for multi-hop composite scores. Applied to the
 * mean of the hop strengths so the score scales with the overall
 * quality of the chain rather than punishing a single weak link.
 * 3° uses 0.66 (modest dampening); 4° uses 0.50 (heavier dampening
 * since an extra hop genuinely dilutes the trust signal). Values
 * locked with Loren 2026-04-20. See PROJECT_PLAN.md §Trust Mechanics.
 */
const THREE_DEGREE_DAMPEN = 0.66;
const FOUR_DEGREE_DAMPEN = 0.5;

/**
 * Hydrate the chains from findNDegreeReach into full TrustResult
 * entries: fetch each intermediary's name/avatar, populate `path`
 * (head=candidate, tail=anchor for incoming; reversed for outgoing
 * per TrustResult convention), and seed `connectorPaths` with each
 * hop's strength so the TrustTag can render mustard-tinted dots
 * representing the per-link trust. For 3° chains we also compute a
 * dampened numeric score (min-link × 0.6); 4° stays score-less.
 */
async function applyMultiHopChains(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  out: TrustResultsByTarget,
  chains: Map<string, { chain: string[]; degree: 3 | 4 }>,
  direction: "incoming" | "outgoing"
): Promise<void> {
  const userIds = new Set<string>();
  for (const { chain } of chains.values()) {
    for (const id of chain) userIds.add(id);
  }
  if (userIds.size === 0) return;

  const { data: profiles } = await supabase
    .from("users")
    .select("id, name, avatar_url, vouch_power")
    .in("id", [...userIds]);
  const byId = new Map<
    string,
    { id: string; name: string; avatar_url: string | null; vouch_power: number | null }
  >(
    ((profiles || []) as Array<{
      id: string;
      name: string;
      avatar_url: string | null;
      vouch_power: number | null;
    }>).map((u) => [u.id, u])
  );

  // Bulk-fetch every vouch between any two nodes that appear in any
  // chain. One query (vs. per-edge) is cheap at alpha scale and
  // avoids round-trip blowup for viewers with lots of 3°/4° reach.
  const allNodeIds = [...userIds];
  const { data: edgeRows } =
    allNodeIds.length > 0
      ? await supabase
          .from("vouches")
          .select("voucher_id, vouchee_id, vouch_type, years_known_bucket, vouch_score")
          .in("voucher_id", allNodeIds)
          .in("vouchee_id", allNodeIds)
      : { data: [] };
  type EdgeRow = {
    voucher_id: string;
    vouchee_id: string;
    vouch_type: "standard" | "inner_circle";
    years_known_bucket: string;
    vouch_score: number | null;
  };
  const edgeByPair = new Map<string, EdgeRow>();
  for (const e of (edgeRows || []) as EdgeRow[]) {
    edgeByPair.set(`${e.voucher_id}:${e.vouchee_id}`, e);
  }
  const edgeStrengthBetween = (fromId: string, toId: string): number => {
    // Prefer the directional vouch (from → to); fall back to the
    // reverse if only it exists. Bidirectional seed data often has
    // both; we pick the stronger.
    const fwd = edgeByPair.get(`${fromId}:${toId}`);
    const rev = edgeByPair.get(`${toId}:${fromId}`);
    const candidates: number[] = [];
    if (fwd) {
      const fp = byId.get(fwd.voucher_id)?.vouch_power ?? 4;
      candidates.push(
        fwd.vouch_score ?? edgeStrength(fwd.vouch_type, fwd.years_known_bucket, fp)
      );
    }
    if (rev) {
      const rp = byId.get(rev.voucher_id)?.vouch_power ?? 4;
      candidates.push(
        rev.vouch_score ?? edgeStrength(rev.vouch_type, rev.years_known_bucket, rp)
      );
    }
    return candidates.length > 0 ? Math.max(...candidates) : 0;
  };

  for (const [targetId, { chain, degree }] of chains) {
    const pathUsers: TrustPathUser[] = chain.map((id) => {
      const u = byId.get(id);
      return {
        id,
        name: u?.name ?? "Connection",
        avatar_url: u?.avatar_url ?? null,
        edge: null,
      };
    });

    // The "bridge face" is the intermediary adjacent to the viewer.
    // Incoming: [candidate, ..., viewer] → bridge = chain[-2].
    // Outgoing: [viewer, ..., target]   → bridge = chain[1].
    const chainLen = pathUsers.length;
    const bridgeNode =
      chainLen >= 2
        ? direction === "incoming"
          ? pathUsers[chainLen - 2]
          : pathUsers[1]
        : null;

    // Compute the per-hop strengths so the UI can render one mustard
    // dot per intermediate link. For 3° this is 3 hops; for 4° it's
    // 4. We orient the chain viewer-first regardless of direction
    // so the strengths array reads "link out of viewer first".
    const viewerFirst =
      direction === "incoming" ? [...chain].reverse() : [...chain];
    const hopStrengths: number[] = [];
    for (let i = 0; i < viewerFirst.length - 1; i++) {
      hopStrengths.push(edgeStrengthBetween(viewerFirst[i], viewerFirst[i + 1]));
    }

    let score = 0;
    const mean = (arr: number[]) =>
      arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
    if (degree === 3 && hopStrengths.length === 3) {
      score = Math.max(
        0,
        Math.min(100, Math.round(mean(hopStrengths) * THREE_DEGREE_DAMPEN))
      );
    } else if (degree === 4 && hopStrengths.length === 4) {
      score = Math.max(
        0,
        Math.min(100, Math.round(mean(hopStrengths) * FOUR_DEGREE_DAMPEN))
      );
    }

    // Build connectorPaths so TrustTag can render per-hop dots. Each
    // entry represents one link in the chain. The bridge (first hop
    // out of the viewer) is flagged viewer_knows=true so its avatar
    // is shown; the rest stay anonymous (viewer_knows=false).
    const hopUsersViewerFirst = direction === "incoming"
      ? [...pathUsers].reverse()
      : [...pathUsers];
    const hopConnectors: ConnectorPathSummary[] = hopStrengths.map((s, i) => {
      // The "node" for a hop is the destination of that link
      // (i.e. hopUsersViewerFirst[i+1]).
      const node = hopUsersViewerFirst[i + 1];
      return {
        id: node.id,
        name: node.name,
        avatar_url: node.avatar_url,
        strength: s,
        viewer_knows: i === 0, // first hop out of viewer = bridge
      };
    });

    out[targetId] = {
      ...EMPTY,
      score,
      degree,
      path: pathUsers,
      connectorPaths: bridgeNode
        ? hopConnectors.length > 0
          ? hopConnectors
          : [
              {
                id: bridgeNode.id,
                name: bridgeNode.name,
                avatar_url: bridgeNode.avatar_url,
                strength: 0,
                viewer_knows: true,
              },
            ]
        : [],
    };
  }
}

/** Single-source convenience wrapper for the reverse direction. */
export async function computeIncomingTrustPath(
  sourceId: string,
  viewerId: string
): Promise<TrustResult> {
  const res = await computeIncomingTrustPaths([sourceId], viewerId);
  return res[sourceId] || EMPTY;
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
 * Monotonic emerald ramp capped at Very Strong — 50+ is the top
 * bucket; no separate 75+ tier. "Not connected" (score 0) stays
 * neutral zinc to keep a clear visual distinction between "no
 * connection" and "very weak connection."
 *
 *   0        Not connected          zinc
 *   1–14     Weak                   emerald-100 (softest)
 *   15–29    Modest                 emerald-300
 *   30–49    Strong                 emerald-500
 *   50+      Very strong            emerald-700 (deepest)
 */
export type TrustTierKey =
  | "none"
  | "weak"
  | "modest"
  | "strong"
  | "very_strong";

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
  if (score >= 50) {
    return {
      key: "very_strong",
      label: "Very strong",
      dotClass: "bg-emerald-700",
      ringClass: "ring-emerald-700/40",
      textClass: "text-emerald-800",
      tintClass: "bg-emerald-100 text-emerald-900 ring-emerald-300",
      solidClass: "bg-emerald-700 text-white",
    };
  }
  if (score >= 30) {
    return {
      key: "strong",
      label: "Strong",
      dotClass: "bg-emerald-500",
      ringClass: "ring-emerald-500/40",
      textClass: "text-emerald-600",
      tintClass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      solidClass: "bg-emerald-500 text-white",
    };
  }
  if (score >= 15) {
    return {
      key: "modest",
      label: "Modest",
      dotClass: "bg-emerald-300",
      ringClass: "ring-emerald-300",
      textClass: "text-emerald-500",
      tintClass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      solidClass: "bg-emerald-300 text-emerald-900",
    };
  }
  if (score >= 1) {
    return {
      key: "weak",
      label: "Weak",
      dotClass: "bg-emerald-100",
      ringClass: "ring-emerald-100",
      textClass: "text-emerald-400",
      tintClass: "bg-emerald-50 text-emerald-600 ring-emerald-100",
      solidClass: "bg-emerald-100 text-emerald-800",
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
 * Enumerate every simple path (no repeated nodes) between two users
 * up to `maxDepth` hops, in the viewer→target direction. Each chain
 * is returned with hydrated profile info for every node plus the
 * strength of each consecutive edge.
 *
 * Sort order: composite strength descending (strongest chain first),
 * where composite = sum of hop strengths (longer chains win ties
 * only when the extra hop is meaningful). Returns at most `cap`
 * chains; the caller can surface a "+ N more" row if needed.
 *
 * Shape of a chain: [{id, name, avatar_url}, ...] with a parallel
 * array of link strengths one shorter (one per consecutive pair).
 *
 * Used by the trust-detail popover (ConnectionPopover / MultiHopView)
 * to render one row per path between viewer and host — e.g. if the
 * host is friends with Matt who knows both Jake and Josh, and the
 * viewer knows both Jake and Josh, enumerate both paths.
 */
export interface ChainNode {
  id: string;
  name: string;
  avatar_url: string | null;
}

export interface EnumeratedChain {
  /** Ordered [viewer, ..., target]. */
  nodes: ChainNode[];
  /** Strength per consecutive pair. Length = nodes.length - 1. */
  linkStrengths: number[];
  /** Sum of linkStrengths — used for sort ordering. */
  composite: number;
  /** 1-based hop count (2 = direct + 1 mutual, 3 = 3rd°, etc.). */
  degree: number;
}

export async function findAllChains(
  viewerId: string,
  targetId: string,
  maxDepth = 4,
  cap = 10
): Promise<{ chains: EnumeratedChain[]; truncated: number }> {
  if (!viewerId || !targetId || viewerId === targetId) {
    return { chains: [], truncated: 0 };
  }

  const supabase = getSupabaseAdmin();

  // Pull the entire vouches graph — at alpha scale (<1K users, <5K
  // vouches) this is faster than iteratively expanding frontiers
  // with round-tripped queries. If the graph grows past ~50K edges,
  // swap for a recursive CTE that enumerates paths server-side.
  const { data: vouches } = await supabase
    .from("vouches")
    .select("voucher_id, vouchee_id, vouch_type, years_known_bucket, vouch_score");

  type Edge = {
    voucher_id: string;
    vouchee_id: string;
    vouch_type: "standard" | "inner_circle";
    years_known_bucket: string;
    vouch_score: number | null;
  };
  const allEdges = (vouches || []) as Edge[];
  if (allEdges.length === 0) return { chains: [], truncated: 0 };

  // Adjacency: symmetric — a vouch in either direction makes a
  // "connection" edge. We record the stronger direction's score so
  // the chain's per-link strength reflects the best trust signal
  // available for that pair, regardless of who vouched for whom.
  const nodeIds = new Set<string>();
  const edgeByPair = new Map<string, Edge>();
  for (const e of allEdges) {
    nodeIds.add(e.voucher_id);
    nodeIds.add(e.vouchee_id);
    edgeByPair.set(`${e.voucher_id}:${e.vouchee_id}`, e);
  }
  nodeIds.add(viewerId);
  nodeIds.add(targetId);

  // Hydrate vouch_power for every node we might score through.
  const { data: userRows } = await supabase
    .from("users")
    .select("id, name, avatar_url, vouch_power")
    .in("id", [...nodeIds]);
  type UserRow = {
    id: string;
    name: string;
    avatar_url: string | null;
    vouch_power: number | null;
  };
  const userById = new Map<string, UserRow>(
    ((userRows || []) as UserRow[]).map((u) => [u.id, u])
  );

  const strengthBetween = (aId: string, bId: string): number => {
    const fwd = edgeByPair.get(`${aId}:${bId}`);
    const rev = edgeByPair.get(`${bId}:${aId}`);
    const pick = (e: Edge): number => {
      const vp = userById.get(e.voucher_id)?.vouch_power ?? 4;
      return e.vouch_score ?? edgeStrength(e.vouch_type, e.years_known_bucket, vp);
    };
    const vals: number[] = [];
    if (fwd) vals.push(pick(fwd));
    if (rev) vals.push(pick(rev));
    return vals.length > 0 ? Math.max(...vals) : 0;
  };

  // Undirected adjacency list.
  const adj = new Map<string, Set<string>>();
  for (const e of allEdges) {
    if (!adj.has(e.voucher_id)) adj.set(e.voucher_id, new Set());
    if (!adj.has(e.vouchee_id)) adj.set(e.vouchee_id, new Set());
    adj.get(e.voucher_id)!.add(e.vouchee_id);
    adj.get(e.vouchee_id)!.add(e.voucher_id);
  }

  // DFS enumerate all simple paths from viewer → target within
  // maxDepth. We cap enumeration defensively at 200 raw paths to
  // prevent pathological fan-out; cap + 1 is what we keep after
  // sorting and slicing.
  const RAW_CAP = 200;
  const rawPaths: string[][] = [];
  const stack: Array<{ node: string; path: string[]; visited: Set<string> }> = [
    { node: viewerId, path: [viewerId], visited: new Set([viewerId]) },
  ];
  while (stack.length > 0 && rawPaths.length < RAW_CAP) {
    const frame = stack.pop()!;
    if (frame.node === targetId && frame.path.length > 1) {
      rawPaths.push(frame.path);
      continue;
    }
    if (frame.path.length - 1 >= maxDepth) continue;
    const neighbors = adj.get(frame.node);
    if (!neighbors) continue;
    for (const n of neighbors) {
      if (frame.visited.has(n)) continue;
      stack.push({
        node: n,
        path: [...frame.path, n],
        visited: new Set([...frame.visited, n]),
      });
    }
  }

  // Score and hydrate each path.
  const enumerated: EnumeratedChain[] = rawPaths.map((ids) => {
    const nodes: ChainNode[] = ids.map((id) => {
      const u = userById.get(id);
      return {
        id,
        name: u?.name ?? "Connection",
        avatar_url: u?.avatar_url ?? null,
      };
    });
    const linkStrengths: number[] = [];
    for (let i = 0; i < ids.length - 1; i++) {
      linkStrengths.push(strengthBetween(ids[i], ids[i + 1]));
    }
    const composite = linkStrengths.reduce((s, v) => s + v, 0);
    return {
      nodes,
      linkStrengths,
      composite,
      degree: ids.length - 1,
    };
  });

  // Sort strongest-first, then shortest-first on ties so the best
  // representative path floats to the top.
  enumerated.sort((a, b) => {
    if (b.composite !== a.composite) return b.composite - a.composite;
    return a.degree - b.degree;
  });

  const chains = enumerated.slice(0, cap);
  const truncated = Math.max(0, enumerated.length - cap);
  return { chains, truncated };
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
