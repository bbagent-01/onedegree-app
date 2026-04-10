-- One Degree BNB — Full Schema (post CC-6a migration)
-- This reflects the canonical state of the database.
-- For the migration that got here, see migrations/001_align_schema_with_plan.sql

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE vouch_type_enum AS ENUM ('standard', 'inner_circle');
CREATE TYPE years_known_bucket_enum AS ENUM ('lt1yr', '1to3yr', '4to7yr', '8to15yr', '15plusyr');
CREATE TYPE incident_severity_enum AS ENUM ('minor', 'moderate', 'serious');
CREATE TYPE incident_handling_enum AS ENUM ('excellent', 'responsive', 'poor', 'terrible');

-- ============================================================
-- TABLES
-- ============================================================

-- Users (synced from Clerk via webhook)
CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id            TEXT UNIQUE NOT NULL,
  name                TEXT NOT NULL,
  email               TEXT UNIQUE NOT NULL,
  avatar_url          TEXT,
  bio                 TEXT,
  guest_rating        DECIMAL(3,2) DEFAULT NULL,
  guest_review_count  INTEGER DEFAULT 0,
  host_rating         DECIMAL(3,2) DEFAULT NULL,
  host_review_count   INTEGER DEFAULT 0,
  vouch_power         DECIMAL(3,2) DEFAULT NULL,
  phone_number        TEXT UNIQUE DEFAULT NULL,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- Vouches (the trust graph)
CREATE TABLE IF NOT EXISTS vouches (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vouchee_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vouch_type                vouch_type_enum NOT NULL,
  years_known_bucket        years_known_bucket_enum NOT NULL,
  reputation_stake_confirmed BOOLEAN NOT NULL DEFAULT false,
  stay_confirmation_id      UUID DEFAULT NULL REFERENCES stay_confirmations(id),
  created_at                TIMESTAMPTZ DEFAULT now(),
  UNIQUE (voucher_id, vouchee_id),
  CHECK (voucher_id != vouchee_id)
);

-- Invites (separate from vouches)
CREATE TABLE IF NOT EXISTS invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  phone       TEXT DEFAULT NULL,
  token       TEXT UNIQUE NOT NULL,
  status      TEXT CHECK (status IN ('pending', 'accepted')) DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Listings
