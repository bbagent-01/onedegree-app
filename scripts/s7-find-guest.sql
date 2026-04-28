-- Find a viable GUEST for the re-test: someone who is NOT 1° to loren
-- (so an intro flow is required) but IS 2° via a mutual connection.
-- Prefer a guest with no listing since the scenario is simpler.

WITH loren AS (
  SELECT id FROM users WHERE lower(name) LIKE 'loren%' LIMIT 1
),
first_degree AS (
  SELECT vouchee_id AS other_id FROM vouches, loren WHERE voucher_id = loren.id
  UNION
  SELECT voucher_id AS other_id FROM vouches, loren WHERE vouchee_id = loren.id
),
second_degree AS (
  -- Users who are 1° to someone loren is 1° to, but aren't loren or 1° themselves.
  SELECT DISTINCT v2.vouchee_id AS candidate_id, v2.voucher_id AS via_user_id
  FROM vouches v2
  JOIN first_degree fd ON fd.other_id = v2.voucher_id
  WHERE v2.vouchee_id != (SELECT id FROM loren)
    AND v2.vouchee_id NOT IN (SELECT other_id FROM first_degree)
  UNION
  SELECT DISTINCT v2.voucher_id AS candidate_id, v2.vouchee_id AS via_user_id
  FROM vouches v2
  JOIN first_degree fd ON fd.other_id = v2.vouchee_id
  WHERE v2.voucher_id != (SELECT id FROM loren)
    AND v2.voucher_id NOT IN (SELECT other_id FROM first_degree)
)
SELECT
  u.id,
  u.name,
  (SELECT COUNT(*) FROM listings WHERE host_id = u.id) AS listing_count,
  COALESCE(
    (SELECT string_agg(DISTINCT viaU.name, ', ')
     FROM second_degree sd
     JOIN users viaU ON viaU.id = sd.via_user_id
     WHERE sd.candidate_id = u.id),
    ''
  ) AS connected_via
FROM users u
WHERE u.id IN (SELECT candidate_id FROM second_degree)
ORDER BY u.name;
