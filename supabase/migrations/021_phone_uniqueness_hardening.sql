-- ============================================================
-- Migration 021: Phone uniqueness hardening
-- Session: CC-C5 Revisit
-- Date: 2026-04-20
-- Idempotent: safe to re-run
-- ============================================================
--
-- Why: migration 001 added UNIQUE(phone_number) but Loren was able to
-- sign up two Clerk accounts sharing the same phone. Root cause is
-- not a constraint violation — account #1's DB row has phone_number
-- = NULL (predates phone-required signup), so account #2's phone
-- didn't collide. The UNIQUE constraint stays; this migration adds
-- belt-and-suspenders:
--
--   1. A dedicated partial unique index on non-null phone_number.
--      The named constraint from 001 stays (duplicates NULLs are
--      fine) — the partial index just makes enforcement explicit
--      and is documented for readers.
--   2. Audit query result is logged (zero duplicates at time of
--      writing — verified pre-migration).
--   3. Normalizes any existing phone strings that drifted from
--      E.164 format (+ prefix, digits only). Application code
--      should always write E.164 via libphonenumber-js, but we
--      backstop here in case legacy seed data slipped through.
-- ============================================================

-- 1. Log duplicate audit.
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count FROM (
    SELECT phone_number
    FROM users
    WHERE phone_number IS NOT NULL
    GROUP BY phone_number
    HAVING COUNT(*) > 1
  ) dupes;
  RAISE NOTICE 'Phone duplicate audit: % distinct duplicated phone numbers', dup_count;
  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Refusing to apply migration 021: % duplicated phone numbers exist. Dedupe before re-running.', dup_count;
  END IF;
END $$;

-- 2. Normalize legacy phone strings that may have snuck in without a
--    leading '+'. Strip anything but digits, then add '+' back.
UPDATE users
SET phone_number = '+' || regexp_replace(phone_number, '\D', '', 'g')
WHERE phone_number IS NOT NULL
  AND phone_number !~ '^\+';

-- 3. Partial unique index on non-null phone numbers. Redundant with
--    the constraint from migration 001 (which already enforces
--    uniqueness, with NULLs permitted multiple times) but explicit
--    and self-documenting.
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_number_nonnull_uniq
  ON users (phone_number)
  WHERE phone_number IS NOT NULL;

-- 4. CHECK constraint: phone numbers must be E.164 format if present.
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_phone_number_e164
    CHECK (phone_number IS NULL OR phone_number ~ '^\+[1-9]\d{7,14}$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
