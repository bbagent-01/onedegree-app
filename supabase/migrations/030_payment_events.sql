-- ============================================================
-- Migration 030: payment_events (per-reservation scheduled payments)
-- Session: Booking-flow v2 Chunk 4.75 (thread-as-timeline)
-- Date: 2026-04-21
-- Idempotent: safe to re-run
-- ============================================================
--
-- Why: the host's cancellation_policy.payment_schedule describes
-- the *plan* for collecting payment (50% 5 days out, 50% at
-- check-in). That's enough to render a read-only cards, but the
-- thread-as-timeline pattern needs concrete per-payment rows so
-- we can:
--   1. post a `payment_due` message when the due_at window opens
--   2. record the guest claiming they paid + host confirming
--   3. drive per-payment stages on TripTimeline
--
-- Payment is still off-platform — these rows are just a shared
-- ledger so both sides (and the thread card UI) agree on what's
-- outstanding.
--
-- One row per entry in the snapshotted payment_schedule, created
-- when the guest accepts terms. Percentage amounts resolve to
-- cents from contact_requests.total_estimate at creation time, so
-- a later edit to the reservation total doesn't silently rewrite
-- money already being tracked.
--
-- Status machine:
--   scheduled  — cron hasn't posted the due card yet, or it has
--                but the guest hasn't marked paid
--   claimed    — guest clicked "Mark as paid"
--   confirmed  — host clicked "Confirm received"
--   waived     — host forgave the payment
--   refunded   — (post-stay) host returned the money
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_request_id UUID NOT NULL
    REFERENCES contact_requests(id) ON DELETE CASCADE,
  schedule_index INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  due_at DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','claimed','confirmed','waived','refunded')),
  method TEXT,
  claimed_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contact_request_id, schedule_index)
);

COMMENT ON TABLE payment_events IS
  'Per-reservation scheduled payment rows. One row per entry in the snapshotted cancellation_policy.payment_schedule at accept-terms time. Booking-flow v2 Chunk 4.75.';
COMMENT ON COLUMN payment_events.schedule_index IS
  'Ordinal position in the snapshotted payment_schedule (0-based). Lets the UI render "Payment 1 of N".';
COMMENT ON COLUMN payment_events.amount_cents IS
  'Resolved amount at creation time — percentage entries multiply against contact_requests.total_estimate * 100.';
COMMENT ON COLUMN payment_events.due_at IS
  'Computed from schedule entry due_at kind — booking → accept date, days_before_checkin → check_in - N, check_in → check_in.';
COMMENT ON COLUMN payment_events.status IS
  'scheduled → claimed (guest mark-paid) → confirmed (host confirm-received). waived/refunded are terminal overrides.';

CREATE INDEX IF NOT EXISTS idx_payment_events_contact_request
  ON payment_events(contact_request_id);

-- Cron lookup: find scheduled events whose window has opened.
CREATE INDEX IF NOT EXISTS idx_payment_events_due_open
  ON payment_events(due_at)
  WHERE status = 'scheduled';

-- Keep updated_at fresh so future admin tooling can tell when a
-- row last moved.
CREATE OR REPLACE FUNCTION payment_events_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_events_updated_at ON payment_events;
CREATE TRIGGER trg_payment_events_updated_at
  BEFORE UPDATE ON payment_events
  FOR EACH ROW EXECUTE FUNCTION payment_events_touch_updated_at();

DO $$
DECLARE
  n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n FROM payment_events;
  RAISE NOTICE 'payment_events row count: %', n;
END $$;
