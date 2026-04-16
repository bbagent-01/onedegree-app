/**
 * 1° Score computation — single target.
 * Server-side only.
 *
 * Algorithm:
 * 1. Find all mutual connectors (vouched by both viewer and target)
 * 2. For each: path_strength = avg(viewer_vouch_score_for_connector,
 *    connector_vouch_score_for_target × connector_vouch_power)
 * 3. 1degree_score = Σ path_strengths
 */

import { getSupabaseAdmin } from "../supabase";
import type { OneDegreeResult, TrustPath } from "./types";

const EMPTY_RESULT: OneDegreeResult = {
  score: 0,
  paths: [],
  connection_count: 0,
};

/**
 * Compute the 1° trust score from viewer to a single target.
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

  return assembleResult(rows.filter((r) => r.target_id === targetId));
}

/**
 * Assemble a OneDegreeResult from raw path rows for a single target.
 */
function assembleResult(rows: Array<{
  connector_id: string;
  viewer_vouch_score: number;
  connector_vouch_score: number;
  connector_vouch_power: number;
}>): OneDegreeResult {
  if (rows.length === 0) return EMPTY_RESULT;

  const paths: TrustPath[] = rows.map((r) => {
    const link_b = r.connector_vouch_score * r.connector_vouch_power;
    const path_strength = (r.viewer_vouch_score + link_b) / 2;
    return {
      connector_id: r.connector_id,
      viewer_vouch_score: r.viewer_vouch_score,
      connector_vouch_score: r.connector_vouch_score,
      connector_vouch_power: r.connector_vouch_power,
      path_strength,
    };
  });

  const score = paths.reduce((sum, p) => sum + p.path_strength, 0);

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

export { assembleResult, fallbackQuery };
