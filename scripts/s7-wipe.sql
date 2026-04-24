-- S7 re-test data reset — wipes all volatile thread/reservation state
-- so we can walk the spec end-to-end with a known-clean history.
-- Keeps users, vouches, invites, listings, photos, amenities intact.

BEGIN;

-- Children first to keep FK chains happy.
DELETE FROM payment_events;
DELETE FROM stay_confirmations;
DELETE FROM issue_reports;
DELETE FROM photo_requests;
DELETE FROM messages;
DELETE FROM listing_access_grants;

-- S6 proposals + alert deliveries — if any exist.
DELETE FROM proposal_alert_deliveries;
DELETE FROM proposal_alerts;
DELETE FROM proposals;

-- Vouches can reference contact_requests via source_booking_id.
-- Null the reference rather than deleting the vouch itself.
UPDATE vouches SET source_booking_id = NULL
WHERE source_booking_id IS NOT NULL;

-- Now the parents.
DELETE FROM message_threads;
DELETE FROM contact_requests;

COMMIT;

-- Confirm the volatile tables are empty.
SELECT 'messages' AS tbl, COUNT(*) FROM messages
UNION ALL SELECT 'message_threads', COUNT(*) FROM message_threads
UNION ALL SELECT 'contact_requests', COUNT(*) FROM contact_requests
UNION ALL SELECT 'payment_events', COUNT(*) FROM payment_events
UNION ALL SELECT 'stay_confirmations', COUNT(*) FROM stay_confirmations
UNION ALL SELECT 'listing_access_grants', COUNT(*) FROM listing_access_grants;
