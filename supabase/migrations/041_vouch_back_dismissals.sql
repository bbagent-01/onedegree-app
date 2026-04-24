-- Migration 041 — Vouch-back dismissals + close-the-loop notifications
--
-- S8 introduces a "People who vouched for you" section on /dashboard's
-- Network tab. Viewers can either vouch back (re-opens VouchModal, no
-- asymmetric tier leak) or click "Not yet" to dismiss the row for 30
-- days. Dismissals are a soft no — the row resurfaces automatically.
-- When a viewer DOES vouch back, we also log a close-the-loop event so
-- the original voucher sees a "they vouched you back" toast on next
-- page load. Neither table is surfaced publicly.
--
-- Track B keeps messaging/booking rows behind the service-role admin
-- client and enforces auth in API handlers, but vouches + related
-- per-user state already live under RLS. These two tables follow the
-- RLS convention because they're user-scoped ownership rows.
--
-- Tables:
--   1. vouch_back_dismissals   — (user_id, voucher_id) pair marks an
--      incoming vouch as hidden until expires_at. Unique pair: one
--      active dismissal per relationship.
--   2. vouch_back_notifications — close-the-loop event for A when B
--      vouches A back. Read via delivered_at: NULL = unseen, timestamp
--      = user has seen the toast.

-- ──────────────────────────────────────────────────────────────
-- 1. vouch_back_dismissals
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vouch_back_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  voucher_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT vouch_back_dismissals_pair_uniq UNIQUE (user_id, voucher_id),
  CONSTRAINT vouch_back_dismissals_self_check CHECK (user_id <> voucher_id)
);

-- Hot path: "for this viewer, which dismissals are still active?"
CREATE INDEX IF NOT EXISTS idx_vouch_back_dismissals_user_expires
  ON vouch_back_dismissals(user_id, expires_at);

ALTER TABLE vouch_back_dismissals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'vouch_back_dismissals_select_own'
      AND tablename = 'vouch_back_dismissals'
  ) THEN
    CREATE POLICY vouch_back_dismissals_select_own
      ON vouch_back_dismissals FOR SELECT TO authenticated
      USING (
        user_id IN (
          SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'vouch_back_dismissals_insert_own'
      AND tablename = 'vouch_back_dismissals'
  ) THEN
    CREATE POLICY vouch_back_dismissals_insert_own
      ON vouch_back_dismissals FOR INSERT TO authenticated
      WITH CHECK (
        user_id IN (
          SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'vouch_back_dismissals_delete_own'
      AND tablename = 'vouch_back_dismissals'
  ) THEN
    CREATE POLICY vouch_back_dismissals_delete_own
      ON vouch_back_dismissals FOR DELETE TO authenticated
      USING (
        user_id IN (
          SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
        )
      );
  END IF;
END $$;

COMMENT ON TABLE vouch_back_dismissals IS
  'User has said "not yet" to vouching someone back. Row expires after 30 days, after which the row resurfaces in the /dashboard network vouch-back section.';

-- ──────────────────────────────────────────────────────────────
-- 2. vouch_back_notifications
-- ──────────────────────────────────────────────────────────────
-- Close-the-loop event: B vouched A; A vouched B back. The row is
-- written to user_id=A (the original voucher) so A can be notified.
-- delivered_at NULL until the toast has been shown once; API route
-- marks delivered_at=now() after surfacing.
CREATE TABLE IF NOT EXISTS vouch_back_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vouched_back_by_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  CONSTRAINT vouch_back_notifications_self_check
    CHECK (user_id <> vouched_back_by_id)
);

-- Hot path: "for this viewer, any undelivered notifications?"
CREATE INDEX IF NOT EXISTS idx_vouch_back_notifications_user_undelivered
  ON vouch_back_notifications(user_id, delivered_at)
  WHERE delivered_at IS NULL;

ALTER TABLE vouch_back_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'vouch_back_notifications_select_own'
      AND tablename = 'vouch_back_notifications'
  ) THEN
    CREATE POLICY vouch_back_notifications_select_own
      ON vouch_back_notifications FOR SELECT TO authenticated
      USING (
        user_id IN (
          SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'vouch_back_notifications_update_own'
      AND tablename = 'vouch_back_notifications'
  ) THEN
    CREATE POLICY vouch_back_notifications_update_own
      ON vouch_back_notifications FOR UPDATE TO authenticated
      USING (
        user_id IN (
          SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
        )
      );
  END IF;
END $$;

COMMENT ON TABLE vouch_back_notifications IS
  'One row per close-the-loop event (B vouched A back). Surfaced as a toast on A''s next page load, marked delivered_at on show.';
