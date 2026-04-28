-- List all public tables so we know everything that might hold
-- volatile state before wiping.
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
