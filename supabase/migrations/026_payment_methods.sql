-- ============================================================
-- Migration 026: Host payment methods
-- Session: Booking-flow v2 Chunk 3 (payment preferences, host-level)
-- Date: 2026-04-21
-- Idempotent: safe to re-run
-- ============================================================
--
-- Why: hosts need a place to declare *how* they want to be paid
-- off-platform — Venmo, Zelle, PayPal, Wise, or a free-text
-- "offline/other" note. The cancellation policy (mig 025) tells
-- guests *when* money is due; this tells them *where* to send it.
--
-- 1° B&B still doesn't custody money. We store receive-only
-- handles (never bank routing numbers) so guests can copy a
-- Venmo handle or a PayPal email after a request is approved.
--
-- JSONB shape (array):
--   [
--     {
--       "type": "venmo" | "zelle" | "paypal" | "wise" | "offline_other",
--       "handle": TEXT,          -- receive-only, public-ish identifier
--       "note":   TEXT | null,   -- optional; required for offline_other
--       "enabled": BOOLEAN       -- host can pause a method without losing it
--     },
--     ...
--   ]
--
-- Default is an empty array — hosts opt in explicitly.
-- Listing-level override + per-reservation snapshot are deferred to
-- a later migration; this ships the host-level prefs only so we can
-- unblock the Settings page today.
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS payment_methods JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN users.payment_methods IS
  'Off-platform payment methods (Venmo/Zelle/PayPal/Wise/offline_other). Receive-only handles; never bank details. Booking-flow v2 Chunk 3.';

DO $$
DECLARE
  n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n
  FROM information_schema.columns
  WHERE table_name = 'users' AND column_name = 'payment_methods';
  RAISE NOTICE 'users.payment_methods present: %', n;
END $$;
