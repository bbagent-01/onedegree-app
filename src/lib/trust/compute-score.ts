/**
 * 1° Vouch Score computation — single target.
 * Server-side only.
 *
 * HARMONIC DAMPENING FORMULA
 * --------------------------
 * One strong connection should outweigh many weak ones. To prevent
 * quantity from inflating scores, we apply harmonic dampening:
 *
 * 1. Find all mutual connectors (vouched by both viewer and target).
 * 2. For each connector:
 *    - link_a = viewer's vouch score for the connector
 *    - link_b = connector's vouch score for target × connector's vouch power
 *    - path_strength = avg(link_a, link_b)
 * 3. Sort paths descending by path_strength (strongest first).
 * 4. Apply harmonic weights: rank 1 = 1.0, rank 2 = 0.5, rank 3 = 0.333, etc.
 * 5. 1° vouch score = Σ (path_strength × (1/rank))
 *
 * Example: paths [40, 18, 12] → 40×1 + 18×0.5 + 12×0.333 = 40 + 9 + 4 = 53
 *
 * // FUTURE (post-alpha): Multi-degree scoring
 * // Currently only 1° paths count (direct vouch or through 1 connector = 2 degrees separation).
 * // For 2°+ paths, apply additional dampening per hop: path_strength × 0.5^(degrees - 2).
 * // Then combine 1° paths and dampened 2°+ paths into same harmonic sum, sorted descending.
 */

import { getSupabaseAdmin } from "../supabase";
import type { OneDegreeResult, TrustPath, HydratedConnector } from "./types";

const EMPTY_RESULT: OneDegreeResult = {
  score: 0,
  paths: [],
  connection_count: 0,
};

/**
 * Compute the 1° vouch score from viewer to a single target.
 * Uses the get_trust_data_for_viewer RPC for a single DB round-trip,
 * with a JS fallback if the RPC isn't deployed yet.
 */
export async function compute1DegreeScore(
  viewerId: string,
  targetId: string
): Promise<OneDegreeResult> {
  if (!viewerId || !targetId || viewerId === targetId) {
    return EMPTY_RESULT;
  }

  const supabase = getSupabaseAdmin();

  // Try the RPC first
  type RpcRow = {
    target_id: string;
    connector_id: string;
    viewer_vouch_score: number;
    connector_vouch_score: number;
    connector_vouch_power: number;
  };

  let rows: RpcRow[] = [];
  try {
    const { data, error } = await supabase.rpc("get_trust_data_for_viewer", {
      p_viewer_id: viewerId,
      p_target_ids: [targetId],
    });
    if (error) throw error;
    rows = (data || []) as RpcRow[];
  } catch {
    // Fallback: manual query
    rows = await fallbackQuery(supabase, viewerId, [targetId]);
  }

  const result = assembleResult(rows.filter((r) => r.target_id === targetId));

  // Hydrate connector profiles
  if (result.paths.length > 0) {
    await hydrateConnectors(supabase, result.paths);
  }

  return result;
}

/**
 * Assemble a OneDegreeResult from raw path rows for a single target.
 * Applies harmonic dampening: sort paths descending, weight = 1/rank.
 */
function assembleResult(rows: Array<{
  connector_id: string;
  viewer_vouch_score: number;
  connector_vouch_score: number;
  connector_vouch_power: number;
}>): OneDegreeResult {
  if (rows.length === 0) return EMPTY_RESULT;

  // Compute path strengths
  const rawPaths = rows.map((r) => {
    const link_a = r.viewer_vouch_score;
    const link_b = r.connector_vouch_score * r.connector_vouch_power;
    const path_strength = (link_a + link_b) / 2;
    return {
      connector_id: r.connector_id,
      viewer_vouch_score: r.viewer_vouch_score,
      connector_vouch_score: r.connector_vouch_score,
      connector_vouch_power: r.connector_vouch_power,
      link_a,
      link_b,
      path_strength,
    };
  });

  // Sort descending by path_strength for harmonic dampening
  rawPaths.sort((a, b) => b.path_strength - a.path_strength);

  // Apply harmonic weights: rank 1 = 1.0, rank 2 = 0.5, rank 3 = 0.333, ...
  const paths: TrustPath[] = rawPaths.map((p, i) => {
    const rank = i + 1;
    const weight = 1 / rank;
    const weighted_score = p.path_strength * weight;
    return { ...p, rank, weight, weighted_score };
  });

  const score = paths.reduce((sum, p) => sum + p.weighted_score, 0);

  return {
    score: Math.round(score * 100) / 100, // 2 decimal places
    paths,
    connection_count: paths.length,
  };
}

