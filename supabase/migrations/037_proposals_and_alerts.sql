-- 037_proposals_and_alerts.sql
--
-- Alpha-C CC-C9 · Two-sided proposals feed.
--
-- Introduces two tables:
--   1. proposals         — Trip Wishes (guest-side) + Host Offers (host-side),
--                          each scoped by an effective preview network
--                          (inherited from author profile / linked listing,
--                          or customized per-post).
--   2. proposal_alerts   — Opt-in matching subscriptions. When a new proposal
--                          lands that matches a subscriber's criteria AND
--                          passes the proposal's visibility gate for the
--                          subscriber, a notification fires.
--
-- Visibility reuses listings.access_settings' JSON shape so the same
-- preview-gate checkers can operate on proposals without a new code path.
-- RLS below delegates the hard filtering back to the API layer (which
-- already has the batch trust-score machinery) — the DB policies only
-- enforce ownership for writes + "active" + non-expired for reads.

-- ──────────────────────────────────────────────────────────────
-- 1. proposals
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('trip_wish', 'host_offer')),

  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description text NOT NULL
    CHECK (char_length(description) BETWEEN 20 AND 1000),

  -- User-entered location strings. For trip_wish: where the author wants
  -- to go (city / region / "flexible" / "anywhere warm"). For host_offer:
  -- where the offer applies (typically the listing area, but the author
  -- can generalize — e.g. "Paris + nearby suburbs").
  destinations text[] NOT NULL DEFAULT ARRAY[]::text[],

  -- Date specifics. Mutually-informative with flexible_month: a post can
  -- use either a concrete range OR a month string, never both.
  start_date date,
  end_date date,
  flexible_month text,

  -- trip_wish only.
  guest_count int CHECK (guest_count IS NULL OR guest_count > 0),

  -- host_offer only — enforced via partial CHECK below.
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  hook_type text NOT NULL DEFAULT 'none'
    CHECK (hook_type IN ('discount', 'trade', 'none')),
  hook_details text,

  -- Inheritance model — 'inherit' reads the author's profile (trip_wish)
  -- or linked listing (host_offer) audience; 'custom' uses the row's own
  -- access_settings JSON. Keep the shape 1:1 with listings.access_settings
  -- so the existing check-access helpers can evaluate without branching.
  visibility_mode text NOT NULL DEFAULT 'inherit'
    CHECK (visibility_mode IN ('inherit', 'custom')),
  access_settings jsonb,

  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'closed')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Computed at insert by the trigger below:
  --   end_date + 7 days if a concrete date range is set, else
  --   created_at + 60 days.
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '60 days'),

  -- Shape invariants.
  CONSTRAINT proposals_host_offer_listing_required
    CHECK (kind <> 'host_offer' OR listing_id IS NOT NULL),
  CONSTRAINT proposals_trip_wish_no_listing
    CHECK (kind <> 'trip_wish' OR listing_id IS NULL),
  CONSTRAINT proposals_hook_details_when_hook
    CHECK (hook_type = 'none' OR hook_details IS NOT NULL),
  CONSTRAINT proposals_custom_needs_settings
    CHECK (visibility_mode = 'inherit' OR access_settings IS NOT NULL),
  CONSTRAINT proposals_dates_xor_flexible
    CHECK (
      (start_date IS NULL AND end_date IS NULL)
      OR flexible_month IS NULL
    ),
  CONSTRAINT proposals_date_range_ordered
    CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date)
);

-- Feed hot-path: "show me every active, non-expired proposal, newest first."
CREATE INDEX IF NOT EXISTS idx_proposals_status_expires
  ON proposals(status, expires_at);

-- Profile section: "this user's active proposals."
CREATE INDEX IF NOT EXISTS idx_proposals_author_status
  ON proposals(author_id, status);

-- Feed tab filter: "active Trip Wishes / Host Offers, newest first."
CREATE INDEX IF NOT EXISTS idx_proposals_kind_status_created
  ON proposals(kind, status, created_at DESC);

-- Alert matching: "anyone subscribed to destinations that overlap this
-- new proposal's destinations." GIN supports && (array overlap).
CREATE INDEX IF NOT EXISTS idx_proposals_destinations_gin
  ON proposals USING gin(destinations);

-- updated_at touch + expires_at computation on insert.
CREATE OR REPLACE FUNCTION touch_proposals_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_proposals_expires_at()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := now() + interval '60 days';
  END IF;
  -- Re-derive on any insert: concrete date range → end_date + 7d wins.
  IF TG_OP = 'INSERT' AND NEW.end_date IS NOT NULL THEN
    NEW.expires_at := (NEW.end_date + interval '7 days')::timestamptz;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS proposals_set_expires_at ON proposals;
