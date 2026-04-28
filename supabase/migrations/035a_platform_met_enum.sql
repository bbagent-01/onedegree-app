-- ============================================================
-- Migration 035a: Platform-Origin Vouch Bucket — Enum extension
-- Session: CC-Alpha-C-S3
-- Date: 2026-04-22
-- Idempotent: safe to re-run
-- ============================================================
-- Adds a new `platform_met` value to years_known_bucket_enum,
-- ranked *below* `lt1`. Used for post-stay ("Met on Trustead")
-- vouches so platform-originated relationships are scored with
-- a smaller multiplier (0.4×) than genuine sub-1-year IRL ties.
--
-- Split from 035b: PostgreSQL requires new enum values to be
-- committed in a separate transaction before they can be used
-- in triggers or UPDATE statements (same constraint that forced
-- the 014a/014b split).
-- ============================================================

DO $$ BEGIN
  ALTER TYPE years_known_bucket_enum ADD VALUE IF NOT EXISTS 'platform_met' BEFORE 'lt1';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- DONE — now run 035b_platform_met_backfill.sql
-- ============================================================
