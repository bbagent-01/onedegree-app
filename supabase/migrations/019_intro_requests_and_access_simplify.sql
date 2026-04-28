-- 019_intro_requests_and_access_simplify.sql
--
-- Mid-session visibility model refactor.
--
-- 1. Split inbox — intro_promoted_at marks when a thread transitions
--    from anonymous Intro Request to a normal Message conversation.
--    NULL = still an intro request; NOT NULL = promoted.
--    is_intro_request is kept as a fast-lookup flag (denormalized).
--
-- 2. Collapse access_settings — we don't drop the legacy 6-action
--    columns yet (read-path normalization handles those), but every
--    row gets the new full_listing_contact rule + allow_intro_requests
--    flag derived from the strictest of its existing rules. No data
--    loss; rows written under the old schema keep working.

-- ──────────────────────────────────────────────────────────────
-- 1. Intro-request columns on message_threads
-- ──────────────────────────────────────────────────────────────
ALTER TABLE message_threads
  ADD COLUMN IF NOT EXISTS is_intro_request boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS intro_promoted_at timestamptz,
  -- When true, the sender's identity is hidden from the recipient
  -- until the recipient responds. Used for anonymous intro messages
  -- directly to a host (no mutual connector path available).
  ADD COLUMN IF NOT EXISTS sender_anonymous boolean NOT NULL DEFAULT false,
  -- Optional connector — populated when the thread is a forwarded
  -- intro request routed through a mutual connection of viewer+host.
  ADD COLUMN IF NOT EXISTS intro_connector_id uuid REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_message_threads_intro
  ON message_threads(is_intro_request, host_id)
  WHERE is_intro_request = true AND intro_promoted_at IS NULL;

-- ──────────────────────────────────────────────────────────────
-- 2. Backfill access_settings into the collapsed 2-gate model
-- ──────────────────────────────────────────────────────────────
-- Every legacy row gets:
--   full_listing_contact   = most-restrictive of (see_full, message, request_book)
--   allow_intro_requests   = true unless request_intro was an explicit no-one rule
--
-- We keep the old keys in place for backwards compatibility — the
-- normalizer in src/lib/trust/types.ts reads whichever shape is
-- present. A follow-up migration can drop them once every row is
-- confirmed migrated.
UPDATE listings
SET access_settings = jsonb_set(
  jsonb_set(
    coalesce(access_settings, '{}'::jsonb),
    '{full_listing_contact}',
    coalesce(
      -- Prefer an existing full_listing_contact (forward-compatible
      -- rows written by newer deploys).
      access_settings->'full_listing_contact',
      -- Otherwise pick the most restrictive of the legacy three.
      (
        SELECT rule
        FROM jsonb_array_elements(
          jsonb_build_array(
            access_settings->'see_full',
            access_settings->'message',
            access_settings->'request_book'
          )
        ) rule
        WHERE rule IS NOT NULL AND rule != 'null'::jsonb
        ORDER BY
          CASE rule->>'type'
            WHEN 'specific_people' THEN 9999
            WHEN 'min_score' THEN 1 + coalesce((rule->>'threshold')::int, 0)
            WHEN 'anyone' THEN 0
            ELSE 0
          END DESC
        LIMIT 1
      ),
      '{"type":"min_score","threshold":15}'::jsonb
    ),
    true
  ),
  '{allow_intro_requests}',
  to_jsonb(
    coalesce(
      -- Any explicit non-"no-one" value counts as allowed.
      (access_settings->'request_intro') IS NOT NULL
        AND NOT (
          access_settings->'request_intro'->>'type' = 'specific_people'
          AND coalesce(
            jsonb_array_length(access_settings->'request_intro'->'user_ids'),
            0
          ) = 0
        ),
      true
    )
  ),
  true
)
WHERE access_settings IS NOT NULL;
