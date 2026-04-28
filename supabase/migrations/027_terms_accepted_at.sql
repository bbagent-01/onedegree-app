-- ============================================================
-- Migration 027: Guest acceptance of cancellation terms
-- Session: Booking-flow v2 Chunk 4 follow-up
-- Date: 2026-04-21
-- Idempotent: safe to re-run
-- ============================================================
--
-- Why: once a host approves a request, the cancellation snapshot
-- is locked to the reservation. We want the guest to explicitly
-- acknowledge those terms before the booking feels "real". This
-- timestamp answers two questions: did the guest see the terms,
-- and when. Null means "approved but guest hasn't acknowledged".
--
-- This is expectation-setting UX — not a legal gate. The platform
-- never custodies funds or enforces contracts. But having the
-- acknowledgement tracked means host + guest both have a shared
-- understanding of when the terms were accepted.
-- ============================================================

ALTER TABLE contact_requests
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

COMMENT ON COLUMN contact_requests.terms_accepted_at IS
  'When the guest checked "I accept these terms" after host approval. Null = not yet acknowledged. Booking-flow v2 Chunk 4.';

DO $$
DECLARE
  n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n
  FROM information_schema.columns
  WHERE table_name = 'contact_requests' AND column_name = 'terms_accepted_at';
  RAISE NOTICE 'contact_requests.terms_accepted_at present: %', n;
END $$;