CREATE TABLE IF NOT EXISTS listings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  area_name           TEXT,
  address             TEXT,
  price_per_night     NUMERIC,
  preview_visibility  TEXT CHECK (preview_visibility IN ('open', 'network', 'strong', 'invite')) DEFAULT 'open',
  full_visibility     TEXT CHECK (full_visibility IN ('open', 'network', 'strong', 'invite')) DEFAULT 'network',
  min_trust_score     INTEGER,
  house_rules         TEXT,
  amenities           TEXT[],
  availability_start  DATE,
  availability_end    DATE,
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- Listing photos
CREATE TABLE IF NOT EXISTS listing_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID REFERENCES listings(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  is_preview  BOOLEAN DEFAULT false,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Contact requests
CREATE TABLE IF NOT EXISTS contact_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID REFERENCES listings(id),
  guest_id    UUID REFERENCES users(id),
  message     TEXT,
  check_in    DATE,
  check_out   DATE,
  status      TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Stay confirmations
CREATE TABLE IF NOT EXISTS stay_confirmations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      UUID REFERENCES listings(id),
  host_id         UUID REFERENCES users(id),
  guest_id        UUID REFERENCES users(id),
  host_confirmed  BOOLEAN DEFAULT false,
  guest_confirmed BOOLEAN DEFAULT false,
  host_rating     INTEGER CHECK (host_rating BETWEEN 1 AND 5),
  guest_rating    INTEGER CHECK (guest_rating BETWEEN 1 AND 5),
  listing_rating  INTEGER CHECK (listing_rating BETWEEN 1 AND 5),
  review_text     TEXT DEFAULT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Incidents (data collection only — no auto-scoring)
CREATE TABLE IF NOT EXISTS incidents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stay_confirmation_id  UUID REFERENCES stay_confirmations(id),
  severity              incident_severity_enum NOT NULL,
  handling              incident_handling_enum NOT NULL,
  description           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_vouches_voucher ON vouches(voucher_id);
CREATE INDEX IF NOT EXISTS idx_vouches_vouchee ON vouches(vouchee_id);
CREATE INDEX IF NOT EXISTS idx_listings_host ON listings(host_id);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);
CREATE INDEX IF NOT EXISTS idx_contact_requests_listing ON contact_requests(listing_id);
CREATE INDEX IF NOT EXISTS idx_incidents_reporter ON incidents(reporter_id);
CREATE INDEX IF NOT EXISTS idx_incidents_reported_user ON incidents(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_stay ON incidents(stay_confirmation_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouches ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Users: anyone can read (needed for trust network lookups), own row update
CREATE POLICY "Users are viewable by authenticated users"
  ON users FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own row"
  ON users FOR UPDATE TO authenticated USING (clerk_id = auth.jwt() ->> 'sub');

-- Vouches: readable by voucher or vouchee, insertable by authenticated
CREATE POLICY "Vouches viewable by participants"
  ON vouches FOR SELECT TO authenticated
  USING (
    voucher_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
    OR vouchee_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "Authenticated users can create vouches"
  ON vouches FOR INSERT TO authenticated
  WITH CHECK (voucher_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

-- Invites: viewable by inviter, insertable by authenticated
CREATE POLICY "Invites viewable by inviter"
  ON invites FOR SELECT TO authenticated
  USING (inviter_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

CREATE POLICY "Authenticated users can create invites"
  ON invites FOR INSERT TO authenticated
  WITH CHECK (inviter_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

-- Listings: open preview visibility readable by all authenticated (MVP simplification)
CREATE POLICY "Active listings are viewable"
  ON listings FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Hosts can insert own listings"
  ON listings FOR INSERT TO authenticated
  WITH CHECK (host_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

CREATE POLICY "Hosts can update own listings"
  ON listings FOR UPDATE TO authenticated
  USING (host_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

-- Listing photos: viewable with listing, manageable by host
CREATE POLICY "Listing photos viewable with listing"
  ON listing_photos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Hosts can manage own listing photos"
  ON listing_photos FOR INSERT TO authenticated
  WITH CHECK (
    listing_id IN (
      SELECT id FROM listings
      WHERE host_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
    )
  );

-- Contact requests: viewable by host or guest
CREATE POLICY "Contact requests viewable by participants"
  ON contact_requests FOR SELECT TO authenticated
  USING (
    guest_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
    OR listing_id IN (
      SELECT id FROM listings
      WHERE host_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Guests can create contact requests"
  ON contact_requests FOR INSERT TO authenticated
  WITH CHECK (guest_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

-- Stay confirmations: viewable by host or guest
CREATE POLICY "Stay confirmations viewable by participants"
  ON stay_confirmations FOR SELECT TO authenticated
  USING (
    host_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
    OR guest_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "Participants can insert stay confirmations"
  ON stay_confirmations FOR INSERT TO authenticated
  WITH CHECK (
    host_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
    OR guest_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "Participants can update stay confirmations"
  ON stay_confirmations FOR UPDATE TO authenticated
  USING (
    host_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
    OR guest_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
  );

-- Incidents: reporters read own, reporters insert
CREATE POLICY "reporters_read_own" ON incidents FOR SELECT TO authenticated
  USING (reporter_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

CREATE POLICY "reporters_insert" ON incidents FOR INSERT TO authenticated
  WITH CHECK (reporter_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Trigger: recalculate vouch_power when a user's guest_rating changes
CREATE OR REPLACE FUNCTION recalculate_vouch_power()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET vouch_power = sub.avg_rating
  FROM (
    SELECT v.voucher_id, AVG(u2.guest_rating) AS avg_rating
    FROM vouches v
    JOIN users u2 ON u2.id = v.vouchee_id
    WHERE v.voucher_id IN (SELECT voucher_id FROM vouches WHERE vouchee_id = NEW.id)
      AND u2.guest_review_count >= 1
      AND u2.guest_rating IS NOT NULL
    GROUP BY v.voucher_id
  ) sub
  WHERE users.id = sub.voucher_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_vouch_power
  AFTER UPDATE OF guest_rating ON users
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_vouch_power();

-- RPC: batch calculate 1-degree scores for a viewer against multiple targets
CREATE OR REPLACE FUNCTION calculate_one_degree_scores(
  p_viewer_id UUID,
  p_target_ids UUID[]
)
RETURNS TABLE(target_id UUID, score INTEGER, connection_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_target UUID;
BEGIN
  FOREACH v_target IN ARRAY p_target_ids LOOP
    IF v_target = p_viewer_id THEN CONTINUE; END IF;

    RETURN QUERY
    SELECT
      v_target AS target_id,
      COALESCE(ROUND(SUM(paths.path_strength))::INTEGER, 0) AS score,
      COUNT(*)::INTEGER AS connection_count
    FROM (
      SELECT
        (
          (CASE v_vc.vouch_type WHEN 'inner_circle' THEN 25.0 ELSE 15.0 END *
           CASE v_vc.years_known_bucket
             WHEN 'lt1yr' THEN 0.6 WHEN '1to3yr' THEN 0.8 WHEN '4to7yr' THEN 1.0
             WHEN '8to15yr' THEN 1.4 WHEN '15plusyr' THEN 1.8 ELSE 1.0 END)
          +
          (CASE v_ct.vouch_type WHEN 'inner_circle' THEN 25.0 ELSE 15.0 END *
           CASE v_ct.years_known_bucket
             WHEN 'lt1yr' THEN 0.6 WHEN '1to3yr' THEN 0.8 WHEN '4to7yr' THEN 1.0
             WHEN '8to15yr' THEN 1.4 WHEN '15plusyr' THEN 1.8 ELSE 1.0 END
           * COALESCE(u_conn.vouch_power, 4.0) / 4.0)
        ) / 2.0 AS path_strength
      FROM vouches v_vc
      JOIN vouches v_ct ON v_ct.voucher_id = v_vc.vouchee_id
      JOIN users u_conn ON u_conn.id = v_vc.vouchee_id
      WHERE v_vc.voucher_id = p_viewer_id
        AND v_ct.vouchee_id = v_target
        AND v_vc.vouchee_id != p_viewer_id
        AND v_vc.vouchee_id != v_target
    ) paths;
  END LOOP;
END;
$$;

-- RPC: calculate vouch_power for a single user (on-demand, also stores result)
CREATE OR REPLACE FUNCTION calculate_vouch_power(p_user_id UUID)
RETURNS DECIMAL(3,2)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result DECIMAL(3,2);
BEGIN
  SELECT AVG(u.guest_rating)
  INTO v_result
  FROM vouches v
  JOIN users u ON u.id = v.vouchee_id
  WHERE v.voucher_id = p_user_id
    AND u.guest_review_count >= 1
    AND u.guest_rating IS NOT NULL;

  UPDATE users SET vouch_power = v_result WHERE id = p_user_id;
  RETURN v_result;
END;
$$;
