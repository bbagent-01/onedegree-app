-- Migration 045 — Listing schema forward-look (S10.5)
--
-- Promotes wizard fields out of the description meta-blob into real
-- columns, adds new product fields (tags, stay_style, service_discounts,
-- accessibility, structured pet/children policy, instructions/manual),
-- splits the preview-content toggles out of access_settings into a
-- dedicated `preview_settings` column, and corrects the
-- `access_settings` column DEFAULT to the post-mig-020 4-key shape.
--
-- ADDITIVE ONLY. No drops. No type changes on existing columns.
-- The S10.4 audit surfaced ~10 drop candidates (price_per_night,
-- address text, preview_photos, legacy access columns, …); those are
-- DEFERRED to a cleanup migration after Alpha 0 ships.
--
-- Tag vocab is locked at ~45 slugs. Validated app-side, NOT by a DB
-- CHECK — adding a new tag should not require a migration.
--
-- RLS: no new policies. The new columns are public attributes that
-- inherit existing listing visibility (visibility_mode + access_settings).
-- They do not introduce new authority.
--
-- Idempotent: every ALTER uses IF NOT EXISTS / DROP-and-readd.

-- ============================================================
-- 1. Promoted-from-meta scalar columns
-- ============================================================
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS place_kind TEXT,
  ADD COLUMN IF NOT EXISTS property_label TEXT,
  ADD COLUMN IF NOT EXISTS max_guests INTEGER,
  ADD COLUMN IF NOT EXISTS bedrooms INTEGER,
  ADD COLUMN IF NOT EXISTS beds INTEGER,
  ADD COLUMN IF NOT EXISTS bathrooms NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS lat NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS lng NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS weekly_discount_pct INTEGER,
  ADD COLUMN IF NOT EXISTS monthly_discount_pct INTEGER,
  ADD COLUMN IF NOT EXISTS extended_overview TEXT,
  ADD COLUMN IF NOT EXISTS guest_access_text TEXT,
  ADD COLUMN IF NOT EXISTS interaction_text TEXT,
  ADD COLUMN IF NOT EXISTS other_details_text TEXT;

-- ============================================================
-- 2. New product fields
-- ============================================================
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS stay_style TEXT,
  ADD COLUMN IF NOT EXISTS service_discounts JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS checkin_instructions TEXT,
  ADD COLUMN IF NOT EXISTS checkout_instructions TEXT,
  ADD COLUMN IF NOT EXISTS house_manual TEXT,
  ADD COLUMN IF NOT EXISTS pets_allowed BOOLEAN,
  ADD COLUMN IF NOT EXISTS children_allowed BOOLEAN,
  ADD COLUMN IF NOT EXISTS pets_on_property BOOLEAN,
  ADD COLUMN IF NOT EXISTS accessibility_features TEXT[] NOT NULL DEFAULT '{}';

-- ============================================================
-- 3. House-rules booleans (promoted from house_rules text blob)
--    custom_rules text continues to live in `house_rules` (unchanged).
-- ============================================================
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS no_smoking BOOLEAN,
  ADD COLUMN IF NOT EXISTS no_parties BOOLEAN,
  ADD COLUMN IF NOT EXISTS quiet_hours BOOLEAN;

-- ============================================================
-- 4. Preview-settings split
--    Moves the per-section preview toggles out of
--    `access_settings.preview_content` into their own column.
--    `access_settings` keeps the WHO (gates), `preview_settings`
--    is the WHAT (which fields show in preview mode).
-- ============================================================
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS preview_settings JSONB NOT NULL DEFAULT
  '{
    "show_title": true,
    "show_price_range": true,
    "show_description": true,
    "show_host_first_name": true,
    "show_profile_photo": true,
    "show_neighborhood": true,
    "show_map_area": true,
    "show_rating": true,
    "show_amenities": true,
    "show_bed_counts": true,
    "show_house_rules": true,
    "use_preview_specific_description": false
  }'::jsonb;

-- ============================================================
-- 5. CHECK constraints (idempotent — drop then add)
-- ============================================================
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_place_kind_check;
ALTER TABLE listings ADD CONSTRAINT listings_place_kind_check
  CHECK (place_kind IS NULL OR place_kind IN ('entire','private','shared'));

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_property_label_check;
ALTER TABLE listings ADD CONSTRAINT listings_property_label_check
  CHECK (property_label IS NULL OR property_label IN
    ('house','apartment','condo','townhouse','cabin','loft','other'));

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_max_guests_check;
ALTER TABLE listings ADD CONSTRAINT listings_max_guests_check
  CHECK (max_guests IS NULL OR max_guests >= 1);

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_bedrooms_check;
ALTER TABLE listings ADD CONSTRAINT listings_bedrooms_check
  CHECK (bedrooms IS NULL OR bedrooms >= 0);

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_beds_check;
ALTER TABLE listings ADD CONSTRAINT listings_beds_check
  CHECK (beds IS NULL OR beds >= 0);

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_bathrooms_check;
ALTER TABLE listings ADD CONSTRAINT listings_bathrooms_check
  CHECK (bathrooms IS NULL OR bathrooms >= 0);

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_weekly_discount_pct_check;
ALTER TABLE listings ADD CONSTRAINT listings_weekly_discount_pct_check
  CHECK (weekly_discount_pct IS NULL OR (weekly_discount_pct BETWEEN 0 AND 99));

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_monthly_discount_pct_check;
ALTER TABLE listings ADD CONSTRAINT listings_monthly_discount_pct_check
  CHECK (monthly_discount_pct IS NULL OR (monthly_discount_pct BETWEEN 0 AND 99));

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_stay_style_check;
ALTER TABLE listings ADD CONSTRAINT listings_stay_style_check
  CHECK (stay_style IS NULL OR stay_style IN
    ('vacation_rental','lived_in_home','partial_prep'));

-- ============================================================
-- 6. Fix access_settings DEFAULT to the post-mig-020 4-key shape
--    MINUS preview_content (which now lives in preview_settings).
--    The pre-mig-019 6-key default was never aligned with the
--    runtime shape (S10.4 §7.1).
-- ============================================================
ALTER TABLE listings ALTER COLUMN access_settings SET DEFAULT
  '{
    "see_preview": {"type": "anyone"},
    "full_listing_contact": {"type": "min_score", "threshold": 15},
    "allow_intro_requests": true
  }'::jsonb;

-- ============================================================
-- 7. Indexes for likely browse-side filters
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_listings_max_guests
  ON listings (max_guests) WHERE max_guests IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listings_bedrooms
  ON listings (bedrooms) WHERE bedrooms IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listings_property_label
  ON listings (property_label) WHERE property_label IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listings_tags
  ON listings USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_listings_stay_style
  ON listings (stay_style) WHERE stay_style IS NOT NULL;
