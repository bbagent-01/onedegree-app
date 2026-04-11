-- CC-8 Migration: Contact Requests, Stay Confirmations, Reviews, Tools
-- Idempotent — safe to re-run.

-- ============================================================
-- 1a. ALTER contact_requests — add missing columns
-- ============================================================

-- Add host_id (denormalized from listing for fast dashboard queries)
DO $$ BEGIN
  ALTER TABLE contact_requests ADD COLUMN host_id UUID REFERENCES users(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Backfill host_id from listings for any existing rows
UPDATE contact_requests cr
SET host_id = l.host_id
FROM listings l
WHERE cr.listing_id = l.id AND cr.host_id IS NULL;

-- Now set NOT NULL (safe after backfill)
ALTER TABLE contact_requests ALTER COLUMN host_id SET NOT NULL;

-- Make listing_id and guest_id NOT NULL if they aren't already
ALTER TABLE contact_requests ALTER COLUMN listing_id SET NOT NULL;
ALTER TABLE contact_requests ALTER COLUMN guest_id SET NOT NULL;
ALTER TABLE contact_requests ALTER COLUMN message SET NOT NULL;

-- Add 'cancelled' to status check constraint
ALTER TABLE contact_requests DROP CONSTRAINT IF EXISTS contact_requests_status_check;
ALTER TABLE contact_requests ADD CONSTRAINT contact_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled'));

DO $$ BEGIN
  ALTER TABLE contact_requests ADD COLUMN guest_count INTEGER DEFAULT 1;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE contact_requests ADD COLUMN host_response_message TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE contact_requests ADD COLUMN responded_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contact_requests_host ON contact_requests(host_id);
CREATE INDEX IF NOT EXISTS idx_contact_requests_guest ON contact_requests(guest_id);

-- RLS: host can update requests for their listings
DO $$ BEGIN
  CREATE POLICY "Hosts can update contact requests"
    ON contact_requests FOR UPDATE TO authenticated
    USING (host_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 1b. ALTER stay_confirmations — add missing columns
-- ============================================================

DO $$ BEGIN
  ALTER TABLE stay_confirmations ADD COLUMN contact_request_id UUID REFERENCES contact_requests(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE stay_confirmations ADD COLUMN check_in DATE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE stay_confirmations ADD COLUMN check_out DATE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE stay_confirmations ADD COLUMN guest_review_text TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE stay_confirmations ADD COLUMN host_review_text TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE stay_confirmations ADD COLUMN listing_review_text TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stay_confirmations_host ON stay_confirmations(host_id);
CREATE INDEX IF NOT EXISTS idx_stay_confirmations_guest ON stay_confirmations(guest_id);
CREATE INDEX IF NOT EXISTS idx_stay_confirmations_listing ON stay_confirmations(listing_id);

-- ============================================================
-- 1c. ALTER listings — add rating aggregates
-- ============================================================

DO $$ BEGIN
  ALTER TABLE listings ADD COLUMN avg_listing_rating DECIMAL(3,2) DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE listings ADD COLUMN listing_review_count INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- 1d. New tables for Tools
-- ============================================================

CREATE TABLE IF NOT EXISTS house_manuals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  host_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rental_agreements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_confirmation_id  UUID REFERENCES stay_confirmations(id),
  listing_id            UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  host_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content               JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS security_deposits (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_confirmation_id  UUID REFERENCES stay_confirmations(id),
  listing_id            UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  host_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount                INTEGER,
  terms                 JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_house_manuals_listing ON house_manuals(listing_id);
CREATE INDEX IF NOT EXISTS idx_rental_agreements_listing ON rental_agreements(listing_id);
CREATE INDEX IF NOT EXISTS idx_security_deposits_listing ON security_deposits(listing_id);

-- ============================================================
-- 1e. RLS for new tables
-- ============================================================

ALTER TABLE house_manuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_deposits ENABLE ROW LEVEL SECURITY;

-- House manuals: host can CRUD own
DO $$ BEGIN
  CREATE POLICY "Hosts can read own house manuals"
    ON house_manuals FOR SELECT TO authenticated
    USING (host_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Hosts can insert own house manuals"
    ON house_manuals FOR INSERT TO authenticated
    WITH CHECK (host_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Hosts can update own house manuals"
    ON house_manuals FOR UPDATE TO authenticated
    USING (host_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Rental agreements: host can CRUD own
DO $$ BEGIN
  CREATE POLICY "Hosts can read own rental agreements"
    ON rental_agreements FOR SELECT TO authenticated
    USING (host_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Hosts can insert own rental agreements"
    ON rental_agreements FOR INSERT TO authenticated
    WITH CHECK (host_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Hosts can update own rental agreements"
    ON rental_agreements FOR UPDATE TO authenticated
    USING (host_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Security deposits: host can CRUD own
DO $$ BEGIN
  CREATE POLICY "Hosts can read own security deposits"
    ON security_deposits FOR SELECT TO authenticated
    USING (host_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Hosts can insert own security deposits"
    ON security_deposits FOR INSERT TO authenticated
    WITH CHECK (host_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Hosts can update own security deposits"
    ON security_deposits FOR UPDATE TO authenticated
    USING (host_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
