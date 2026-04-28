/**
 * Batch 1° Vouch Score computation — multiple targets in 1-2 queries.
 * Server-side only. MUST NOT be N+1.
 *
 * Uses the get_trust_data_for_viewer RPC which returns all path data
 * for all targets in a single query. Applies harmonic dampening
 * (see compute-score.ts header for formula details).
 */

import { getSupabaseAdmin } from "../supabase";
import type { OneDegreeResult, TrustPath } from "./types";
import { fallbackQuery, hydrateConnectors } from "./compute-score";

const EMPTY_RESULT: OneDegreeResult = {
  score: 0,
  paths: [],
  connection_count: 0,
};

/**
 * Compute 1° vouch scores from viewer to multiple targets.
 * Single optimized query — NOT N+1.
 *
 * Returns a Map keyed by targetId.
 */
export async function compute1DegreeScores(
  viewerId: string,
  targetIds: string[]
): Promise<Map<string, OneDegreeResult>> {
  const results = new Map<string, OneDegreeResult>();

  if (!viewerId || targetIds.length === 0) return results;

  // Dedupe and remove self
  const unique = [...new Set(targetIds)].filter(
    (id) => id && id !== viewerId
  );
  if (unique.length === 0) {
    for (const id of targetIds) results.set(id, EMPTY_RESULT);
    return results;
  }

  const supabase = getSupabaseAdmin();

  // Single RPC call for all targets
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
      p_target_ids: unique,
    });
    if (error) throw error;
    rows = (data || []) as RpcRow[];
  } catch {
    // Fallback: 2-3 queries instead of 1
    rows = await fallbackQuery(supabase, viewerId, unique);
  }

  // Group rows by target
  const rowsByTarget = new Map<string, RpcRow[]>();
  for (const row of rows) {
    const arr = rowsByTarget.get(row.target_id) || [];
    arr.push(row);
    rowsByTarget.set(row.target_id, arr);
  }

  // Assemble results for each target
  for (const targetId of unique) {
    const targetRows = rowsByTarget.get(targetId) || [];
    if (targetRows.length === 0) {
      results.set(targetId, EMPTY_RESULT);
      continue;
    }

    // Compute path strengths
    const rawPaths = targetRows.map((r) => {
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

    // Sort descending for harmonic dampening
    rawPaths.sort((a, b) => b.path_strength - a.path_strength);

    // Apply harmonic weights: rank 1 = 1.0, rank 2 = 0.5, rank 3 = 0.333, ...
    const paths: TrustPath[] = rawPaths.map((p, i) => {
      const rank = i + 1;
      const weight = 1 / rank;
      const weighted_score = p.path_strength * weight;
      return { ...p, rank, weight, weighted_score };
    });

    const score = paths.reduce((sum, p) => sum + p.weighted_score, 0);

    results.set(targetId, {
      score: Math.round(score * 100) / 100,
      paths,
      connection_count: paths.length,
    });
  }

  // Fill in self / missing targets
  for (const id of targetIds) {
    if (!results.has(id)) results.set(id, EMPTY_RESULT);
  }

  // Hydrate connector profiles in a single batched query
  const allPaths = [...results.values()].flatMap((r) => r.paths);
  if (allPaths.length > 0) {
    await hydrateConnectors(supabase, allPaths);
  }

  return results;
}
