-- ============================================================
-- Migration 001: Align schema with PROJECT_PLAN.md
-- Session: CC-6a
-- Date: 2026-04-10
-- Idempotent: safe to re-run
-- ============================================================

-- ============================================================
-- 1. CREATE ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE vouch_type_enum AS ENUM ('standard', 'inner_circle');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE years_known_bucket_enum AS ENUM ('lt1yr', '1to3yr', '4to7yr', '8to15yr', '15plusyr');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE incident_severity_enum AS ENUM ('minor', 'moderate', 'serious');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE incident_handling_enum AS ENUM ('excellent', 'responsive', 'poor', 'terrible');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. USERS TABLE — add missing columns, drop obsolete ones
-- ============================================================

-- Add new columns (idempotent: IF NOT EXISTS via DO block)
ALTER TABLE users ADD COLUMN IF NOT EXISTS guest_rating DECIMAL(3,2) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS guest_review_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS host_rating DECIMAL(3,2) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS host_review_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vouch_power DECIMAL(3,2) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT DEFAULT NULL;

-- Add unique constraint on phone_number (idempotent)
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_phone_number_unique UNIQUE (phone_number);
EXCEPTION WHEN others THEN NULL;
END $$;

-- Drop obsolete columns from CC-5 scaffold
ALTER TABLE users DROP COLUMN IF EXISTS role;
ALTER TABLE users DROP COLUMN IF EXISTS trust_score;

-- ============================================================
-- 3. VOUCHES TABLE — replace old columns with plan-aligned ones
-- ============================================================

-- Drop old columns
ALTER TABLE vouches DROP COLUMN IF EXISTS trust_level;
ALTER TABLE vouches DROP COLUMN IF EXISTS years_known;
ALTER TABLE vouches DROP COLUMN IF EXISTS reputation_stake;
ALTER TABLE vouches DROP COLUMN IF EXISTS confirmed_at;

-- Add new columns
ALTER TABLE vouches ADD COLUMN IF NOT EXISTS vouch_type vouch_type_enum;
ALTER TABLE vouches ADD COLUMN IF NOT EXISTS years_known_bucket years_known_bucket_enum;
ALTER TABLE vouches ADD COLUMN IF NOT EXISTS reputation_stake_confirmed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE vouches ADD COLUMN IF NOT EXISTS stay_confirmation_id UUID DEFAULT NULL;

