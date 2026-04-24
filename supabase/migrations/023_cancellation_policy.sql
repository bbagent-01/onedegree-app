-- ============================================================
-- Migration 023: Cancellation policy (host default → listing →
--                reservation snapshot)
-- Session: Booking-flow v2 Chunk 4
-- Date: 2026-04-20
-- Idempotent: safe to re-run
-- ============================================================
--
-- Three-level inheritance model for cancellation terms. Same shape
-- at every level; the resolver picks the tightest override:
--
--   users.cancellation_policy             (host default, null = platform default)
--   listings.cancellation_policy_override (per-listing, null = inherit host)
--   contact_requests.cancellation_policy  (locked-in snapshot at accept)
--
-- Stored as JSONB with shape:
--   {
--     "preset": "flexible" | "moderate" | "strict" | "custom",
--     "windows": [
--       { "cutoff_days_before_checkin": INTEGER, "refund_pct": INTEGER }
--     ],
--     "custom_note": TEXT | null
--   }
--
-- `windows` is an ordered list from earliest-cutoff to latest. The
-- lib resolver walks it descending and returns the first refund_pct
-- whose cutoff the "days until check-in" still exceeds. A preset
-- name + null windows is allowed (lib expands it); storing the
-- windows explicitly future-proofs custom schedules.
--
-- Trustead doesn't process payments — this policy is informational /
-- expectation-setting. `contact_requests.cancellation_policy` stays
-- with the row as the authoritative term if the guest later cancels.
-- ============================================================

-- 1. Users — host-level default.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS cancellation_policy JSONB DEFAULT NULL;

-- 2. Listings — per-listing override (null = inherit host default).
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS cancellation_policy_override JSONB DEFAULT NULL;

-- 3. Contact requests — locked snapshot at accept time.
ALTER TABLE contact_requests
  ADD COLUMN IF NOT EXISTS cancellation_policy JSONB DEFAULT NULL;

-- 4. Backfill: every existing host gets the platform default
-- (Moderate) so viewers don't see a blank policy on alpha-c. Only
-- touches users who actually own a listing — passive members stay
-- untouched. Idempotent via the IS NULL guard.
UPDATE users
SET cancellation_policy = jsonb_build_object(
  'preset', 'moderate',
  'windows', jsonb_build_array(
    jsonb_build_object('cutoff_days_before_checkin', 5,  'refund_pct', 100),
    jsonb_build_object('cutoff_days_before_checkin', 1,  'refund_pct', 50),
    jsonb_build_object('cutoff_days_before_checkin', 0,  'refund_pct', 0)
  ),
  'custom_note', NULL
)
WHERE cancellation_policy IS NULL
  AND id IN (SELECT DISTINCT host_id FROM listings);

DO $$
DECLARE
  n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n FROM users WHERE cancellation_policy IS NOT NULL;
  RAISE NOTICE 'cancellation_policy backfill complete — % hosts default to Moderate', n;
END $$;
