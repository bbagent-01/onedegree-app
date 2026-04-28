-- ============================================================
-- Migration 013: Add listings.min_trust_gate
-- Session: CC-B7a
-- Date: 2026-04-15
-- Idempotent: safe to re-run
-- ============================================================
--
-- Adds a per-listing trust gate. A viewer can see a listing's full
-- details only if their computed one-degree trust score to the host
-- is >= min_trust_gate. 0 (default) = visible to anyone in the
-- network, higher values restrict visibility to closer connections.
--
-- Read-path: src/lib/browse-data.ts + src/lib/trust-data.ts compare
-- the viewer's trust path to this gate and split listings into
-- visible vs gated-preview buckets.
-- ============================================================

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS min_trust_gate INTEGER NOT NULL DEFAULT 0;

-- Index for potential future server-side filtering, kept small.
CREATE INDEX IF NOT EXISTS idx_listings_min_trust_gate
  ON listings (min_trust_gate)
  WHERE min_trust_gate > 0;

-- ============================================================
-- DONE
-- ============================================================
