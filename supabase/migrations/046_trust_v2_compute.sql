-- ============================================================
-- 046 — Trust v2 compute layer (Phase 1 schema, additive only)
-- ============================================================
-- Adds the five new user-level columns the Trust v2 spec defines
-- in §08 (vouch_signal, vouch_score, rating_avg, rating_count,
-- last_score_computed_at) plus a trigger that maintains the new
-- combined rating aggregates on stay_confirmations row changes.
--
-- The sixth spec column — `vouch_power` — already exists on users
-- (mig 014b) with type DECIMAL(3,2) and the same semantics
-- (average guest_rating of users this user has vouched for, clamped
-- [0.5, 1.5], default 1.0). Existing in-app reads + the legacy
-- trg_vouch_power trigger keep working unchanged. The Trust v2 cron
-- writes the same column with the same formula and bounds, so the
-- two paths agree. No ALTER on vouch_power → no type change.
--
-- Strictly additive. No drops, no type changes on existing columns.
-- The existing connection_score / 1° score display layer (TrustTag,
-- compute1DegreeScore, etc.) is untouched — see TRACK_B_SCHEMA_CHANGES
-- §S10.7 for the back-compat rationale.
-- ============================================================

-- ── 1. New columns on users ──

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS vouch_signal           NUMERIC(10,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vouch_score            NUMERIC(4,1)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_avg             NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS rating_count           INTEGER       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_score_computed_at TIMESTAMPTZ;

COMMENT ON COLUMN users.vouch_signal IS
  'Trust v2 raw signal (mig 046): Σ vouch_power(j) × log(2 + vouch_signal(j)) over all inbound vouches j→i. Recomputed by /api/cron/recompute-trust-v2 (fixed-point iteration).';
COMMENT ON COLUMN users.vouch_score IS
  'Trust v2 user-level 0–10 score (mig 046): 10 × (1 − e^(−vouch_signal / TRUST_VOUCH_K)) with K=30. Distinct from vouches.vouch_score (per-vouch points). Display layer still reads compute1DegreeScore output as of S10.7 — Alpha 1 will switch to this column.';
COMMENT ON COLUMN users.rating_avg IS
  'Combined avg rating across all stay_confirmations the user is part of: as guest (guest_rating) + as host (host_rating). NULL when no reviews. Maintained by trg_update_user_combined_ratings (mig 046).';
COMMENT ON COLUMN users.rating_count IS
  'Number of star ratings folded into rating_avg. Sum of guest_rating-non-null rows where guest_id=u and host_rating-non-null rows where host_id=u.';
COMMENT ON COLUMN users.last_score_computed_at IS
  'When the recompute cron last touched this user. NULL for users that have never been recomputed.';

-- ── 2. Combined rating trigger ──
-- Maintains users.rating_avg + users.rating_count whenever a
-- stay_confirmations row gains or changes a guest_rating or
-- host_rating. Independent of the legacy trg_update_user_ratings
-- (which keeps users.guest_rating / host_rating split by role) —
-- both run; we don't replace the legacy trigger.

CREATE OR REPLACE FUNCTION recompute_user_combined_rating(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_avg NUMERIC(3,2);
  v_cnt INTEGER;
BEGIN
  SELECT
    AVG(stars)::NUMERIC(3,2),
    COUNT(*)::INTEGER
  INTO v_avg, v_cnt
  FROM (
    SELECT guest_rating::NUMERIC AS stars
      FROM stay_confirmations
     WHERE guest_id = p_user_id AND guest_rating IS NOT NULL
    UNION ALL
    SELECT host_rating::NUMERIC AS stars
      FROM stay_confirmations
     WHERE host_id  = p_user_id AND host_rating  IS NOT NULL
  ) reviews;

  UPDATE users
     SET rating_avg   = v_avg,
         rating_count = COALESCE(v_cnt, 0)
   WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trg_update_user_combined_ratings_fn()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.guest_id IS NOT NULL THEN
      PERFORM recompute_user_combined_rating(OLD.guest_id);
    END IF;
    IF OLD.host_id IS NOT NULL THEN
      PERFORM recompute_user_combined_rating(OLD.host_id);
    END IF;
    RETURN OLD;
  END IF;

  -- INSERT or UPDATE
  IF NEW.guest_id IS NOT NULL THEN
    PERFORM recompute_user_combined_rating(NEW.guest_id);
  END IF;
  IF NEW.host_id IS NOT NULL THEN
    PERFORM recompute_user_combined_rating(NEW.host_id);
  END IF;

  -- If guest_id or host_id changed (rare), recompute the old ones too
  IF TG_OP = 'UPDATE' THEN
    IF OLD.guest_id IS NOT NULL AND OLD.guest_id <> NEW.guest_id THEN
      PERFORM recompute_user_combined_rating(OLD.guest_id);
    END IF;
    IF OLD.host_id IS NOT NULL AND OLD.host_id <> NEW.host_id THEN
      PERFORM recompute_user_combined_rating(OLD.host_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_user_combined_ratings ON stay_confirmations;
CREATE TRIGGER trg_update_user_combined_ratings
  AFTER INSERT OR UPDATE OF guest_rating, host_rating, guest_id, host_id
                OR DELETE
  ON stay_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION trg_update_user_combined_ratings_fn();

-- ── 3. Backfill rating_avg / rating_count for existing rows ──
-- One-shot. The trigger above handles all future changes.

UPDATE users u
   SET rating_avg = sub.avg_rating,
       rating_count = COALESCE(sub.cnt, 0)
  FROM (
    SELECT
      x.user_id,
      AVG(x.stars)::NUMERIC(3,2) AS avg_rating,
      COUNT(*)::INTEGER          AS cnt
    FROM (
      SELECT guest_id AS user_id, guest_rating::NUMERIC AS stars
        FROM stay_confirmations
       WHERE guest_rating IS NOT NULL
      UNION ALL
      SELECT host_id AS user_id, host_rating::NUMERIC AS stars
        FROM stay_confirmations
       WHERE host_rating IS NOT NULL
    ) x
    GROUP BY x.user_id
  ) sub
 WHERE u.id = sub.user_id;
