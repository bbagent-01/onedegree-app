-- 047_pending_vouches.sql
--
-- Alpha B1 · Invite + pre-vouch a friend (sender-sent SMS flow).
--
-- Distinct from `invites` (migration 003): this table backs the
-- $0-platform-cost flow where the sender uses their OWN messaging
-- app via the Web Share API. No Twilio send, no provider risk, no
-- email fallback. The sender fills the 3-step vouch form for a
-- not-yet-on-platform contact, gets a tokenized /join/<token> URL
-- with prefilled SMS text, and shares it themselves.
--
-- Why a separate table from `invites`:
--   - 30-day expiry (vs invites' 7-day) — sender-initiated reminders
--     don't have Twilio's STOP-list constraints, so a longer window
--     is safe and lets the recipient claim at their leisure.
--   - Per-sender cap of 20 active rows (enforced at the API layer)
--     to keep abuse + accidental loops bounded; invites had no cap
--     because Twilio's per-account billing was the natural throttle.
--   - Phone scrubbing on cancel/expire — recipient_phone is the only
--     PII on the row and we don't want it lingering after the row
--     stops being load-bearing.
--   - Multi-claim: a single phone can claim multiple pending_vouches
--     at sign-up (multiple senders pre-vouching the same person each
--     get their vouch landed). `invites` is one-to-one (claimed_by).
--
-- Two tables in this migration:
--   1. pending_vouches — the actual pre-vouch rows
--   2. mismatch_events — log when a recipient signs up with a
--      different phone than the sender targeted (deferred reconciliation)
--
-- ──────────────────────────────────────────────────────────────────
-- 1. pending_vouches
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pending_vouches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 2-80 chars enforced both at the API and via CHECK so direct
  -- service-role writes can't sneak past the cap.
  recipient_name text NOT NULL,
  -- Normalized E.164. Nullable because we scrub it (set NULL) on
  -- transition to 'canceled' or 'expired' — keep the audit trail
  -- of the row, drop the PII.
  recipient_phone text,
  vouch_type vouch_type_enum NOT NULL DEFAULT 'standard',
  years_known_bucket years_known_bucket_enum NOT NULL DEFAULT 'lt1',
  -- Sender's "I understand my vouch power can drop" acknowledgment.
  -- Stored for parity with the live vouch flow (see vouch-modal.tsx),
  -- not currently used downstream.
  rating_stake boolean NOT NULL DEFAULT false,
  -- ~32 chars URL-safe. API generates via crypto.randomBytes(24).toString('base64url').
  -- Keep DB default as a safety net if the API forgets to generate one.
  -- Use hex (URL-safe by definition) for the DB default since Postgres
  -- has no built-in base64url encoder. pgcrypto is already enabled
  -- (gen_random_bytes is used by the invites table — migration 003).
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'claimed', 'canceled', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  claimed_by uuid REFERENCES users(id),
  claimed_at timestamptz,

  CONSTRAINT pending_vouches_recipient_name_len
    CHECK (char_length(recipient_name) BETWEEN 2 AND 80),
  -- Phone presence ↔ status invariant. While 'pending' the phone
  -- must be present (we need it to match at signup time). After
  -- 'canceled' or 'expired' it must be NULL (privacy scrub). On
  -- 'claimed' we leave whatever's there at claim time alone.
  CONSTRAINT pending_vouches_phone_when_pending
    CHECK (
      (status = 'pending' AND recipient_phone IS NOT NULL)
      OR status <> 'pending'
    ),
  CONSTRAINT pending_vouches_phone_scrubbed_after_terminal
    CHECK (
      status NOT IN ('canceled', 'expired')
      OR recipient_phone IS NULL
    )
);

-- Hot lookups:
--   - by token, for /join/[token] and the cron sweep: covered by UNIQUE.
--   - per-sender pending count, for the cap check: (sender_id, status).
--   - by phone for webhook auto-claim. Partial index — we only ever
--     match on a non-null phone, and the bulk of the table over time
--     will be terminal rows with NULL phone (post-scrub).
CREATE INDEX IF NOT EXISTS idx_pending_vouches_sender_status
  ON pending_vouches(sender_id, status);
