-- ============================================================
-- Migration 035b: Platform-Origin Vouch Bucket — Trigger + Backfill
-- Session: CC-Alpha-C-S3
-- Date: 2026-04-22
-- Idempotent: safe to re-run
-- ============================================================
-- Part 1 of this session added `platform_met` to the enum.
-- This file:
--   1. Updates the vouch_score trigger so the new bucket maps
--      to a 0.4× multiplier (smaller than the existing 0.6×
--      for genuine sub-1-year relationships).
--   2. Backfills existing post-stay vouches (is_post_stay=true
--      AND years_known_bucket='lt1') to the new bucket. The
--      trigger fires on UPDATE and auto-recomputes vouch_score.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Update the trigger to know about 'platform_met' = 0.4
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

  IF TG_OP = 'INSERT' THEN
    UPDATE users SET vouch_count_given = vouch_count_given + 1
    WHERE id = NEW.voucher_id;
    UPDATE users SET vouch_count_received = vouch_count_received + 1
    WHERE id = NEW.vouchee_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger binding is already in place from 014b, but re-assert it
-- here so running 035b standalone on a fresh DB works.
DROP TRIGGER IF EXISTS trg_compute_vouch_score ON vouches;
CREATE TRIGGER trg_compute_vouch_score
  BEFORE INSERT OR UPDATE OF vouch_type, years_known_bucket ON vouches
  FOR EACH ROW
  EXECUTE FUNCTION compute_vouch_score_and_counts();

-- ------------------------------------------------------------
-- 2. Backfill: post-stay vouches sitting on lt1 → platform_met
-- ------------------------------------------------------------
-- Trigger fires on UPDATE of years_known_bucket and re-derives
-- vouch_score (15 × 0.6 = 9 → 15 × 0.4 = 6 for a standard vouch).
UPDATE vouches
SET years_known_bucket = 'platform_met'
WHERE is_post_stay = true
  AND years_known_bucket = 'lt1';

-- ============================================================
-- DONE
-- ============================================================
-- NOTE: 1° trust scores between users are computed on-read from
-- vouches.vouch_score (compute1DegreeScore), so no separate
-- recomputation step is required — viewer-side scores update
-- automatically on next render. users.vouch_power depends on
-- guest ratings (not years_known), so it is unaffected.
-- ============================================================
