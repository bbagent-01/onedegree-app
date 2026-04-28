-- Bump Hudson Valley Cabin's full-listing threshold so a 2° guest
-- with a ~31.5 path score (Amira Nasser via Elena Ruiz) falls
-- below the gate and has to use the intro flow. Leaves other
-- listings alone.

UPDATE listings
SET access_settings = jsonb_set(
  access_settings,
  '{full_listing_contact,threshold}',
  '40'::jsonb,
  true
)
WHERE id = 'ce6e5e2d-d539-41c5-8d21-c90fffdfecba';

-- Verify both Hudson Valley and West Village now gate Jules/Amira.
SELECT
  id,
  title,
  access_settings->'full_listing_contact' AS full_listing_contact
FROM listings
WHERE id IN (
  'ce6e5e2d-d539-41c5-8d21-c90fffdfecba',
  '3bdf6379-3e91-43af-a887-7f72a5ab566f'
);