CREATE INDEX IF NOT EXISTS idx_pending_vouches_recipient_phone
  ON pending_vouches(recipient_phone)
  WHERE recipient_phone IS NOT NULL;
-- Cron sweep filter: pending + past expires_at. Small index, hot path.
CREATE INDEX IF NOT EXISTS idx_pending_vouches_sweep
  ON pending_vouches(expires_at)
  WHERE status = 'pending';

ALTER TABLE pending_vouches ENABLE ROW LEVEL SECURITY;

-- Sender can SELECT their own rows (the management UI at
-- /dashboard/pending-vouches reads via the service-role API, but the
-- policy means even direct REST hits stay scoped).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'pending_vouches_select_sender'
      AND tablename = 'pending_vouches'
  ) THEN
    CREATE POLICY pending_vouches_select_sender
      ON pending_vouches FOR SELECT TO authenticated
      USING (
        sender_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
      );
  END IF;
END $$;

-- Sender can UPDATE their own rows (cancel flow flips status +
-- scrubs phone via service role; this backstops direct REST).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'pending_vouches_update_sender'
      AND tablename = 'pending_vouches'
  ) THEN
    CREATE POLICY pending_vouches_update_sender
      ON pending_vouches FOR UPDATE TO authenticated
      USING (
        sender_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
      );
  END IF;
END $$;

-- Sender can INSERT rows where they are the sender (defense in depth;
-- the API enforces this too via effectiveAuth + sender lookup).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'pending_vouches_insert_sender'
      AND tablename = 'pending_vouches'
  ) THEN
    CREATE POLICY pending_vouches_insert_sender
      ON pending_vouches FOR INSERT TO authenticated
      WITH CHECK (
        sender_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
      );
  END IF;
END $$;

-- Recipient lookup-by-token is intentionally not a public RLS path:
-- /join/[token] reads via service role so we can return a friendly
-- "expired/used" card without leaking which phone the row was for.
-- No SELECT policy for anon/public.

-- ──────────────────────────────────────────────────────────────────
-- 2. mismatch_events — deferred reconciliation log
-- ──────────────────────────────────────────────────────────────────
-- When a recipient signs up with a different phone than the sender
-- targeted, we don't auto-claim (decision locked in B1 spec). We
-- log the event so a future reconciliation pass can offer the user
-- a "claim this pending vouch?" prompt. We deliberately do NOT
-- store the intended_phone (the number the sender targeted) in raw
-- form — only the last 4 — to limit the PII footprint of this log.
CREATE TABLE IF NOT EXISTS pending_vouch_mismatch_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pending_vouch_id uuid NOT NULL REFERENCES pending_vouches(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  signup_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Last 4 digits of the phone the sender targeted. Enough to help
  -- a human reconcile ("yes, that was my old number") without
  -- duplicating the full phone outside the pending_vouches row.
  intended_phone_last4 text,
  -- Full E.164 of the phone the recipient actually verified. This
  -- is already on the users row, so it's not new PII; we duplicate
  -- it here for query convenience.
  actual_phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_vouch_mismatch_events_signup_user
  ON pending_vouch_mismatch_events(signup_user_id);
CREATE INDEX IF NOT EXISTS idx_pending_vouch_mismatch_events_sender
  ON pending_vouch_mismatch_events(sender_id);

-- Service-role-only writes from the Clerk webhook. Service role
-- bypasses RLS, so we don't need an explicit insert policy. We do
-- want SELECT for the sender (so they could one day see "X signed
-- up but not on the phone you sent to") — gate on sender_id.
ALTER TABLE pending_vouch_mismatch_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'pending_vouch_mismatch_events_select_sender'
      AND tablename = 'pending_vouch_mismatch_events'
  ) THEN
    CREATE POLICY pending_vouch_mismatch_events_select_sender
      ON pending_vouch_mismatch_events FOR SELECT TO authenticated
      USING (
        sender_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
      );
  END IF;
END $$;
