-- All test users + their 1° relationship to loren.
WITH loren AS (
  SELECT id FROM users WHERE lower(name) LIKE 'loren%' LIMIT 1
),
loren_first_degree AS (
  SELECT vouchee_id AS other_id FROM vouches, loren WHERE voucher_id = loren.id
  UNION
  SELECT voucher_id AS other_id FROM vouches, loren WHERE vouchee_id = loren.id
)
SELECT
  u.id,
  u.name,
  u.email,
  u.is_test_user,
  (u.id IN (SELECT other_id FROM loren_first_degree)) AS is_first_degree_to_loren,
  (SELECT COUNT(*) FROM listings WHERE host_id = u.id) AS listing_count
FROM users u
WHERE u.is_test_user = true
ORDER BY is_first_degree_to_loren ASC, u.name ASC;
