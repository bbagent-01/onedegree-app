-- ============================================================
-- Migration 024: Cancellation + payment schedule (replaces the
--                refund-window shape from migration 023)
-- Session: Booking-flow v2 Chunk 4 revision
-- Date: 2026-04-21
-- Idempotent: safe to re-run
-- ============================================================
--
-- Why the reshape: 1° B&B doesn't custody or refund money — every
-- payment moves host↔guest off-platform. A "refund schedule" is an
-- abstraction that doesn't map cleanly. What hosts actually need
-- is: WHEN to collect money, and how much. If a host wants strict
-- cancellation terms, they collect up front; flexible = collect at
-- check-in. The UX follows: pick a preset as a template, then edit
-- the rows directly.
--
-- New JSONB shape:
-- {
--   "preset": "flexible" | "moderate" | "strict" | "custom",
--   "payment_schedule": [
--     {
--       "due_at": "booking" | "days_before_checkin" | "check_in",
--       "days_before_checkin": INTEGER,  -- only used when due_at = days_before_checkin
--       "amount_type": "percentage" | "fixed",
--       "amount": NUMERIC                 -- 0-100 if percentage, dollars if fixed
--     }, …
--   ],
--   "security_deposit": [ same shape as payment_schedule, usually empty ],
--   "custom_note": TEXT | null
-- }
--
-- We wipe existing values and re-backfill since the old
-- `windows` key is incompatible with the new resolver.
-- ============================================================

-- Columns already exist from 023; only wipe + re-seed.
UPDATE users            SET cancellation_policy            = NULL;
UPDATE listings         SET cancellation_policy_override   = NULL;
UPDATE contact_requests SET cancellation_policy            = NULL;

-- Moderate preset: 50% 5 days out, 50% at check-in. Backfilled
-- onto every host who owns a listing.
UPDATE users
SET cancellation_policy = jsonb_build_object(
  'preset', 'moderate',
  'payment_schedule', jsonb_build_array(
    jsonb_build_object(
      'due_at', 'days_before_checkin',
      'days_before_checkin', 5,
      'amount_type', 'percentage',
      'amount', 50
    ),
    jsonb_build_object(
      'due_at', 'check_in',
      'amount_type', 'percentage',
      'amount', 50
    )
  ),
  'security_deposit', '[]'::jsonb,
  'custom_note', NULL
)
WHERE id IN (SELECT DISTINCT host_id FROM listings);

DO $$
DECLARE
  n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n FROM users WHERE cancellation_policy IS NOT NULL;
  RAISE NOTICE 'cancellation_policy reshape complete — % hosts reset to Moderate template', n;
END $$;
