SELECT
  l.id,
  l.title,
  l.area_name,
  l.price_min,
  l.cleaning_fee,
  l.visibility_mode
FROM listings l
JOIN users u ON u.id = l.host_id
WHERE lower(u.name) LIKE 'loren%'
ORDER BY l.created_at DESC;