-- Set NOT NULL after adding (in case table has existing rows — there shouldn't be any yet)
-- If rows exist with NULLs, this will fail and you'll need to backfill first
DO $$ BEGIN
  ALTER TABLE vouches ALTER COLUMN vouch_type SET NOT NULL;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'vouch_type NOT NULL skipped — backfill existing rows first';
END $$;

DO $$ BEGIN
  ALTER TABLE vouches ALTER COLUMN years_known_bucket SET NOT NULL;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'years_known_bucket NOT NULL skipped — backfill existing rows first';
END $$;

-- FK to stay_confirmations (for post-stay vouches)
DO $$ BEGIN
  ALTER TABLE vouches ADD CONSTRAINT vouches_stay_confirmation_fk
    FOREIGN KEY (stay_confirmation_id) REFERENCES stay_confirmations(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CHECK: can't vouch for yourself
DO $$ BEGIN
  ALTER TABLE vouches ADD CONSTRAINT vouches_no_self_vouch CHECK (voucher_id != vouchee_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- UNIQUE already exists from original schema (voucher_id, vouchee_id)

-- ============================================================
-- 4. INVITES TABLE — add phone column
-- ============================================================

ALTER TABLE invites ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT NULL;

-- ============================================================
-- 5. STAY_CONFIRMATIONS TABLE — fix rating scale, add columns
-- ============================================================

-- Change host_rating from 1-10 to 1-5
-- Drop old constraint, add new one
ALTER TABLE stay_confirmations DROP CONSTRAINT IF EXISTS stay_confirmations_host_rating_check;
ALTER TABLE stay_confirmations ADD CONSTRAINT stay_confirmations_host_rating_check
  CHECK (host_rating BETWEEN 1 AND 5);

-- Change guest_rating from 1-10 to 1-5
ALTER TABLE stay_confirmations DROP CONSTRAINT IF EXISTS stay_confirmations_guest_rating_check;
ALTER TABLE stay_confirmations ADD CONSTRAINT stay_confirmations_guest_rating_check
  CHECK (guest_rating BETWEEN 1 AND 5);

-- Add listing_rating and review_text
ALTER TABLE stay_confirmations ADD COLUMN IF NOT EXISTS listing_rating INTEGER;
DO $$ BEGIN
  ALTER TABLE stay_confirmations ADD CONSTRAINT stay_confirmations_listing_rating_check
    CHECK (listing_rating BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE stay_confirmations ADD COLUMN IF NOT EXISTS review_text TEXT DEFAULT NULL;

-- ============================================================
-- 6. INCIDENTS TABLE — create new
-- ============================================================

CREATE TABLE IF NOT EXISTS incidents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stay_confirmation_id  UUID REFERENCES stay_confirmations(id),
  severity              incident_severity_enum NOT NULL,
  handling              incident_handling_enum NOT NULL,
  description           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- RLS: reporters can read their own reports
DO $$ BEGIN
  CREATE POLICY "reporters_read_own" ON incidents FOR SELECT TO authenticated
    USING (reporter_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS: reporters can insert
DO $$ BEGIN
  CREATE POLICY "reporters_insert" ON incidents FOR INSERT TO authenticated
    WITH CHECK (reporter_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_incidents_reporter ON incidents(reporter_id);
CREATE INDEX IF NOT EXISTS idx_incidents_reported_user ON incidents(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_stay ON incidents(stay_confirmation_id);

-- ============================================================
-- 7. VOUCH POWER TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION recalculate_vouch_power()
RETURNS TRIGGER AS $$
BEGIN
  -- For every user who vouched for the user whose guest_rating just changed,
  -- recalculate their vouch_power as avg guest_rating of their vouchees with >= 1 review.
  UPDATE users
  SET vouch_power = sub.avg_rating
  FROM (
    SELECT v.voucher_id, AVG(u2.guest_rating) AS avg_rating
    FROM vouches v
    JOIN users u2 ON u2.id = v.vouchee_id
    WHERE v.voucher_id IN (SELECT voucher_id FROM vouches WHERE vouchee_id = NEW.id)
      AND u2.guest_review_count >= 1
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
-- 8. RPC: calculate_one_degree_scores (batch)
-- ============================================================

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
    -- Skip self
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
          -- viewer's vouch points for connector
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
          -- connector's vouch points for target, scaled by vouch power
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
      FROM vouches v_vc                                    -- viewer -> connector
      JOIN vouches v_ct ON v_ct.voucher_id = v_vc.vouchee_id  -- connector -> target
      JOIN users u_conn ON u_conn.id = v_vc.vouchee_id     -- connector's user record
      WHERE v_vc.voucher_id = p_viewer_id
        AND v_ct.vouchee_id = v_target
        AND v_vc.vouchee_id != p_viewer_id                 -- connector isn't viewer
        AND v_vc.vouchee_id != v_target                    -- connector isn't target
    ) paths;
  END LOOP;
END;
$$;

-- ============================================================
-- 9. RPC: calculate_vouch_power (single user, on-demand)
-- ============================================================

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
    AND u.guest_review_count >= 1
    AND u.guest_rating IS NOT NULL;

  -- Update stored value
  UPDATE users SET vouch_power = v_result WHERE id = p_user_id;

  RETURN v_result;
END;
$$;

-- ============================================================
-- DONE
-- ============================================================
-- Run this entire file in the Supabase SQL Editor.
-- Then run the test queries in SCHEMA_NOTES.md to verify.
