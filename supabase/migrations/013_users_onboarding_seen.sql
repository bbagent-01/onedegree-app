-- ============================================================
-- Migration 013: First-sign-in onboarding flag
-- Session: CC-B1
-- Date: 2026-04-29
-- Idempotent: safe to re-run
-- ============================================================
--
-- Adds users.onboarding_seen_at — a nullable timestamp that the
-- 3-screen Welcome swiper writes when the user finishes or skips
-- the flow. NULL means "show onboarding"; any value means "done".
-- "Replay onboarding" in Settings sets it back to NULL.
-- RLS unchanged (writes go through the authenticated API route).
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_seen_at TIMESTAMPTZ DEFAULT NULL;
