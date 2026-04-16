-- ============================================================
-- Migration 014a: Alpha-C Trust Model — Enum extensions
-- Session: CC-C1a
-- Date: 2026-04-15
-- Idempotent: safe to re-run
-- ============================================================
-- IMPORTANT: Must run BEFORE 014b. New enum values must be committed
-- in a separate transaction before they can be referenced in
-- triggers/backfills (PostgreSQL requirement).
-- ============================================================

-- Add new Alpha-C bucket values. Old values (lt1yr, 4to7yr, etc.) stay
-- for backward compat but won't be used by new code.

DO $$ BEGIN
  ALTER TYPE years_known_bucket_enum ADD VALUE IF NOT EXISTS 'lt1';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE years_known_bucket_enum ADD VALUE IF NOT EXISTS '1to3';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE years_known_bucket_enum ADD VALUE IF NOT EXISTS '3to5';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE years_known_bucket_enum ADD VALUE IF NOT EXISTS '5to10';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE years_known_bucket_enum ADD VALUE IF NOT EXISTS '10plus';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- DONE — now run 014b_alpha_c_trust_model_part2.sql
-- ============================================================
