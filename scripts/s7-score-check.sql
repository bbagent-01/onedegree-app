-- Look at the raw vouches along the loren ↔ Elena Ruiz ↔ Amira Nasser
-- chain and along loren ↔ Nadia Abadi ↔ Jules Fontaine. These are the
-- path strengths that feed the 1° score computation.

WITH loren AS (SELECT id FROM users WHERE lower(name) LIKE 'loren%' LIMIT 1),
     elena AS (SELECT id FROM users WHERE name = 'Elena Ruiz' LIMIT 1),
     amira AS (SELECT id FROM users WHERE name = 'Amira Nasser' LIMIT 1),
     nadia AS (SELECT id FROM users WHERE name = 'Nadia Abadi' LIMIT 1),
     jules AS (SELECT id FROM users WHERE name = 'Jules Fontaine' LIMIT 1)

SELECT 'loren→elena' AS edge,
       v.vouch_type, v.years_known_bucket, v.vouch_score
FROM vouches v, loren, elena
WHERE v.voucher_id = loren.id AND v.vouchee_id = elena.id

UNION ALL
SELECT 'elena→loren', v.vouch_type, v.years_known_bucket, v.vouch_score
FROM vouches v, loren, elena
WHERE v.voucher_id = elena.id AND v.vouchee_id = loren.id

UNION ALL
SELECT 'elena→amira', v.vouch_type, v.years_known_bucket, v.vouch_score
FROM vouches v, elena, amira
WHERE v.voucher_id = elena.id AND v.vouchee_id = amira.id

UNION ALL
SELECT 'amira→elena', v.vouch_type, v.years_known_bucket, v.vouch_score
FROM vouches v, elena, amira
WHERE v.voucher_id = amira.id AND v.vouchee_id = elena.id

UNION ALL
SELECT 'loren→nadia', v.vouch_type, v.years_known_bucket, v.vouch_score
FROM vouches v, loren, nadia
WHERE v.voucher_id = loren.id AND v.vouchee_id = nadia.id

UNION ALL
SELECT 'nadia→loren', v.vouch_type, v.years_known_bucket, v.vouch_score
FROM vouches v, loren, nadia
WHERE v.voucher_id = nadia.id AND v.vouchee_id = loren.id

UNION ALL
SELECT 'nadia→jules', v.vouch_type, v.years_known_bucket, v.vouch_score
FROM vouches v, nadia, jules
WHERE v.voucher_id = nadia.id AND v.vouchee_id = jules.id

UNION ALL
SELECT 'jules→nadia', v.vouch_type, v.years_known_bucket, v.vouch_score
FROM vouches v, nadia, jules
WHERE v.voucher_id = jules.id AND v.vouchee_id = nadia.id;
