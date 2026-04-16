-- CC-C3: Listing visibility system
-- Adds visibility_mode, preview_description, and access_settings columns
-- to the listings table to support the preview/full/hidden view layers.

-- visibility_mode: public | preview_gated (default) | hidden
ALTER TABLE listings ADD COLUMN IF NOT EXISTS visibility_mode TEXT DEFAULT 'preview_gated'
  CHECK (visibility_mode IN ('public', 'preview_gated', 'hidden'));

-- preview_description: host-written short description for preview mode (200 char limit)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS preview_description TEXT;

-- access_settings: JSONB with per-action access rules
-- Structure: { see_preview, see_full, request_book, message, request_intro, view_host_profile }
-- Each rule: { type: "anyone"|"min_score"|"max_degrees"|"specific_people", threshold?: number, user_ids?: uuid[] }
ALTER TABLE listings ADD COLUMN IF NOT EXISTS access_settings JSONB;

-- Index for filtering hidden listings out of browse queries
CREATE INDEX IF NOT EXISTS idx_listings_visibility_mode ON listings (visibility_mode);
