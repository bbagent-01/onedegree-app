-- Show all of loren's listings with their access_settings payloads
-- so we can pick (or tune) one that forces the intro flow for a
-- 2° guest. The relevant keys inside access_settings are per-action
-- gates like request_book / request_intro / message / see_full.

SELECT
  l.id,
  l.title,
  l.visibility_mode,
  l.access_settings
FROM listings l
JOIN users u ON u.id = l.host_id
WHERE lower(u.name) LIKE 'loren%'
ORDER BY l.created_at DESC;
