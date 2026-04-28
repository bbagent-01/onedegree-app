-- Migration 007: Messaging inbox (CC-B6a)
-- Adds message_threads and messages tables for in-app messaging.
-- One thread per (listing_id, guest_id) — host is derived from the listing.
-- Threads can optionally link to the originating contact_request.

-- ============================================================================
-- 1. message_threads
-- ============================================================================
CREATE TABLE IF NOT EXISTS message_threads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id          UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  guest_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  host_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_request_id  UUID REFERENCES contact_requests(id) ON DELETE SET NULL,
  last_message_at     TIMESTAMPTZ DEFAULT now(),
  last_message_preview TEXT,
  guest_unread_count  INTEGER NOT NULL DEFAULT 0,
  host_unread_count   INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT message_threads_unique_per_pair UNIQUE (listing_id, guest_id)
);

CREATE INDEX IF NOT EXISTS idx_message_threads_guest ON message_threads(guest_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_threads_host ON message_threads(host_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_threads_listing ON message_threads(listing_id);

-- ============================================================================
-- 2. messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  content     TEXT NOT NULL,
  is_system   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- ============================================================================
-- 3. RLS — enable but stay permissive (server uses service role; this is a
--    safety net for any future browser-side reads).
-- ============================================================================
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'message_threads_select_participants'
  ) THEN
    CREATE POLICY message_threads_select_participants
      ON message_threads FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'messages_select_thread'
  ) THEN
    CREATE POLICY messages_select_thread
      ON messages FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- ============================================================================
-- 4. Realtime — broadcast inserts to subscribers
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE message_threads;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ============================================================================
-- 5. Trigger — keep last_message_at / last_message_preview / unread counts
--    in sync whenever a message is inserted.
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_messages_after_insert() RETURNS TRIGGER AS $$
DECLARE
  v_guest UUID;
  v_host UUID;
BEGIN
  SELECT guest_id, host_id INTO v_guest, v_host
  FROM message_threads WHERE id = NEW.thread_id;

  UPDATE message_threads
  SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 140),
    updated_at = NEW.created_at,
    guest_unread_count = CASE
      WHEN NEW.is_system THEN guest_unread_count + 1
      WHEN NEW.sender_id = v_guest THEN guest_unread_count
      ELSE guest_unread_count + 1
    END,
    host_unread_count = CASE
      WHEN NEW.is_system THEN host_unread_count + 1
      WHEN NEW.sender_id = v_host THEN host_unread_count
      ELSE host_unread_count + 1
    END
  WHERE id = NEW.thread_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_messages_after_insert ON messages;
CREATE TRIGGER trg_messages_after_insert
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION fn_messages_after_insert();
