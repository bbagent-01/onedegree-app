-- ============================================================
-- Migration 031: Original cancellation policy snapshot
-- Session: Booking-flow v2 — section-level diff pills
-- Date: 2026-04-21
-- Idempotent: safe to re-run
-- ============================================================
--
-- Why: Migration 029 captured an immutable snapshot of the
-- guest's original request (dates, guest_count, total_estimate),
-- but NOT the cancellation policy they saw at submission. If a
-- host counter-offers by editing the policy before approving,
-- the terms_offered card has no "original" to diff against — so
-- we can't highlight that the policy was updated.
--
-- Adds a single JSONB column holding the full effective policy
-- (listing override → host default → platform default) at the
-- exact moment the request was submitted.
--
-- Backfill: for existing rows where this column is still null,
-- copy the current cancellation_policy so the diff shows
-- "unchanged" rather than triggering a false positive on stays
-- that predate this feature. Later host edits won't touch the
-- original column.
-- ============================================================

ALTER TABLE contact_requests
  ADD COLUMN IF NOT EXISTS original_cancellation_policy JSONB;

COMMENT ON COLUMN contact_requests.original_cancellation_policy IS
  'Effective cancellation policy at submission time (listing override → host default → platform default). Immutable. Drives the section-level "Host updated" pill on the terms_offered card.';

-- Backfill: copy the live snapshot where original is still null.
-- Belt-and-suspenders COALESCE so re-running the migration never
-- overwrites a real value.
UPDATE contact_requests
SET original_cancellation_policy = COALESCE(
  original_cancellation_policy,
  cancellation_policy
)
WHERE original_cancellation_policy IS NULL
  AND cancellation_policy IS NOT NULL;

DO $$
DECLARE
  n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n FROM contact_requests WHERE original_cancellation_policy IS NOT NULL;
  RAISE NOTICE 'contact_requests with original_cancellation_policy populated: %', n;
END $$;
