-- ============================================================
-- Migration 015: Degrees of Separation RPC
-- CC-C1b — BFS/recursive CTE for hop-count computation
-- ============================================================

-- ============================================================
-- 1. RPC: get_degrees_of_separation_batch
--
-- Computes minimum hop count from viewer to each target via
-- a recursive CTE over the vouches graph. Vouches are treated
-- as bidirectional edges (A→B or B→A both count as connected).
-- Capped at 4 hops for performance.
--
-- Performance note: At >5K users, consider materialized views
-- or Neo4j migration for graph traversal.
-- ============================================================

CREATE OR REPLACE FUNCTION get_degrees_of_separation_batch(
  p_viewer_id UUID,
  p_target_ids UUID[]
)
RETURNS TABLE(target_id UUID, degrees INTEGER)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE bfs AS (
    -- Base case: start from the viewer at depth 0
    SELECT
      p_viewer_id AS node_id,
      0 AS depth,
      ARRAY[p_viewer_id] AS visited

    UNION ALL

    -- Recursive step: follow vouch edges in BOTH directions
    SELECT
      neighbor.id AS node_id,
      bfs.depth + 1 AS depth,
      bfs.visited || neighbor.id AS visited
    FROM bfs
    CROSS JOIN LATERAL (
      -- Outgoing vouches: voucher → vouchee
      SELECT v.vouchee_id AS id
      FROM vouches v
      WHERE v.voucher_id = bfs.node_id
        AND NOT (v.vouchee_id = ANY(bfs.visited))

      UNION

      -- Incoming vouches: vouchee ← voucher
      SELECT v.voucher_id AS id
      FROM vouches v
      WHERE v.vouchee_id = bfs.node_id
        AND NOT (v.voucher_id = ANY(bfs.visited))
    ) neighbor
    WHERE bfs.depth < 4  -- Cap at 4 hops
  )
  -- For each target, find the minimum depth
  SELECT
    t.id AS target_id,
    MIN(bfs.depth)::INTEGER AS degrees
  FROM unnest(p_target_ids) AS t(id)
  LEFT JOIN bfs ON bfs.node_id = t.id
  GROUP BY t.id;
END;
$$;

-- ============================================================
-- DONE
-- ============================================================
