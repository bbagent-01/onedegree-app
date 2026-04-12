-- Migration 005: Calendar System (CC-9a)
-- Adds listing_availability table and stay-rule columns to listings

-- ============================================================
-- NEW TABLE: listing_availability
-- ============================================================

CREATE TABLE IF NOT EXISTS listing_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'possibly_available', 'blocked')),
  custom_price_per_night DECIMAL(10,2),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

CREATE INDEX idx_listing_avail_listing ON listing_availability(listing_id);
CREATE INDEX idx_listing_avail_dates ON listing_availability(start_date, end_date);

-- ============================================================
-- RLS for listing_availability
-- ============================================================

ALTER TABLE listing_availability ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read availability (needed for guest calendar view)
CREATE POLICY "Availability viewable by authenticated users"
  ON listing_availability FOR SELECT TO authenticated
  USING (true);

-- Hosts can insert availability for their own listings
CREATE POLICY "Hosts can insert availability"
  ON listing_availability FOR INSERT TO authenticated
  WITH CHECK (
    listing_id IN (
      SELECT id FROM listings
      WHERE host_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
    )
  );

-- Hosts can update availability for their own listings
CREATE POLICY "Hosts can update availability"
  ON listing_availability FOR UPDATE TO authenticated
  USING (
    listing_id IN (
      SELECT id FROM listings
      WHERE host_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
    )
  );

-- Hosts can delete availability for their own listings
CREATE POLICY "Hosts can delete availability"
  ON listing_availability FOR DELETE TO authenticated
  USING (
    listing_id IN (
      SELECT id FROM listings
      WHERE host_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
    )
  );

-- ============================================================
-- ADD COLUMNS to listings (stay rules)
-- ============================================================

ALTER TABLE listings ADD COLUMN IF NOT EXISTS min_nights INTEGER DEFAULT 1;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS max_nights INTEGER DEFAULT 365;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS prep_days INTEGER DEFAULT 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS advance_notice_days INTEGER DEFAULT 1;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS availability_window_months INTEGER DEFAULT 12;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS checkin_time TEXT DEFAULT '15:00';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS checkout_time TEXT DEFAULT '11:00';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS blocked_checkin_days TEXT[] DEFAULT '{}';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS blocked_checkout_days TEXT[] DEFAULT '{}';
