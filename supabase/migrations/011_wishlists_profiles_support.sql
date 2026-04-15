-- ============================================================
-- Migration 011: Wishlists, profile fields, support requests
-- Session: CC-B6c
-- Date: 2026-04-15
-- Idempotent: safe to re-run
-- ============================================================

-- ------------------------------------------------------------
-- saved_listings — per-user wishlist / favorites join table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_listings (
  user_id    UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS saved_listings_user_idx
  ON saved_listings (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS saved_listings_listing_idx
  ON saved_listings (listing_id);

ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;

-- Permissive SELECT for authenticated users. Writes go through the
-- service role from Next.js API routes.
DO $$ BEGIN
  CREATE POLICY saved_listings_read_all ON saved_listings
    FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------
-- users — profile fields
-- ------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS location     TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS languages    TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS occupation   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

-- ------------------------------------------------------------
-- support_requests — Help Center contact form submissions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  name       TEXT,
  email      TEXT,
  category   TEXT NOT NULL,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_requests_status_idx
  ON support_requests (status, created_at DESC);

ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role reads/writes these rows.