CREATE TRIGGER proposals_set_expires_at
  BEFORE INSERT ON proposals
  FOR EACH ROW EXECUTE FUNCTION set_proposals_expires_at();

DROP TRIGGER IF EXISTS proposals_touch_updated_at ON proposals;
CREATE TRIGGER proposals_touch_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION touch_proposals_updated_at();

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user can see active rows. Fine-grained
-- audience filtering (inherited preview network vs. custom access_settings
-- → viewer trust score) is enforced at the API layer, which already has
-- the batch trust-score infrastructure. Authors can always read their own
-- rows regardless of status so the /proposals/[id] page works on expired.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'proposals_select_active_or_own'
      AND tablename = 'proposals'
  ) THEN
    CREATE POLICY proposals_select_active_or_own
      ON proposals FOR SELECT TO authenticated
      USING (
        status = 'active'
        OR author_id IN (
          SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'proposals_insert_author'
      AND tablename = 'proposals'
  ) THEN
    CREATE POLICY proposals_insert_author
      ON proposals FOR INSERT TO authenticated
      WITH CHECK (
        author_id IN (
          SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'proposals_update_author'
      AND tablename = 'proposals'
  ) THEN
    CREATE POLICY proposals_update_author
      ON proposals FOR UPDATE TO authenticated
      USING (
        author_id IN (
          SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'proposals_delete_author'
      AND tablename = 'proposals'
  ) THEN
    CREATE POLICY proposals_delete_author
      ON proposals FOR DELETE TO authenticated
      USING (
        author_id IN (
          SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
        )
      );
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 2. proposal_alerts
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proposal_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  subscriber_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  kind text NOT NULL DEFAULT 'either'
    CHECK (kind IN ('trip_wish', 'host_offer', 'either')),

  destinations text[] NOT NULL DEFAULT ARRAY[]::text[],

  start_window date,
  end_window date,

  delivery text NOT NULL DEFAULT 'email'
    CHECK (delivery IN ('email', 'sms', 'both')),

  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_notified_at timestamptz
);

-- Hot path: "for a newly-inserted proposal, find all active alerts whose
-- destinations overlap." Partial index keyed on status keeps paused rows
-- out of the fan-out scan.
CREATE INDEX IF NOT EXISTS idx_proposal_alerts_active
  ON proposal_alerts(status, subscriber_id);

CREATE INDEX IF NOT EXISTS idx_proposal_alerts_destinations_gin
  ON proposal_alerts USING gin(destinations);

CREATE OR REPLACE FUNCTION touch_proposal_alerts_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS proposal_alerts_touch_updated_at ON proposal_alerts;
CREATE TRIGGER proposal_alerts_touch_updated_at
  BEFORE UPDATE ON proposal_alerts
  FOR EACH ROW EXECUTE FUNCTION touch_proposal_alerts_updated_at();

ALTER TABLE proposal_alerts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'proposal_alerts_select_own'
      AND tablename = 'proposal_alerts'
  ) THEN
    CREATE POLICY proposal_alerts_select_own
      ON proposal_alerts FOR SELECT TO authenticated
      USING (
        subscriber_id IN (
          SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'proposal_alerts_insert_own'
      AND tablename = 'proposal_alerts'
  ) THEN
    CREATE POLICY proposal_alerts_insert_own
      ON proposal_alerts FOR INSERT TO authenticated
      WITH CHECK (
        subscriber_id IN (
          SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'proposal_alerts_update_own'
      AND tablename = 'proposal_alerts'
  ) THEN
    CREATE POLICY proposal_alerts_update_own
      ON proposal_alerts FOR UPDATE TO authenticated
      USING (
        subscriber_id IN (
          SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'proposal_alerts_delete_own'
      AND tablename = 'proposal_alerts'
  ) THEN
    CREATE POLICY proposal_alerts_delete_own
      ON proposal_alerts FOR DELETE TO authenticated
      USING (
        subscriber_id IN (
          SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
        )
      );
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 3. proposal_alert_deliveries — dedupe log
-- ──────────────────────────────────────────────────────────────
-- One row per (alert, proposal) notification. Prevents double-firing if
-- the alert fan-out runs twice for the same proposal (e.g. retry,
-- manual trigger). Not user-visible; no RLS needed — only the API
-- service role writes here.
CREATE TABLE IF NOT EXISTS proposal_alert_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES proposal_alerts(id) ON DELETE CASCADE,
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  delivery text NOT NULL,
  notified_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT proposal_alert_deliveries_uniq UNIQUE (alert_id, proposal_id)
);

CREATE INDEX IF NOT EXISTS idx_proposal_alert_deliveries_proposal
  ON proposal_alert_deliveries(proposal_id);
