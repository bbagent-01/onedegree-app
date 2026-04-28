-- Migration 042 — proposal thumbnails + Unsplash cache (S9c).
--
-- Additive:
--   * proposals.thumbnail_url + thumbnail_source columns
--   * unsplash_cache table for 30-day server-side caching of search results
--
-- Trip Wishes get an auto-fetched destination photo from Unsplash. Hosts
-- can change to one of N alternatives or upload their own. Source flag
-- preserves attribution requirements (Unsplash usage guidelines require
-- showing photographer credit on auto-picked photos).
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS, etc.

-- ── 1. proposals: thumbnail columns ──────────────────────────────────

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_source text;

-- Drop+recreate the check so reruns pick up new enum members cleanly.
ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_thumbnail_source_check;
ALTER TABLE proposals
  ADD CONSTRAINT proposals_thumbnail_source_check
  CHECK (
    thumbnail_source IS NULL
    OR thumbnail_source IN (
      'unsplash_auto',
      'unsplash_picked',
      'user_upload'
    )
  );

-- ── 2. unsplash_cache: query→response, 30-day TTL ────────────────────

CREATE TABLE IF NOT EXISTS unsplash_cache (
  query_hash text PRIMARY KEY,
  query text NOT NULL,
  response jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS unsplash_cache_fetched_at_idx
  ON unsplash_cache (fetched_at);

-- Service role only — the client never reads this table directly. RLS
-- on but no policies = locked down to admin context.
ALTER TABLE unsplash_cache ENABLE ROW LEVEL SECURITY;
