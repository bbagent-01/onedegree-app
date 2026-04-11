-- Migration 002: Listings + Visibility System (CC-6c)
-- Aligns listings and listing_photos tables with CC-6c spec.

-- ============================================================
-- 1. UPDATE listings TABLE
-- ============================================================

-- Add new columns
ALTER TABLE listings ADD COLUMN IF NOT EXISTS property_type TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS price_min INTEGER;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS price_max INTEGER;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS availability_flexible BOOLEAN DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS specific_user_ids UUID[] DEFAULT '{}';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add CHECK constraint for property_type
ALTER TABLE listings ADD CONSTRAINT listings_property_type_check
  CHECK (property_type IN ('apartment','house','room','other'));

-- Migrate visibility values: old → new
UPDATE listings SET preview_visibility = 'anyone' WHERE preview_visibility = 'open';
UPDATE listings SET preview_visibility = 'vouched' WHERE preview_visibility = 'network';
UPDATE listings SET preview_visibility = 'trusted' WHERE preview_visibility = 'strong';
UPDATE listings SET preview_visibility = 'specific' WHERE preview_visibility = 'invite';

UPDATE listings SET full_visibility = 'anyone' WHERE full_visibility = 'open';
UPDATE listings SET full_visibility = 'vouched' WHERE full_visibility = 'network';
UPDATE listings SET full_visibility = 'trusted' WHERE full_visibility = 'strong';
UPDATE listings SET full_visibility = 'specific' WHERE full_visibility = 'invite';

-- Drop old CHECK constraints and add new ones
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_preview_visibility_check;
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_full_visibility_check;

ALTER TABLE listings ADD CONSTRAINT listings_preview_visibility_check
  CHECK (preview_visibility IN ('anyone','vouched','trusted','inner_circle','specific'));
ALTER TABLE listings ADD CONSTRAINT listings_full_visibility_check
  CHECK (full_visibility IN ('anyone','vouched','trusted','inner_circle','specific'));

-- Set new defaults
ALTER TABLE listings ALTER COLUMN preview_visibility SET DEFAULT 'anyone';
ALTER TABLE listings ALTER COLUMN full_visibility SET DEFAULT 'vouched';
ALTER TABLE listings ALTER COLUMN min_trust_score SET DEFAULT 0;

-- ============================================================
-- 2. UPDATE listing_photos TABLE
-- ============================================================

-- Add storage_path column (for Supabase Storage paths)
ALTER TABLE listing_photos ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Rename url → public_url if it exists as url
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listing_photos' AND column_name = 'url') THEN
    ALTER TABLE listing_photos RENAME COLUMN url TO public_url;
  END IF;
END $$;

-- ============================================================
-- 3. INDEX for visibility queries
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_listings_active ON listings(is_active) WHERE is_active = true;
