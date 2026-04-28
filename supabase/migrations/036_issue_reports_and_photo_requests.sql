-- ============================================================
-- Migration 036: issue_reports + photo_requests
-- Session: Alpha-C S4 Chunk 5 (stay-time structured affordances)
-- Date: 2026-04-22
-- Idempotent: safe to re-run
-- ============================================================
--
-- Two new thread-of-record tables for problems and asks that come
-- up during / after a stay:
--
--   issue_reports   — reporter flags damage/access/safety/etc.
--                     Counterparty acknowledges; either side marks
--                     resolved with a note. No admin panel, no
--                     auto-refunds — escalations go through Loren
--                     manually for alpha.
--
--   photo_requests  — one party (typically host) asks the other
--                     for a photo of something specific (thermostat,
--                     lockbox, etc.). Responder uploads to the
--                     `photo-requests` storage bucket; the card
--                     renders the image inline.
--
-- Both tables reference contact_requests (the booking/reservation
-- row) and message_threads (where the structured card renders).
-- RLS stays permissive like the rest of the track — server-side
-- code uses the service-role key; browser reads funnel through
-- the `/api/*` routes, which do their own participant checks.
-- ============================================================

-- ── issue_reports ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS issue_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_request_id UUID NOT NULL
    REFERENCES contact_requests(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL
    REFERENCES message_threads(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL
    REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL
    CHECK (category IN ('damage','access','amenity','safety','noise','other')),
  severity TEXT NOT NULL
    CHECK (severity IN ('low','medium','high')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','acknowledged','resolved')),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE issue_reports IS
  'During-/post-stay issues. Alpha: informational only, no auto-resolution.';

CREATE INDEX IF NOT EXISTS idx_issue_reports_contact_request
  ON issue_reports(contact_request_id);
CREATE INDEX IF NOT EXISTS idx_issue_reports_thread_status
  ON issue_reports(thread_id, status);

CREATE OR REPLACE FUNCTION issue_reports_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_issue_reports_updated_at ON issue_reports;
CREATE TRIGGER trg_issue_reports_updated_at
  BEFORE UPDATE ON issue_reports
  FOR EACH ROW EXECUTE FUNCTION issue_reports_touch_updated_at();

ALTER TABLE issue_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'issue_reports_select_authenticated') THEN
    CREATE POLICY issue_reports_select_authenticated
      ON issue_reports FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- ── photo_requests ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS photo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_request_id UUID NOT NULL
    REFERENCES contact_requests(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL
    REFERENCES message_threads(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL
    REFERENCES users(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL
    REFERENCES users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','submitted','dismissed')),
  photo_url TEXT,
  storage_path TEXT,
  submitted_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE photo_requests IS
  'Host-initiated asks for an inline photo (thermostat, lockbox). Alpha: in-app thread cards only.';

CREATE INDEX IF NOT EXISTS idx_photo_requests_contact_request
  ON photo_requests(contact_request_id);
CREATE INDEX IF NOT EXISTS idx_photo_requests_thread_status
  ON photo_requests(thread_id, status);

CREATE OR REPLACE FUNCTION photo_requests_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_photo_requests_updated_at ON photo_requests;
CREATE TRIGGER trg_photo_requests_updated_at
  BEFORE UPDATE ON photo_requests
  FOR EACH ROW EXECUTE FUNCTION photo_requests_touch_updated_at();

ALTER TABLE photo_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'photo_requests_select_authenticated') THEN
    CREATE POLICY photo_requests_select_authenticated
      ON photo_requests FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- ── storage bucket: photo-requests ───────────────────────────
--
-- Private bucket. All reads happen server-side via the service
-- role and are surfaced to the client as a signed URL in the
-- thread card; RLS on storage.objects blocks unauthenticated /
-- cross-reservation browser access.

INSERT INTO storage.buckets (id, name, public)
VALUES ('photo-requests', 'photo-requests', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'photo_requests_bucket_service_role_all') THEN
    CREATE POLICY photo_requests_bucket_service_role_all
      ON storage.objects FOR ALL TO service_role
      USING (bucket_id = 'photo-requests')
      WITH CHECK (bucket_id = 'photo-requests');
  END IF;

  -- Authenticated users can't touch the bucket directly — uploads
  -- must go through /api/photo-requests/[id]/submit which joins on
  -- participant membership. This policy is an explicit deny rail.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'photo_requests_bucket_no_anon') THEN
    CREATE POLICY photo_requests_bucket_no_anon
      ON storage.objects FOR SELECT TO anon
      USING (bucket_id != 'photo-requests');
  END IF;
END $$;

-- ── row count ping ───────────────────────────────────────────

DO $$
DECLARE
  n_issues INTEGER;
  n_photos INTEGER;
BEGIN
  SELECT COUNT(*) INTO n_issues FROM issue_reports;
  SELECT COUNT(*) INTO n_photos FROM photo_requests;
  RAISE NOTICE 'issue_reports row count: %', n_issues;
  RAISE NOTICE 'photo_requests row count: %', n_photos;
END $$;
