-- ============================================================
-- Migration 054: B8 — is_demo_origin flag on vouches
-- Session: feat/b8-demo-auto-vouch
-- Date: 2026-05-01
-- Idempotent: safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE)
-- Depends on: B7 (050_demo_presidents → 053_demo_variety) MUST be
--   applied first. Verify with:
--     SELECT count(*) FROM users WHERE is_test_user = true;  -- expect 12+
-- ============================================================
--
-- B8 introduces a server-initiated auto-vouch on signup: when a new
-- real user is created, 3-4 random demo presidents (B7 seed users
-- where is_test_user = true) auto-vouch FOR the new user so the
-- empty-network cold start is replaced with social-proof training
-- wheels the new user can see on their own profile.
--
-- Every B8 demo-origin vouch is flagged is_demo_origin = true so:
--   - it never feeds real-user-to-real-user trust math
--   - it never appears as a "mutual connection" or vouch path to
--     any other real user browsing the new user's profile
--   - it bypasses the existing test↔real isolation trigger from
--     migration 022 (this is the ONLY legitimate demo→real write;
--     real→demo writes stay blocked exactly as before)
--   - it never increments users.vouch_count_given /
--     vouch_count_received (those columns continue to mean
--     "real-user social proof only")
--   - it shows up on the RECIPIENT'S OWN profile with a clear
--     "Demo connection" pill, but is hidden the moment anyone
--     else views the same profile
--
-- POST-ALPHA CLEANUP — single statement teardown when alpha ends:
--
--   DELETE FROM vouches WHERE is_demo_origin = true;
--
-- Because the counter trigger below skips is_demo_origin rows on
-- both INSERT and DELETE, users.vouch_count_* columns require no
-- backfill after that DELETE; they have always reflected only the
-- real subgraph.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Column + index
-- ------------------------------------------------------------
ALTER TABLE vouches
  ADD COLUMN IF NOT EXISTS is_demo_origin BOOLEAN NOT NULL DEFAULT false;

-- Most read paths now filter "WHERE is_demo_origin = false" — a
-- regular b-tree index gives the planner a cheap branch and stays
-- useful for the rare "WHERE is_demo_origin = true" queries used
-- by the cleanup statement above and the self-view section.
CREATE INDEX IF NOT EXISTS idx_vouches_is_demo_origin
  ON vouches(is_demo_origin);

-- ------------------------------------------------------------
-- 2. Loosen the test↔real isolation trigger for demo-origin rows
--
-- Migration 022 forbids any vouch where exactly one of the two
-- parties is a test user. B8's auto-vouch routine intentionally
-- writes voucher_id=demo_president, vouchee_id=real_user — so we
-- short-circuit the check when the row is flagged is_demo_origin.
-- The opposite direction (real→demo, no flag) is unchanged: it
-- still raises and the A2 demo write block stays in force.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_isolation_vouches() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_demo_origin = true THEN
    RETURN NEW;
  END IF;
  PERFORM check_test_real_isolation(NEW.voucher_id, NEW.vouchee_id, 'vouches');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 3. Counter trigger: do NOT increment counts for demo-origin
--
-- vouch_count_given / vouch_count_received feed the profile
-- "Vouches given · received" stat, the dashboard onboarding nudge,
-- the IntroRequestCard display, and several listing-access checks.
-- Demo-origin rows must not move these numbers — otherwise a brand
-- new user shows "received: 4" with no real social proof behind
-- it. Skipping the increment on INSERT and the decrement on DELETE
-- keeps the counters always-real-only without a backfill step.
-- vouch_score itself is still computed (the row stores the value
-- so the self-view "Demo connection" list can render the strength
-- pill) — the read paths in §4–§7 are what actually exclude it
-- from real trust math.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION compute_vouch_score_and_counts()
RETURNS TRIGGER AS $$
DECLARE
  v_base NUMERIC;
  v_mult NUMERIC;
