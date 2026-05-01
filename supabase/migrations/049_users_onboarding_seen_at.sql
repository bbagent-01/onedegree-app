-- 049_users_onboarding_seen_at.sql
--
-- B3 · Onboarding integration. Adds a single timestamp column that
-- gates the post-login onboarding takeover (5-slide intro from the
-- D1 sandbox at /sandbox/onboarding-2). Show-once: NULL = render
-- the takeover; non-NULL = skip forever.
--
-- Set by POST /api/onboarding/dismiss (Skip, Get-started, or any
-- other dismiss path). Service-role write scoped by clerk_id match
-- — no client direct write, no RLS policy change needed because
-- the column is admin-write / authed-user-read only.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_seen_at timestamptz;
