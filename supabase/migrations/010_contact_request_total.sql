-- Migration 010: Persist estimated total on contact_requests (CC-B6b polish)
-- The reserve form already computes nights × price client-side; we now
-- save that number so the host dashboard can show it in the reservation
-- preview card without re-querying prices.

DO $$ BEGIN
  ALTER TABLE contact_requests ADD COLUMN total_estimate INTEGER;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

COMMENT ON COLUMN contact_requests.total_estimate IS 'CC-B6b client-supplied total at reservation time (whole dollars)';