BEGIN
  v_base := CASE NEW.vouch_type
    WHEN 'inner_circle' THEN 25.0
    ELSE 15.0
  END;

  v_mult := CASE NEW.years_known_bucket
    WHEN 'platform_met' THEN 0.4
    WHEN 'lt1'      THEN 0.6
    WHEN 'lt1yr'    THEN 0.6
    WHEN '1to3'     THEN 1.0
    WHEN '1to3yr'   THEN 1.0
    WHEN '3to5'     THEN 1.2
    WHEN '4to7yr'   THEN 1.2
    WHEN '5to10'    THEN 1.5
    WHEN '8to15yr'  THEN 1.5
    WHEN '10plus'   THEN 1.8
    WHEN '15plusyr' THEN 1.8
    ELSE 1.0
  END;

  NEW.vouch_score := v_base * v_mult;
  NEW.updated_at := now();

  IF TG_OP = 'INSERT' AND NEW.is_demo_origin = false THEN
    UPDATE users SET vouch_count_given = vouch_count_given + 1
    WHERE id = NEW.voucher_id;
    UPDATE users SET vouch_count_received = vouch_count_received + 1
    WHERE id = NEW.vouchee_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BEFORE-DELETE counter mirror: keep counts accurate when a
-- non-demo row is removed. Demo-origin deletions are intentionally
-- ignored so the post-alpha cleanup DELETE can run as a single
-- statement without recomputing counts.
CREATE OR REPLACE FUNCTION decrement_vouch_counts_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_demo_origin = false THEN
    UPDATE users
      SET vouch_count_given = GREATEST(vouch_count_given - 1, 0)
      WHERE id = OLD.voucher_id;
    UPDATE users
      SET vouch_count_received = GREATEST(vouch_count_received - 1, 0)
      WHERE id = OLD.vouchee_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_decrement_vouch_counts ON vouches;
CREATE TRIGGER trg_decrement_vouch_counts
  AFTER DELETE ON vouches
  FOR EACH ROW
  EXECUTE FUNCTION decrement_vouch_counts_on_delete();

