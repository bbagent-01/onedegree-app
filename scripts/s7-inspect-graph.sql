-- Who is loren? Who are his 1° connections (both directions)?
-- And which users are NOT 1° to loren but have listings?

WITH loren AS (
  SELECT id FROM users WHERE lower(name) LIKE 'loren%' LIMIT 1
),
loren_outgoing AS (
  SELECT vouchee_id AS other_id FROM vouches, loren
  WHERE voucher_id = loren.id
),
loren_incoming AS (
  SELECT voucher_id AS other_id FROM vouches, loren
  WHERE vouchee_id = loren.id
),
loren_first_degree AS (
  SELECT other_id FROM loren_outgoing
  UNION
  SELECT other_id FROM loren_incoming
)

-- Section 1: loren's 1° network (direct vouchees + vouchers).
SELECT
  'first_degree' AS section,
  u.id,
  u.name,
  (SELECT COUNT(*) FROM listings WHERE host_id = u.id) AS listing_count
FROM users u
JOIN loren_first_degree fd ON fd.other_id = u.id
ORDER BY u.name;
