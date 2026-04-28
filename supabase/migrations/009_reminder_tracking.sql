-- Migration 009: Reminder tracking columns (CC-B6b cron worker)
-- Adds two timestamp columns to contact_requests so the hourly cron can
-- avoid double-firing the 24h check-in reminder and the post-checkout
-- review prompt. Idempotent.

DO $$ BEGIN
  ALTER TABLE contact_requests
    ADD COLUMN checkin_reminder_sent_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE contact_requests
    ADD COLUMN review_prompt_sent_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Helpful index for the cron's two queries (status='accepted' + date window).
CREATE INDEX IF NOT EXISTS idx_contact_requests_cron
  ON contact_requests(status, check_in, check_out)
  WHERE status = 'accepted';

COMMENT ON COLUMN contact_requests.checkin_reminder_sent_at IS 'CC-B6b set by hourly cron when 24h reminder fires';
COMMENT ON COLUMN contact_requests.review_prompt_sent_at IS 'CC-B6b set by hourly cron when post-checkout review prompt fires';
