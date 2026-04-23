-- Migration 039 — Terms-offered edit tracking + guest "request edits" signal
--
-- S7 adds two adjacent capabilities on an offered-terms row:
--   1. Host can edit a pending (offered-but-not-yet-accepted) terms
--      card. Each edit bumps edit_count and stamps last_edited_at so
--      the timeline renders a TERMS_EDITED marker.
--   2. Guest can "request edits" without declining — the card stays
--      pending; edits_requested_at + edits_requested_by flag the
--      ask, and host edit clears that flag (closing the loop).
--
-- Neither adds a new status — status remains pending | accepted |
-- declined | cancelled. These columns are lifecycle metadata.
--
-- Track B uses service-role admin client + application-level auth
-- checks (not Postgres RLS policies) for messaging/booking rows.
-- Auth enforcement lives in the API route handlers:
--   - Host-only UPDATE on status='accepted', terms_accepted_at IS NULL
--     is enforced in PATCH /api/contact-requests/[id] (edit mode).
--   - Guest-only UPDATE of edits_requested_* on status='accepted',
--     terms_accepted_at IS NULL is enforced in
--     POST /api/contact-requests/[id]/request-edits.

ALTER TABLE contact_requests
  ADD COLUMN IF NOT EXISTS edits_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edits_requested_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edit_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN contact_requests.edits_requested_at IS
  'Set when guest clicked "Request Edits" on a pending terms card. Cleared when host edits (loop close).';
COMMENT ON COLUMN contact_requests.edits_requested_by IS
  'Which user requested edits (always the guest in current flow — keeping the column generic for Tier 2 counter-propose).';
COMMENT ON COLUMN contact_requests.last_edited_at IS
  'Timestamp of the most recent host edit on the offered-but-not-yet-accepted terms. NULL until first edit.';
COMMENT ON COLUMN contact_requests.edit_count IS
  'Number of times the host has edited pending offered terms. Feeds debug/telemetry and edit-badge counts.';
