-- 034_listingless_dm_threads.sql
--
-- Allow direct-messaging threads that aren't tied to a listing.
--
-- Until now, every message_threads row required a listing_id (NOT NULL
-- FK from migration 007). Profile "Contact" buttons, connector DMs from
-- the IntroRequestCard, and any future person-to-person messaging had
-- nowhere to land because the schema insisted on a listing context.
--
-- Changes:
--   1. listing_id becomes nullable.
--   2. New partial unique index on (guest_id, host_id) WHERE
--      listing_id IS NULL so two users can't accidentally open two
--      parallel listing-less threads. Callers MUST canonicalize the
--      pair before insert (lower uuid → guest_id, higher → host_id).
--   3. Old unique constraint on (listing_id, guest_id) stays — it
--      ignores NULL listing_id rows (Postgres null != null), so the
--      listing-scoped uniqueness is unaffected.

ALTER TABLE message_threads
  ALTER COLUMN listing_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS message_threads_dm_pair_uniq
  ON message_threads(guest_id, host_id)
  WHERE listing_id IS NULL;
