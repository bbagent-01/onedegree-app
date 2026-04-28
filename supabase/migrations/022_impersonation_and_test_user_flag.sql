-- ============================================================
-- Migration 022: is_test_user flag + impersonation audit log
-- Session: CC-Dev1 (Impersonation Switcher — ALPHA ONLY)
-- Date: 2026-04-20
-- Idempotent: safe to re-run
-- ============================================================
--
-- REMOVE BEFORE BETA — see docs/ALPHA_REMOVAL_CHECKLIST.md.
-- Drops to execute at beta: DROP TABLE impersonation_log;
-- ALTER TABLE users DROP COLUMN is_test_user; and the 5 triggers
-- + 1 trigger function below.
--
-- Why: admins need to switch session identity to any seed or
-- spawned test user to validate multi-user flows without logging
-- out. Real users in the DB are NEVER impersonable. The flag +
-- triggers here enforce that test users can't interact with real
-- users across the tables where a cross-contaminated vouch or
-- message would pollute real trust data.
-- ============================================================

-- 1. Flag column on users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_test_user BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_is_test_user
  ON users(is_test_user) WHERE is_test_user = true;

-- 2. Generic helper: raise if exactly one of two users is a test user
-- and the other is real. Returns quietly if both are test, both are
-- real, or either user_id is NULL (nullable FK columns like
-- messages.sender_id handle soft-deleted users).
CREATE OR REPLACE FUNCTION check_test_real_isolation(
  user_a UUID,
  user_b UUID,
  table_label TEXT
) RETURNS VOID AS $$
DECLARE
  a_is_test BOOLEAN;
  b_is_test BOOLEAN;
BEGIN
  IF user_a IS NULL OR user_b IS NULL THEN
    RETURN;
  END IF;

  SELECT is_test_user INTO a_is_test FROM users WHERE id = user_a;
  SELECT is_test_user INTO b_is_test FROM users WHERE id = user_b;

  -- If either user row doesn't exist we let the existing FK
  -- constraint complain — not our job to duplicate that error.
  IF a_is_test IS NULL OR b_is_test IS NULL THEN
    RETURN;
  END IF;

  IF a_is_test <> b_is_test THEN
    RAISE EXCEPTION
      'Test/real user isolation violated on %: test users cannot interact with real users (% and %)',
      table_label, user_a, user_b;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Per-table trigger functions (thin wrappers around the helper).
-- We keep one per table so DROP TRIGGER is unambiguous at removal.

CREATE OR REPLACE FUNCTION trg_isolation_vouches() RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_test_real_isolation(NEW.voucher_id, NEW.vouchee_id, 'vouches');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_isolation_message_threads() RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_test_real_isolation(NEW.guest_id, NEW.host_id, 'message_threads');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_isolation_contact_requests() RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_test_real_isolation(NEW.guest_id, NEW.host_id, 'contact_requests');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_isolation_stay_confirmations() RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_test_real_isolation(NEW.guest_id, NEW.host_id, 'stay_confirmations');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_isolation_incidents() RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_test_real_isolation(NEW.reporter_id, NEW.reported_user_id, 'incidents');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach triggers. Drop-then-create so rerunning the migration
-- picks up any function signature changes.
DROP TRIGGER IF EXISTS vouches_test_real_isolation ON vouches;
CREATE TRIGGER vouches_test_real_isolation
  BEFORE INSERT OR UPDATE ON vouches
  FOR EACH ROW EXECUTE FUNCTION trg_isolation_vouches();

DROP TRIGGER IF EXISTS message_threads_test_real_isolation ON message_threads;
CREATE TRIGGER message_threads_test_real_isolation
  BEFORE INSERT OR UPDATE ON message_threads
  FOR EACH ROW EXECUTE FUNCTION trg_isolation_message_threads();

DROP TRIGGER IF EXISTS contact_requests_test_real_isolation ON contact_requests;
CREATE TRIGGER contact_requests_test_real_isolation
  BEFORE INSERT OR UPDATE ON contact_requests
  FOR EACH ROW EXECUTE FUNCTION trg_isolation_contact_requests();

DROP TRIGGER IF EXISTS stay_confirmations_test_real_isolation ON stay_confirmations;
CREATE TRIGGER stay_confirmations_test_real_isolation
  BEFORE INSERT OR UPDATE ON stay_confirmations
  FOR EACH ROW EXECUTE FUNCTION trg_isolation_stay_confirmations();

DROP TRIGGER IF EXISTS incidents_test_real_isolation ON incidents;
CREATE TRIGGER incidents_test_real_isolation
  BEFORE INSERT OR UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION trg_isolation_incidents();

-- 5. Audit log — every impersonation start/stop + every spawn.
CREATE TABLE IF NOT EXISTS impersonation_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id         TEXT NOT NULL,
  impersonated_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at              TIMESTAMPTZ,
  ip_address            TEXT,
  user_agent            TEXT,
  actions_count         INTEGER DEFAULT 0,
  action_type           TEXT NOT NULL DEFAULT 'impersonate'
);

CREATE INDEX IF NOT EXISTS idx_impersonation_log_admin
  ON impersonation_log(admin_user_id);

-- Partial index on active sessions — lets us quickly find "is there
-- currently a live impersonation for admin X" without scanning.
CREATE INDEX IF NOT EXISTS idx_impersonation_log_active
  ON impersonation_log(ended_at) WHERE ended_at IS NULL;

-- 6. Backfill existing seed users as is_test_user = true.
-- Matches the two seed-generated email domains used across the
-- repo: `@seed.1db` (seed-trust-data.ts) and `@hostgraph-seed.1db`
-- (seed-host-graph.ts). Real users (gmail, icloud, etc.) are
-- untouched. Safe to re-run — UPDATE is idempotent on flag.
UPDATE users
SET is_test_user = true
WHERE is_test_user = false
  AND (
    email LIKE '%@seed.1db'
    OR email LIKE '%@hostgraph-seed.1db'
  );

DO $$
DECLARE
  test_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO test_count FROM users WHERE is_test_user = true;
  RAISE NOTICE 'is_test_user backfill complete — % users flagged', test_count;
END $$;
