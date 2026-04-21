-- ============================================================
-- Migration 028: Per-listing cleaning fee
-- Session: Booking-flow v2 follow-up
-- Date: 2026-04-21
-- Idempotent: safe to re-run
-- ============================================================
--
-- Why: alpha-c zeroed the cleaning fee with a hardcoded 0% rate so
-- the booking sidebar and reserve page rendered a clean subtotal
-- while the payment flow was still being designed. Loren wants the
-- line item visible on every listing so he can see the fee
-- mechanic on the host's approval card and the guest's price
-- breakdown. Rather than a percentage of nights, we store a flat
-- cleaning fee per listing (hosts commonly think in flat numbers).
--
-- Column: listings.cleaning_fee INTEGER (USD, whole dollars).
-- NULL means "no cleaning fee" — the renderer hides the row.
--
-- Seed: every active listing that doesn't already have a fee gets
-- one scaled to its nightly price (roughly half a night, clamped
-- to a sensible range). That gives every seeded listing a visible
-- line item without making the numbers absurd.
-- ============================================================

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS cleaning_fee INTEGER;

COMMENT ON COLUMN listings.cleaning_fee IS
  'Flat cleaning fee in whole USD charged once per reservation. NULL or 0 = no fee. Booking-flow v2.';

-- Seed cleaning fees for active listings that don't have one yet.
-- Formula: half the nightly price_min, rounded to nearest $5,
-- clamped to $25 minimum and $150 maximum so numbers stay readable.
UPDATE listings
SET cleaning_fee =
  GREATEST(
    25,
    LEAST(
      150,
      (ROUND((price_min::numeric / 2.0) / 5.0) * 5)::integer
    )
  )
WHERE is_active = true
  AND price_min IS NOT NULL
  AND price_min > 0
  AND (cleaning_fee IS NULL OR cleaning_fee = 0);

DO $$
DECLARE
  n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n FROM listings WHERE cleaning_fee IS NOT NULL AND cleaning_fee > 0;
  RAISE NOTICE 'Listings with a cleaning fee: %', n;
END $$;
