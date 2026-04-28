-- Migration 008: Trips, system messages, notifications (CC-B6b)
-- - Adds email notification preferences to users
-- - Adds cancellation tracking to contact_requests
-- - Allows the contact_requests.status enum to include "cancelled"

-- ============================================================================
-- 1. users.email_prefs — JSONB toggles for transactional email categories
-- ============================================================================
DO $$ BEGIN
  ALTER TABLE users
    ADD COLUMN email_prefs JSONB NOT NULL DEFAULT '{
      "booking_request": true,
      "booking_confirmed": true,
      "booking_declined": true,
      "new_message": true,
      "review_reminder": true
    }'::jsonb;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================================
-- 2. contact_requests — cancellation tracking + status enum widening
-- ============================================================================
DO $$ BEGIN
  ALTER TABLE contact_requests ADD COLUMN cancelled_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE contact_requests ADD COLUMN cancelled_by UUID REFERENCES users(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Widen status check constraint to include "cancelled" (drop and recreate
-- so we don't depend on the previous constraint name).
ALTER TABLE contact_requests DROP CONSTRAINT IF EXISTS contact_requests_status_check;
ALTER TABLE contact_requests ADD CONSTRAINT contact_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled'));

-- ============================================================================
-- 3. Marker so this migration is idempotent + traceable
-- ============================================================================
COMMENT ON COLUMN users.email_prefs IS 'CC-B6b transactional email toggles';
COMMENT ON COLUMN contact_requests.cancelled_at IS 'CC-B6b set when guest cancels';
