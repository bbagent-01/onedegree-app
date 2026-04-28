/**
 * Degrees-of-separation computation.
 * Server-side only.
 *
 * BFS traversal over the vouches graph to find minimum hop count
 * between two users. A "hop" = a vouch in EITHER direction
 * (A→B or B→A counts as connected).
 *
 * Performance note: At >5K users, consider materialized views or
 * Neo4j migration for graph traversal.
 */

import { getSupabaseAdmin } from "../supabase";
import type { DegreesResult, BatchDegreesResult } from "./types";

/** Max hops to search — beyond 4 is meaningless for trust */
const MAX_DEGREES = 4;

/**
 * Compute degrees of separation between viewer and a single target.
 *
 * Returns { degrees: 0 } for self, { degrees: 1 } for direct vouch,
 * { degrees: null } if no path within MAX_DEGREES hops.
 */
export async function computeDegreesOfSeparation(
  viewerId: string,
  targetId: string
): Promise<DegreesResult> {
  if (!viewerId || !targetId) return { degrees: null };
  if (viewerId === targetId) return { degrees: 0 };

  const results = await computeDegreesOfSeparationBatch(viewerId, [targetId]);
  const match = results.find((r) => r.target_id === targetId);
  return { degrees: match?.degrees ?? null };
}

/**
 * Compute degrees of separation from viewer to multiple targets
 * in a SINGLE recursive CTE query.
 *
 * Uses Postgres WITH RECURSIVE over the vouches graph, treating
 * each vouch as a bidirectional edge. Capped at MAX_DEGREES hops.
 *
 * Returns Array<{ target_id, degrees }> — degrees is null if
 * no path exists within the cap.
 */
export async function computeDegreesOfSeparationBatch(
  viewerId: string,
  targetIds: string[]
): Promise<BatchDegreesResult[]> {
  if (!viewerId || targetIds.length === 0) return [];

  const unique = [...new Set(targetIds)].filter((id) => id && id !== viewerId);

  // Handle self immediately
  const results: BatchDegreesResult[] = [];
  for (const id of targetIds) {
    if (id === viewerId) {
      results.push({ target_id: id, degrees: 0 });
    }
  }

  if (unique.length === 0) return results;

  const supabase = getSupabaseAdmin();

  // Try the batch RPC first (migration 015)
  try {
    const { data, error } = await supabase.rpc(
      "get_degrees_of_separation_batch",
      {
        p_viewer_id: viewerId,
        p_target_ids: unique,
      }
    );
    if (error) throw error;

    const rpcResults = (data || []) as Array<{
      target_id: string;
      degrees: number | null;
    }>;

    const degreesByTarget = new Map(
      rpcResults.map((r) => [r.target_id, r.degrees])
    );

    for (const id of unique) {
      results.push({
        target_id: id,
        degrees: degreesByTarget.get(id) ?? null,
      });
    }

    return results;
  } catch {
    // Fallback: JS-side BFS
    return fallbackBFS(supabase, viewerId, targetIds);
  }
}

/**
 * JS-side BFS fallback if the RPC isn't deployed yet.
 * Loads the vouch graph edges and runs BFS in memory.
 * Only practical at alpha scale (<500 users).
 */
async function fallbackBFS(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  viewerId: string,
  targetIds: string[]
): Promise<BatchDegreesResult[]> {
  // Load all vouch edges (bidirectional)
  const { data: vouches } = await supabase
    .from("vouches")
    .select("voucher_id, vouchee_id");

  if (!vouches || vouches.length === 0) {
    return targetIds.map((id) => ({
      target_id: id,
      degrees: id === viewerId ? 0 : null,
    }));
  }

  // Build adjacency list (bidirectional)
  const adj = new Map<string, Set<string>>();
  for (const v of vouches as Array<{
    voucher_id: string;
    vouchee_id: string;
  }>) {
    if (!adj.has(v.voucher_id)) adj.set(v.voucher_id, new Set());
    if (!adj.has(v.vouchee_id)) adj.set(v.vouchee_id, new Set());
    adj.get(v.voucher_id)!.add(v.vouchee_id);
    adj.get(v.vouchee_id)!.add(v.voucher_id);
  }

  // BFS from viewer
  const targetSet = new Set(targetIds.filter((id) => id !== viewerId));
  const visited = new Set<string>([viewerId]);
  let frontier = [viewerId];
  let depth = 0;
  const found = new Map<string, number>();

  // Self
  if (targetSet.has(viewerId)) {
    found.set(viewerId, 0);
    targetSet.delete(viewerId);
  }

  while (frontier.length > 0 && depth < MAX_DEGREES && targetSet.size > 0) {
    depth++;
    const nextFrontier: string[] = [];

    for (const node of frontier) {
      const neighbors = adj.get(node);
      if (!neighbors) continue;

      for (const neighbor of neighbors) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        nextFrontier.push(neighbor);

        if (targetSet.has(neighbor)) {
          found.set(neighbor, depth);
          targetSet.delete(neighbor);
        }
      }
    }

    frontier = nextFrontier;
  }

  return targetIds.map((id) => ({
    target_id: id,
    degrees: id === viewerId ? 0 : (found.get(id) ?? null),
  }));
}
