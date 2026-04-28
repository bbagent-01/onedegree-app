-- S7 re-test: inspect data before wiping + picking a scenario.
-- Run via: npx tsx --env-file=.env.local scripts/run-sql.ts s7-inspect.sql

-- Row counts on volatile state (what we'd wipe).
SELECT 'messages' AS tbl, COUNT(*) FROM messages
UNION ALL SELECT 'message_threads', COUNT(*) FROM message_threads
UNION ALL SELECT 'contact_requests', COUNT(*) FROM contact_requests
UNION ALL SELECT 'payment_events', COUNT(*) FROM payment_events
UNION ALL SELECT 'stay_confirmations', COUNT(*) FROM stay_confirmations
UNION ALL SELECT 'listing_access_grants', COUNT(*) FROM listing_access_grants
UNION ALL SELECT 'issue_reports', COUNT(*) FROM issue_reports
UNION ALL SELECT 'photo_requests', COUNT(*) FROM photo_requests;
