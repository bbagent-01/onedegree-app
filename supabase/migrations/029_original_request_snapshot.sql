-- ============================================================
-- Migration 029: Original request snapshot on contact_requests
-- Session: Booking-flow v2 — diff indicators on host-edited terms
-- Date: 2026-04-21
-- Idempotent: safe to re-run
-- ============================================================
--
-- Why: the host's Review & send card can now edit dates, guest
-- count, and total before approving. When the guest later opens
-- the terms_offered message they should see what changed from
-- what they originally submitted. That comparison needs the
-- original values kept alongside the live ones.
--
-- Columns added:
--   original_check_in       DATE
--   original_check_out      DATE
--   original_guest_count    INTEGER
--   original_total_estimate INTEGER
--
-- Backfill: for existing rows where host hasn't edited yet, copy
-- the live value into the original column so the diff shows
-- "unchanged". Later host edits won't touch the original columns.
-- ============================================================

ALTER TABLE contact_requests
  ADD COLUMN IF NOT EXISTS original_check_in       DATE,
  ADD COLUMN IF NOT EXISTS original_check_out      DATE,
  ADD COLUMN IF NOT EXISTS original_guest_count    INTEGER,
  ADD COLUMN IF NOT EXISTS original_total_estimate INTEGER;

COMMENT ON COLUMN contact_requests.original_check_in IS
  'Check-in as the guest originally submitted it. Immutable. Drives diff badges when the host counter-offers.';
COMMENT ON COLUMN contact_requests.original_check_out IS
  'Checkout as the guest originally submitted it. Immutable.';
COMMENT ON COLUMN contact_requests.original_guest_count IS
  'Guest count as originally submitted. Immutable.';
COMMENT ON COLUMN contact_requests.original_total_estimate IS
  'Estimated total the guest saw at submission. Immutable.';

-- Backfill: copy live values where original columns are still
-- null. Only touches rows that haven't been backfilled already.
UPDATE contact_requests
SET
  original_check_in       = COALESCE(original_check_in,       check_in),
  original_check_out      = COALESCE(original_check_out,      check_out),
  original_guest_count    = COALESCE(original_guest_count,    guest_count),
  original_total_estimate = COALESCE(original_total_estimate, total_estimate)
WHERE
  original_check_in       IS NULL
  OR original_check_out   IS NULL
  OR original_guest_count IS NULL
  OR original_total_estimate IS NULL;

DO $$
DECLARE
  n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n FROM contact_requests WHERE original_check_in IS NOT NULL;
  RAISE NOTICE 'contact_requests with original snapshot populated: %', n;
END $$;
