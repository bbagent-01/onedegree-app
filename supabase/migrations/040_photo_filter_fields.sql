-- Migration 040: photo filter + AI-reserve fields (CC-C10a)
-- Tool 1 of photo-tools — client-side deterministic filter (Instagram-equivalent).
-- AI fields are reserved here but NOT wired; CC-C10b will light them up.

-- ============================================================
-- 1. COLUMNS on listing_photos
-- ============================================================

-- Filter fields (Tool 1 — CC-C10a)
ALTER TABLE listing_photos
  ADD COLUMN IF NOT EXISTS original_url TEXT,
  ADD COLUMN IF NOT EXISTS filter_preset TEXT,
  ADD COLUMN IF NOT EXISTS filter_settings JSONB;

-- AI fields (Tool 2 — CC-C10b, reserved)
ALTER TABLE listing_photos
  ADD COLUMN IF NOT EXISTS ai_enhanced BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS enhanced_url TEXT;

-- Preset must be one of the known values (or NULL for unfiltered).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'listing_photos_filter_preset_check'
  ) THEN
    ALTER TABLE listing_photos
      ADD CONSTRAINT listing_photos_filter_preset_check
      CHECK (filter_preset IS NULL OR filter_preset IN ('natural', 'bright_airy', 'warm', 'custom'));
  END IF;
END $$;

-- ============================================================
-- 2. RLS — photo owner can UPDATE filter fields
-- ============================================================
-- SELECT / INSERT policies from schema.sql are unchanged. Server code
-- uses the service-role client so this policy is belt-and-suspenders,
-- but it matches the spec and protects any future anon-key write path.

DROP POLICY IF EXISTS "Hosts can update own listing photo filter" ON listing_photos;
CREATE POLICY "Hosts can update own listing photo filter"
  ON listing_photos FOR UPDATE TO authenticated
  USING (
    listing_id IN (
      SELECT id FROM listings
      WHERE host_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
    )
  )
  WITH CHECK (
    listing_id IN (
      SELECT id FROM listings
      WHERE host_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
    )
  );
