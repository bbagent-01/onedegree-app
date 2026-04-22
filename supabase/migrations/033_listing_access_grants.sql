-- 033_listing_access_grants.sql
--
-- Alpha-C S2a · Intro request redesign.
--
-- The old connector-middleman intro flow is abandoned. New model:
-- intro_sender initiates → intro_recipient decides. No auto-pings to
-- intermediaries. On Accept, both parties get a bidirectional scoped
-- grant to see each other's full listings (only for that pair).
--
-- Spec called this Migration 032, but 032 is already taken by
-- incident_abuse_reports. Landing as 033.
--
-- This migration:
--   1. Adds listing_access_grants table (with RLS + indexes).
--   2. Adds intro_sender_id / intro_recipient_id / intro_status /
--      intro_message / intro_start_date / intro_end_date /
--      intro_decided_at columns on message_threads.
--   3. Leaves the old connector columns in place (intro_connector_id,
--      sender_anonymous, intro_promoted_at) — the code stops reading
--      them but the columns stick around for one release so stale
--      rows don't error. A follow-up migration can drop them.

-- ──────────────────────────────────────────────────────────────
-- 1. listing_access_grants — bidirectional, scoped per intro
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listing_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grantor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grantee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  intro_thread_id uuid NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  -- Free-text reason the recipient optionally typed when revoking.
  -- Shared across both rows of the pair (recipient-initiated action).
  revoked_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_access_grants_no_self CHECK (grantor_id <> grantee_id)
);

-- Only one active grant per directed pair. Revoked rows stay
-- (audit trail) but don't block a fresh grant from being inserted
-- after a future intro is accepted.
CREATE UNIQUE INDEX IF NOT EXISTS listing_access_grants_active_uniq
  ON listing_access_grants(grantor_id, grantee_id)
  WHERE revoked_at IS NULL;

-- Hot-path lookups: "does viewer V have an active grant from host H?"
-- and "show me all my active grants" on the settings page.
CREATE INDEX IF NOT EXISTS listing_access_grants_grantee_active
  ON listing_access_grants(grantee_id, revoked_at);
CREATE INDEX IF NOT EXISTS listing_access_grants_grantor_active
  ON listing_access_grants(grantor_id, revoked_at);
-- Lookup-by-thread for the revoke flow (flip both rows in one query).
CREATE INDEX IF NOT EXISTS listing_access_grants_thread
  ON listing_access_grants(intro_thread_id);

ALTER TABLE listing_access_grants ENABLE ROW LEVEL SECURITY;

-- Grantor or grantee can see the row. Both sides have a legitimate
-- read interest (grantee wants to know what they can see; grantor
-- wants a list of outstanding grants to potentially revoke).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'listing_access_grants_select_participants'
      AND tablename = 'listing_access_grants'
  ) THEN
    CREATE POLICY listing_access_grants_select_participants
      ON listing_access_grants FOR SELECT TO authenticated
      USING (
        grantor_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
        OR grantee_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
      );
  END IF;
END $$;

-- Only the grantor can insert a grant (the grantor is the one giving
-- access; grantee is receiving). Accept-flow writes the two rows via
-- the service role; this policy backstops direct-from-client writes.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'listing_access_grants_insert_grantor'
      AND tablename = 'listing_access_grants'
  ) THEN
    CREATE POLICY listing_access_grants_insert_grantor
      ON listing_access_grants FOR INSERT TO authenticated
      WITH CHECK (
        grantor_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
      );
  END IF;
END $$;

-- Only the grantor can revoke their own grant. The recipient-initiated
-- revoke flips both rows via the service role; the policy also allows
-- the grantor side (whichever user clicks revoke) to flip their row.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'listing_access_grants_update_grantor'
      AND tablename = 'listing_access_grants'
  ) THEN
    CREATE POLICY listing_access_grants_update_grantor
      ON listing_access_grants FOR UPDATE TO authenticated
      USING (
        grantor_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
      );
  END IF;
END $$;

-- Keep updated_at fresh on revokes.
CREATE OR REPLACE FUNCTION touch_listing_access_grants_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS listing_access_grants_touch_updated_at
  ON listing_access_grants;
CREATE TRIGGER listing_access_grants_touch_updated_at
  BEFORE UPDATE ON listing_access_grants
  FOR EACH ROW EXECUTE FUNCTION touch_listing_access_grants_updated_at();

-- ──────────────────────────────────────────────────────────────
-- 2. Intro request metadata on message_threads
-- ──────────────────────────────────────────────────────────────
-- The new model replaces the old guest/host + connector slots with
-- role-neutral sender/recipient. Either a guest or a host can be the
-- sender — the thread is the conversation between them. is_intro_request
-- (from migration 019) is reused as "this thread is an intro thread",
-- gating the Intros tab in the inbox.
ALTER TABLE message_threads
  ADD COLUMN IF NOT EXISTS intro_sender_id uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS intro_recipient_id uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS intro_status text
    CHECK (intro_status IN ('pending', 'accepted', 'declined', 'ignored')),
  -- Copy of the sender's original message. The messages table still
  -- holds the posted card + any free-text body, but keeping a direct
  -- handle on the thread row means the IntroRequestCard doesn't have
  -- to join messages to render.
  ADD COLUMN IF NOT EXISTS intro_message text,
  -- Optional non-binding date range the sender proposed.
  ADD COLUMN IF NOT EXISTS intro_start_date date,
  ADD COLUMN IF NOT EXISTS intro_end_date date,
  -- Set when intro_status transitions out of 'pending'. Powers the
  -- 30-day re-request block after a decline.
  ADD COLUMN IF NOT EXISTS intro_decided_at timestamptz;

-- Indexes:
--   recipient + pending → inbox Intros tab count + card render
--   sender + recipient + decided_at → 30-day re-request window check
CREATE INDEX IF NOT EXISTS idx_message_threads_intro_recipient_pending
  ON message_threads(intro_recipient_id)
  WHERE intro_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_message_threads_intro_pair_decided
  ON message_threads(intro_sender_id, intro_recipient_id, intro_decided_at)
  WHERE intro_status = 'declined';

-- Drop the old intro-request-and-not-promoted index; replace with a
-- more general one keyed off intro_status (the new source of truth).
DROP INDEX IF EXISTS idx_message_threads_intro;
CREATE INDEX IF NOT EXISTS idx_message_threads_intro_status
  ON message_threads(is_intro_request, intro_status)
  WHERE is_intro_request = true;
