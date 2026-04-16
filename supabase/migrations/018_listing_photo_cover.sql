-- CC-C3 polish: split cover photo from preview photos.
-- Previously is_preview was overloaded (cover + preview gallery). Now:
--   is_cover   = single photo used as the main thumbnail / hero image
--   is_preview = multi-select, which photos appear in preview mode
-- Copy the existing single is_preview flag to is_cover so nothing regresses,
-- and keep the same photos marked is_preview (cover defaults to in-preview).

ALTER TABLE listing_photos ADD COLUMN IF NOT EXISTS is_cover BOOLEAN DEFAULT false;

UPDATE listing_photos SET is_cover = true WHERE is_preview = true AND is_cover IS DISTINCT FROM true;

CREATE INDEX IF NOT EXISTS idx_listing_photos_cover ON listing_photos (listing_id, is_cover) WHERE is_cover = true;
