-- Migration 038 — Decline tracking for terms + reservation
--
-- Adds two columns to contact_requests to distinguish a post-accept
-- decline (either party declines during the terms/offer phase) from
-- the pending-stage host-decline that was already supported.
--
-- The existing status enum stays as-is (pending / accepted / declined
-- / cancelled). When either side declines at the terms stage we flip
-- status to 'cancelled' so the hosting dashboard's cancelled bucket
-- still surfaces these rows; the new columns carry the who + when so
-- the thread card and timeline can render the distinct "declined the
-- terms" vs "host declined the request" states.

ALTER TABLE contact_requests
  ADD COLUMN IF NOT EXISTS terms_declined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_declined_by TEXT
    CHECK (terms_declined_by IN ('guest', 'host'));

-- Optional private reason the declining party noted for themselves.
-- Not surfaced to the counterparty — purely for the declining user's
-- own record. Null when no reason was provided.
ALTER TABLE contact_requests
  ADD COLUMN IF NOT EXISTS terms_decline_reason TEXT;
