-- Migration 044 — origin proposal on message_threads (S9d).
--
-- Bridges the proposal feed (Trip Wishes / Host Offers) into the
-- existing thread + S7 terms flow. When a guest or host clicks
-- "Message [name]" from /proposals/[id], the resulting thread carries
-- the originating proposal id forward so the inbox surface can:
--
--   1. Render a compact "From [Trip Wish: title] →" card at the top
--      of the thread (origin-proposal-card.tsx).
--   2. Light up the right-side action button:
--        - TW + viewer is the host  → "Send stay terms"
--          (opens host-listing-picker → from-proposal endpoint that
--           prefills a contact_request from the TW).
--        - HO + viewer is the guest → "Request these terms"
--          (one-tap from-proposal endpoint; HO already pins the
--           listing, so no picker needed).
--
-- Additive only:
--   - Column is nullable; legacy threads keep null and behave as
--     before (no card, no action button).
--   - ON DELETE SET NULL — if a proposal is deleted, the thread
--     stays alive and the card flips to a "no longer available"
--     fallback so the conversation isn't orphaned.
--   - Index is partial (WHERE origin_proposal_id IS NOT NULL) since
--     the vast majority of threads will have null here. Keeps the
--     index small and inserts cheap on legacy paths.
--
-- RLS unchanged: thread participants already control visibility via
-- existing policies on message_threads, and the column carries no
-- access control of its own.

ALTER TABLE message_threads
  ADD COLUMN IF NOT EXISTS origin_proposal_id uuid
    REFERENCES proposals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_message_threads_origin_proposal_id
  ON message_threads (origin_proposal_id)
  WHERE origin_proposal_id IS NOT NULL;
