-- CC-C5 cleanup: drop legacy 6-action access_settings keys.
--
-- Migration 019 normalized the old `see_full`, `message`, `request_book`,
-- `request_intro`, `view_host_profile` keys into the collapsed 2-gate
-- model (`full_listing_contact`, `allow_intro_requests`) and left the
-- legacy keys in place as a rollback safety net. With every listing
-- now carrying `full_listing_contact` (audited pre-migration — all
-- 56 rows have the new key), the legacy keys are dead weight.
--
-- Safety: additive cleanup only on the JSONB column, no columns
-- dropped. Rollback for this migration re-derives the legacy keys
-- from `full_listing_contact`, which is good enough for the old
-- reader (all legacy keys collapsed to the same rule in normalize).

-- Backfill `allow_intro_requests` from legacy `request_intro` where it
-- wasn't already set — belt-and-suspenders before we drop the source.
UPDATE listings
SET access_settings = jsonb_set(
  access_settings,
  '{allow_intro_requests}',
  to_jsonb(
    COALESCE(
      (access_settings->'allow_intro_requests')::boolean,
      CASE
        WHEN access_settings->'request_intro'->>'type' = 'specific_people'
             AND jsonb_array_length(
               COALESCE(access_settings->'request_intro'->'user_ids', '[]'::jsonb)
             ) = 0
          THEN false
        ELSE true
      END
    )
  )
)
WHERE access_settings IS NOT NULL
  AND (access_settings->'allow_intro_requests') IS NULL;

-- Drop the legacy JSON keys across every listing row.
UPDATE listings
SET access_settings = access_settings
  - 'see_full'
  - 'message'
  - 'request_book'
  - 'request_intro'
  - 'view_host_profile'
WHERE access_settings IS NOT NULL
  AND (
       access_settings ? 'see_full'
    OR access_settings ? 'message'
    OR access_settings ? 'request_book'
    OR access_settings ? 'request_intro'
    OR access_settings ? 'view_host_profile'
  );

-- No DDL change — access_settings is a JSONB column and its shape is
-- enforced in application code (see src/lib/trust/types.ts).
