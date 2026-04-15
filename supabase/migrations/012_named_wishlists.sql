-- ============================================================
-- Migration 012: Named wishlists
-- Session: CC-B6c follow-up
-- Date: 2026-04-15
-- Idempotent: safe to re-run
-- ============================================================
--
-- Promotes the flat saved_listings join table into Airbnb-style
-- named wishlists: a user can have many wishlists, each with a name
-- and a collection of listings. The same listing can live in more
-- than one wishlist.
-- ============================================================

-- ------------------------------------------------------------
-- wishlists — one named collection per (user_id, name)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wishlists (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wishlists_user_idx
  ON wishlists (user_id, created_at DESC);

-- A user can only have one default wishlist at a time.
DO $$ BEGIN
  CREATE UNIQUE INDEX wishlists_one_default_per_user
    ON wishlists (user_id) WHERE is_default = true;
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY wishlists_read_all ON wishlists FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------
-- saved_listings — add wishlist_id, backfill defaults, re-key
-- ------------------------------------------------------------
ALTER TABLE saved_listings
  ADD COLUMN IF NOT EXISTS wishlist_id UUID REFERENCES wishlists(id) ON DELETE CASCADE;

-- For any user with existing saved_listings rows but no wishlist,
-- create a default "Saved" wishlist and assign those rows to it.
DO $$
DECLARE
  u_id    UUID;
  w_id    UUID;
BEGIN
  FOR u_id IN
    SELECT DISTINCT sl.user_id
    FROM saved_listings sl
    WHERE sl.wishlist_id IS NULL
  LOOP
    -- Reuse an existing default list if one happens to already exist.
    SELECT id INTO w_id
    FROM wishlists
    WHERE user_id = u_id AND is_default = true
    LIMIT 1;

    IF w_id IS NULL THEN
      INSERT INTO wishlists (user_id, name, is_default)
      VALUES (u_id, 'Saved', true)
      RETURNING id INTO w_id;
    END IF;

    UPDATE saved_listings
    SET wishlist_id = w_id
    WHERE user_id = u_id AND wishlist_id IS NULL;
  END LOOP;
END $$;

-- Now lock the column NOT NULL (only safe after backfill).
DO $$ BEGIN
  ALTER TABLE saved_listings ALTER COLUMN wishlist_id SET NOT NULL;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'saved_listings.wishlist_id NOT NULL skipped — backfill first';
END $$;

-- Swap the primary key from (user_id, listing_id) to
-- (wishlist_id, listing_id) so the same listing can live in
-- multiple wishlists.
DO $$ BEGIN
  ALTER TABLE saved_listings DROP CONSTRAINT saved_listings_pkey;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE saved_listings
    ADD CONSTRAINT saved_listings_pkey
    PRIMARY KEY (wishlist_id, listing_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- Helpful index for "which wishlists contain this listing for this user"
CREATE INDEX IF NOT EXISTS saved_listings_user_idx
  ON saved_listings (user_id, listing_id);