/**
 * JS fallback if the get_trust_data_for_viewer RPC isn't deployed.
 * Mirrors the RPC with two queries.
 */
async function fallbackQuery(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  viewerId: string,
  targetIds: string[]
): Promise<Array<{
  target_id: string;
  connector_id: string;
  viewer_vouch_score: number;
  connector_vouch_score: number;
  connector_vouch_power: number;
}>> {
  // Get all vouches FROM viewer (viewer → connector)
  const { data: viewerVouches } = await supabase
    .from("vouches")
    .select("vouchee_id, vouch_score")
    .eq("voucher_id", viewerId);

  if (!viewerVouches || viewerVouches.length === 0) return [];

  const connectorIds = viewerVouches.map(
    (v: { vouchee_id: string }) => v.vouchee_id
  );
  const viewerScoreByConnector = new Map(
    viewerVouches.map((v: { vouchee_id: string; vouch_score: number }) => [
      v.vouchee_id,
      v.vouch_score ?? 0,
    ])
  );

  // Get vouches FROM connectors → targets
  const { data: connectorVouches } = await supabase
    .from("vouches")
    .select("voucher_id, vouchee_id, vouch_score")
    .in("voucher_id", connectorIds)
    .in("vouchee_id", targetIds);

  if (!connectorVouches || connectorVouches.length === 0) return [];

  // Get connector vouch_power values
  const uniqueConnectors = [
    ...new Set(
      connectorVouches.map((v: { voucher_id: string }) => v.voucher_id)
    ),
  ];
  const { data: connectorUsers } = await supabase
    .from("users")
    .select("id, vouch_power")
    .in("id", uniqueConnectors);

  const vpByConnector = new Map(
    (connectorUsers || []).map(
      (u: { id: string; vouch_power: number | null }) => [
        u.id,
        u.vouch_power ?? 1.0,
      ]
    )
  );

  return connectorVouches.map(
    (cv: { voucher_id: string; vouchee_id: string; vouch_score: number }) => ({
      target_id: cv.vouchee_id,
      connector_id: cv.voucher_id,
      viewer_vouch_score: viewerScoreByConnector.get(cv.voucher_id) ?? 0,
      connector_vouch_score: cv.vouch_score ?? 0,
      connector_vouch_power: vpByConnector.get(cv.voucher_id) ?? 1.0,
    })
  );
}

/**
 * Hydrate connector profiles in a single batched query.
 * Mutates paths in-place to add connector { id, name, avatar_url }.
 */
async function hydrateConnectors(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  paths: TrustPath[]
): Promise<void> {
  const connectorIds = [...new Set(paths.map((p) => p.connector_id))];
  if (connectorIds.length === 0) return;

  const { data: users } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .in("id", connectorIds);

  if (!users) return;

  const userMap = new Map(
    (users as Array<{ id: string; name: string; avatar_url: string | null }>).map(
      (u) => [u.id, { id: u.id, name: u.name, avatar_url: u.avatar_url }]
    )
  );

  for (const path of paths) {
    const user = userMap.get(path.connector_id);
    if (user) {
      path.connector = user;
    }
  }
}

export { assembleResult, fallbackQuery, hydrateConnectors };
