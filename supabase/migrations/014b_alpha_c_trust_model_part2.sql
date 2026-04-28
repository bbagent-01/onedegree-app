-- ============================================================
-- Migration 014b: Alpha-C Trust Model (part 2)
-- Enum values were added in part 1 (014a).
-- This file contains everything that references the new enum values.
-- ============================================================

-- ============================================================
-- 2. VOUCHES TABLE — add Alpha-C columns
-- ============================================================

ALTER TABLE vouches ADD COLUMN IF NOT EXISTS vouch_score NUMERIC;
ALTER TABLE vouches ADD COLUMN IF NOT EXISTS is_post_stay BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE vouches ADD COLUMN IF NOT EXISTS source_booking_id UUID;
ALTER TABLE vouches ADD COLUMN IF NOT EXISTS is_staked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE vouches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================
-- 3. USERS TABLE — add vouch counts, fix vouch_power default
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS vouch_count_given INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vouch_count_received INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ALTER COLUMN vouch_power SET DEFAULT 1.0;
UPDATE users SET vouch_power = 1.0 WHERE vouch_power IS NULL;

-- ============================================================
-- 4. LISTINGS TABLE — add Alpha-C visibility columns
-- ============================================================

DO $$ BEGIN
  ALTER TABLE listings ADD COLUMN visibility_mode TEXT NOT NULL DEFAULT 'preview_gated'
    CHECK (visibility_mode IN ('public', 'preview_gated', 'hidden'));
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

ALTER TABLE listings ADD COLUMN IF NOT EXISTS preview_photos JSONB;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS preview_description TEXT;

DO $$ BEGIN
  ALTER TABLE listings ADD COLUMN access_settings JSONB NOT NULL DEFAULT '{
    "see_preview": { "type": "anyone" },
    "see_full": { "type": "min_score", "threshold": 10 },
    "request_book": { "type": "min_score", "threshold": 20 },
    "message": { "type": "min_score", "threshold": 10 },
    "request_intro": { "type": "anyone" },
    "view_host_profile": { "type": "anyone" }
  }'::jsonb;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- 5. INVITES TABLE — add Alpha-C columns
-- ============================================================

ALTER TABLE invites ADD COLUMN IF NOT EXISTS invitee_name TEXT;
ALTER TABLE invites ADD COLUMN IF NOT EXISTS pre_vouch_data JSONB;

DO $$ BEGIN
  ALTER TABLE invites ADD COLUMN status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'clicked', 'joined'));
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- 6. VOUCH SCORE COMPUTATION TRIGGER
-- ============================================================

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
    WHEN 'lt1'     THEN 0.6
    WHEN 'lt1yr'   THEN 0.6
    WHEN '1to3'    THEN 1.0
    WHEN '1to3yr'  THEN 1.0
    WHEN '3to5'    THEN 1.2
    WHEN '4to7yr'  THEN 1.2
    WHEN '5to10'   THEN 1.5
    WHEN '8to15yr' THEN 1.5
    WHEN '10plus'  THEN 1.8
    WHEN '15plusyr' THEN 1.8
    ELSE 1.0
  END;

  NEW.vouch_score := v_base * v_mult;
  NEW.updated_at := now();

  IF TG_OP = 'INSERT' THEN
    UPDATE users SET vouch_count_given = vouch_count_given + 1
    WHERE id = NEW.voucher_id;
    UPDATE users SET vouch_count_received = vouch_count_received + 1
    WHERE id = NEW.vouchee_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_compute_vouch_score ON vouches;
CREATE TRIGGER trg_compute_vouch_score
  BEFORE INSERT OR UPDATE OF vouch_type, years_known_bucket ON vouches
  FOR EACH ROW
  EXECUTE FUNCTION compute_vouch_score_and_counts();

-- Backfill vouch_score for any existing rows
UPDATE vouches SET vouch_score = (
  CASE vouch_type WHEN 'inner_circle' THEN 25.0 ELSE 15.0 END
  *
  CASE years_known_bucket
    WHEN 'lt1' THEN 0.6 WHEN 'lt1yr' THEN 0.6
    WHEN '1to3' THEN 1.0 WHEN '1to3yr' THEN 1.0
    WHEN '3to5' THEN 1.2 WHEN '4to7yr' THEN 1.2
    WHEN '5to10' THEN 1.5 WHEN '8to15yr' THEN 1.5
    WHEN '10plus' THEN 1.8 WHEN '15plusyr' THEN 1.8
    ELSE 1.0
  END
) WHERE vouch_score IS NULL;

