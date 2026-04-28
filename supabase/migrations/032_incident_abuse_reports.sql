-- 032_incident_abuse_reports.sql
--
-- Extend `incidents` so the same table can carry two kinds of report:
--
--   1. Post-stay incident reports — severity + handling (existing).
--   2. User-initiated abuse reports — reason + source_context (new).
--
-- Making severity/handling nullable means the old post-stay shape keeps
-- working, and the new abuse-report shape can omit them. A check
-- constraint enforces that at least one of the two shapes is present.

-- Loosen the post-stay-only NOT NULLs so abuse reports can omit them.
ALTER TABLE incidents ALTER COLUMN severity DROP NOT NULL;
ALTER TABLE incidents ALTER COLUMN handling DROP NOT NULL;

-- Categorical reason for user-initiated reports.
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS reason TEXT;

DO $$ BEGIN
  ALTER TABLE incidents ADD CONSTRAINT incidents_reason_check
    CHECK (
      reason IS NULL OR
      reason IN ('harassment', 'safety_concern', 'misrepresentation', 'scam', 'other')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Structured origin. JSON keys we use today:
--   { source: 'profile' }
--   { source: 'thread', thread_id: <uuid>, message_id: <uuid> }
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS source_context JSONB;

-- At least one shape must be present.
DO $$ BEGIN
  ALTER TABLE incidents ADD CONSTRAINT incidents_shape_check
    CHECK (
      (severity IS NOT NULL AND handling IS NOT NULL)
      OR reason IS NOT NULL
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_incidents_reason ON incidents(reason) WHERE reason IS NOT NULL;
