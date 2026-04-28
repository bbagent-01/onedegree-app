-- Confirm Amira Nasser and Jules Fontaine are both:
--   - is_test_user = true
--   - NOT 1° to loren
--   - Have a 2° path to loren (so intro flow is well-motivated)
--   - No listings of their own (pure guest role)

WITH loren AS (
  SELECT id FROM users WHERE lower(name) LIKE 'loren%' LIMIT 1
),
candidates AS (
  SELECT * FROM users
  WHERE lower(name) IN ('amira nasser', 'jules fontaine')
),
loren_first_degree AS (
  SELECT vouchee_id AS other_id FROM vouches, loren WHERE voucher_id = loren.id
  UNION
  SELECT voucher_id AS other_id FROM vouches, loren WHERE vouchee_id = loren.id
)
SELECT
  c.name,
  c.is_test_user,
  (c.id IN (SELECT other_id FROM loren_first_degree)) AS is_first_degree_to_loren,
  (SELECT COUNT(*) FROM listings WHERE host_id = c.id) AS listing_count,
  (
    SELECT string_agg(DISTINCT viaU.name, ', ')
    FROM vouches v
    JOIN users viaU ON viaU.id = v.voucher_id
    WHERE v.vouchee_id = c.id
      AND v.voucher_id IN (SELECT other_id FROM loren_first_degree)
  ) AS two_degree_via
FROM candidates c
ORDER BY c.name;