-- ------------------------------------------------------------
-- 4. RPC: calculate_one_degree_scores — filter is_demo_origin
--
-- The 1°+2° batch trust scorer joins vouches twice (viewer→connector
-- and connector→target). Both joins must drop demo-origin rows so
-- the score the badge / listing / popover reads back is the real
-- social-proof number, not training wheels.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_one_degree_scores(
  p_viewer_id UUID,
  p_target_ids UUID[]
)
RETURNS TABLE(target_id UUID, score INTEGER, connection_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_target UUID;
BEGIN
  FOREACH v_target IN ARRAY p_target_ids LOOP
    IF v_target = p_viewer_id THEN
      CONTINUE;
    END IF;

    RETURN QUERY
    SELECT
      v_target AS target_id,
      COALESCE(ROUND(SUM(path_strength))::INTEGER, 0) AS score,
      COUNT(*)::INTEGER AS connection_count
    FROM (
      SELECT
        (
          (CASE v_vc.vouch_type
            WHEN 'inner_circle' THEN 25.0
            ELSE 15.0
          END *
          CASE v_vc.years_known_bucket
            WHEN 'lt1yr'    THEN 0.6
            WHEN '1to3yr'   THEN 0.8
            WHEN '4to7yr'   THEN 1.0
            WHEN '8to15yr'  THEN 1.4
            WHEN '15plusyr' THEN 1.8
            ELSE 1.0
          END)
          +
          (CASE v_ct.vouch_type
            WHEN 'inner_circle' THEN 25.0
            ELSE 15.0
          END *
          CASE v_ct.years_known_bucket
            WHEN 'lt1yr'    THEN 0.6
            WHEN '1to3yr'   THEN 0.8
            WHEN '4to7yr'   THEN 1.0
            WHEN '8to15yr'  THEN 1.4
            WHEN '15plusyr' THEN 1.8
            ELSE 1.0
          END
          * COALESCE(u_conn.vouch_power, 4.0) / 4.0)
        ) / 2.0 AS path_strength
      FROM vouches v_vc
      JOIN vouches v_ct ON v_ct.voucher_id = v_vc.vouchee_id
      JOIN users u_conn ON u_conn.id = v_vc.vouchee_id
      WHERE v_vc.voucher_id = p_viewer_id
        AND v_ct.vouchee_id = v_target
        AND v_vc.vouchee_id != p_viewer_id
        AND v_vc.vouchee_id != v_target
        AND v_vc.is_demo_origin = false
        AND v_ct.is_demo_origin = false
    ) paths;
  END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- 5. RPC: get_trust_data_for_viewer — filter is_demo_origin
--
-- Backs compute1DegreeScore / compute1DegreeScoreIncoming. Same
-- shape as the function above but per-path rows for the trust
-- popover. Both vouch joins drop demo-origin rows.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_trust_data_for_viewer(
  p_viewer_id UUID,
  p_target_ids UUID[]
)
RETURNS TABLE(
  target_id UUID,
  connector_id UUID,
  viewer_vouch_score NUMERIC,
  connector_vouch_score NUMERIC,
  connector_vouch_power NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    v_ct.vouchee_id AS target_id,
    v_vc.vouchee_id AS connector_id,
    v_vc.vouch_score AS viewer_vouch_score,
    v_ct.vouch_score AS connector_vouch_score,
    COALESCE(u_conn.vouch_power, 1.0) AS connector_vouch_power
  FROM vouches v_vc
  JOIN vouches v_ct ON v_ct.voucher_id = v_vc.vouchee_id
  JOIN users u_conn ON u_conn.id = v_vc.vouchee_id
  WHERE v_vc.voucher_id = p_viewer_id
    AND v_ct.vouchee_id = ANY(p_target_ids)
    AND v_vc.vouchee_id != p_viewer_id
    AND v_ct.vouchee_id != p_viewer_id
    AND v_vc.is_demo_origin = false
    AND v_ct.is_demo_origin = false;
$$;

-- ------------------------------------------------------------
-- 6. RPC: get_user_network — filter is_demo_origin
--
-- Powers the dashboard "vouchedFor / vouchedBy" lists in
-- src/lib/network-data.ts. Demo-origin rows are excluded; the
-- self-view "Welcome connections" section in profile/[id]/page.tsx
-- queries the vouches table directly (with is_demo_origin = true)
-- so it does NOT depend on this RPC.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_network(p_user_id UUID)
RETURNS TABLE(
  relationship TEXT,
  user_id UUID,
  user_name TEXT,
  user_avatar TEXT,
  vouch_type vouch_type_enum,
  vouch_score NUMERIC,
  years_known_bucket years_known_bucket_enum,
  created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    'vouched_for'::TEXT AS relationship,
    u.id AS user_id,
    u.name AS user_name,
    u.avatar_url AS user_avatar,
    v.vouch_type,
    v.vouch_score,
    v.years_known_bucket,
    v.created_at
  FROM vouches v
  JOIN users u ON u.id = v.vouchee_id
  WHERE v.voucher_id = p_user_id
    AND v.is_demo_origin = false

  UNION ALL

  SELECT
    'vouched_by'::TEXT AS relationship,
    u.id AS user_id,
    u.name AS user_name,
    u.avatar_url AS user_avatar,
    v.vouch_type,
    v.vouch_score,
    v.years_known_bucket,
    v.created_at
  FROM vouches v
  JOIN users u ON u.id = v.voucher_id
  WHERE v.vouchee_id = p_user_id
    AND v.is_demo_origin = false;
$$;

-- ------------------------------------------------------------
-- 7. RPC: get_degrees_of_separation_batch — filter is_demo_origin
--
-- The bidirectional BFS over the vouches graph for 1°/2°/3°/4°
-- hop counts. A demo-origin edge would let a brand-new user appear
-- as 1° to whichever other real user happened to share a demo
-- president — exactly the cross-real pollution we are preventing.
-- Both legs of the recursive UNION drop demo-origin rows.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_degrees_of_separation_batch(
  p_viewer_id UUID,
  p_target_ids UUID[]
)
RETURNS TABLE(target_id UUID, degrees INTEGER)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE bfs AS (
    SELECT
      p_viewer_id AS node_id,
      0 AS depth,
      ARRAY[p_viewer_id] AS visited

    UNION ALL

    SELECT
      neighbor.id AS node_id,
      bfs.depth + 1 AS depth,
      bfs.visited || neighbor.id AS visited
    FROM bfs
    CROSS JOIN LATERAL (
      SELECT v.vouchee_id AS id
      FROM vouches v
      WHERE v.voucher_id = bfs.node_id
        AND v.is_demo_origin = false
        AND NOT (v.vouchee_id = ANY(bfs.visited))

      UNION

      SELECT v.voucher_id AS id
      FROM vouches v
      WHERE v.vouchee_id = bfs.node_id
        AND v.is_demo_origin = false
        AND NOT (v.voucher_id = ANY(bfs.visited))
    ) neighbor
    WHERE bfs.depth < 4
  )
  SELECT
    t.id AS target_id,
    MIN(bfs.depth)::INTEGER AS degrees
  FROM unnest(p_target_ids) AS t(id)
  LEFT JOIN bfs ON bfs.node_id = t.id
  GROUP BY t.id;
END;
$$;

-- ------------------------------------------------------------
-- 8. Vouch-power RPCs — filter outgoing demo-origin
--
-- vouch_power = avg(vouchee guest rating) clamped. Only the demo
-- presidents have outgoing demo-origin vouches and they have no
-- guest_rating, so the existing JOIN already drops them — but we
-- add the explicit filter so the set we average over is provably
-- the real subgraph and stays correct if a demo user ever does
-- pick up a rating.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION recalculate_vouch_power_for_user(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_avg_rating NUMERIC;
  v_result NUMERIC;
BEGIN
  SELECT AVG(u.guest_rating)
  INTO v_avg_rating
  FROM vouches v
  JOIN users u ON u.id = v.vouchee_id
  WHERE v.voucher_id = p_user_id
    AND v.is_demo_origin = false
    AND u.guest_rating IS NOT NULL;

  IF v_avg_rating IS NULL THEN
    v_result := 1.0;
  ELSE
    v_result := LEAST(1.5, GREATEST(0.5, v_avg_rating / 4.0));
  END IF;

  UPDATE users SET vouch_power = v_result WHERE id = p_user_id;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_vouch_power(p_user_id UUID)
RETURNS DECIMAL(3,2)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result DECIMAL(3,2);
BEGIN
  SELECT AVG(u.guest_rating)
  INTO v_result
  FROM vouches v
  JOIN users u ON u.id = v.vouchee_id
  WHERE v.voucher_id = p_user_id
    AND v.is_demo_origin = false
    AND u.guest_review_count >= 1
    AND u.guest_rating IS NOT NULL;

  UPDATE users SET vouch_power = v_result WHERE id = p_user_id;
  RETURN v_result;
END;
$$;

-- The trigger function `recalculate_vouch_power` (014b) recomputes
-- power for every voucher of NEW.id when a guest_rating changes.
-- Add the same filter so a demo president picking up a (synthetic)
-- rating wouldn't pollute the real side via the trigger.
CREATE OR REPLACE FUNCTION recalculate_vouch_power()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET vouch_power = sub.vp
  FROM (
    SELECT
      v.voucher_id,
      LEAST(1.5, GREATEST(0.5, AVG(u2.guest_rating) / 4.0)) AS vp
    FROM vouches v
    JOIN users u2 ON u2.id = v.vouchee_id
    WHERE v.voucher_id IN (
        SELECT voucher_id FROM vouches
        WHERE vouchee_id = NEW.id
          AND is_demo_origin = false
      )
      AND v.is_demo_origin = false
      AND u2.guest_rating IS NOT NULL
    GROUP BY v.voucher_id
  ) sub
  WHERE users.id = sub.voucher_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- DONE
-- ============================================================
-- Trust-math read paths inside src/ (computeTrustPaths,
-- computeIncomingTrustPaths, findAllChains, computeDegreesOfSeparation
-- fallbacks, vouch-power.ts, v2-compute.ts, listing-data.ts visibility
-- counts, network-data.ts open-link tagging, vouches CRUD recount in
-- /api/vouches DELETE, etc.) ALSO add `.eq("is_demo_origin", false)`
-- so the JS fallback paths and direct queries stay consistent with
-- the RPC paths above. See B8_TRUST_FILTER_AUDIT.md for the full list.
-- ============================================================