-- Backfill vouch counts
UPDATE users u SET vouch_count_given = (
  SELECT COUNT(*) FROM vouches WHERE voucher_id = u.id
);
UPDATE users u SET vouch_count_received = (
  SELECT COUNT(*) FROM vouches WHERE vouchee_id = u.id
);

-- ============================================================
-- 7. VOUCH POWER TRIGGER (replaces old recalculate_vouch_power)
-- ============================================================

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
    WHERE v.voucher_id IN (SELECT voucher_id FROM vouches WHERE vouchee_id = NEW.id)
      AND u2.guest_rating IS NOT NULL
    GROUP BY v.voucher_id
  ) sub
  WHERE users.id = sub.voucher_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_vouch_power ON users;
CREATE TRIGGER trg_vouch_power
  AFTER UPDATE OF guest_rating ON users
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_vouch_power();

-- ============================================================
-- 8. GUEST/HOST RATING TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_user_ratings_on_review()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.guest_rating IS NOT NULL AND (OLD IS NULL OR OLD.guest_rating IS NULL OR NEW.guest_rating != OLD.guest_rating) THEN
    UPDATE users SET
      guest_rating = sub.avg_rating,
      guest_review_count = sub.cnt
    FROM (
      SELECT
        sc.guest_id,
        AVG(sc.guest_rating)::DECIMAL(3,2) AS avg_rating,
        COUNT(*)::INTEGER AS cnt
      FROM stay_confirmations sc
      WHERE sc.guest_id = NEW.guest_id
        AND sc.guest_rating IS NOT NULL
      GROUP BY sc.guest_id
    ) sub
    WHERE users.id = sub.guest_id;
  END IF;

  IF NEW.host_rating IS NOT NULL AND (OLD IS NULL OR OLD.host_rating IS NULL OR NEW.host_rating != OLD.host_rating) THEN
    UPDATE users SET
      host_rating = sub.avg_rating,
      host_review_count = sub.cnt
    FROM (
      SELECT
        sc.host_id,
        AVG(sc.host_rating)::DECIMAL(3,2) AS avg_rating,
        COUNT(*)::INTEGER AS cnt
      FROM stay_confirmations sc
      WHERE sc.host_id = NEW.host_id
        AND sc.host_rating IS NOT NULL
      GROUP BY sc.host_id
    ) sub
    WHERE users.id = sub.host_id;
  END IF;

  IF NEW.listing_rating IS NOT NULL AND (OLD IS NULL OR OLD.listing_rating IS NULL OR NEW.listing_rating != OLD.listing_rating) THEN
    UPDATE listings SET
      avg_listing_rating = sub.avg_rating,
      listing_review_count = sub.cnt
    FROM (
      SELECT
        sc.listing_id,
        AVG(sc.listing_rating)::DECIMAL(3,2) AS avg_rating,
        COUNT(*)::INTEGER AS cnt
      FROM stay_confirmations sc
      WHERE sc.listing_id = NEW.listing_id
        AND sc.listing_rating IS NOT NULL
      GROUP BY sc.listing_id
    ) sub
    WHERE listings.id = sub.listing_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_user_ratings ON stay_confirmations;
CREATE TRIGGER trg_update_user_ratings
  AFTER UPDATE OF guest_rating, host_rating, listing_rating ON stay_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_ratings_on_review();

DROP TRIGGER IF EXISTS trg_update_user_ratings_insert ON stay_confirmations;
CREATE TRIGGER trg_update_user_ratings_insert
  AFTER INSERT ON stay_confirmations
  FOR EACH ROW
  WHEN (NEW.guest_rating IS NOT NULL OR NEW.host_rating IS NOT NULL OR NEW.listing_rating IS NOT NULL)
  EXECUTE FUNCTION update_user_ratings_on_review();

-- ============================================================
-- 9. RPC: get_trust_data_for_viewer
-- ============================================================

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
    AND v_ct.vouchee_id != p_viewer_id;
$$;

-- ============================================================
-- 10. RPC: recalculate_vouch_power_for_user
-- ============================================================

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

-- ============================================================
-- 11. RPC: get_user_network
-- ============================================================

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
  WHERE v.vouchee_id = p_user_id;
$$;

-- ============================================================
-- DONE
-- ============================================================
