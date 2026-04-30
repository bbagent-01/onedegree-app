-- 048_pending_vouches_modes.sql
--
-- B1 follow-up: phoneless individual links (Mode B) + group blast
-- links (Mode C). Both let the sender invite without knowing the
-- recipient's phone, which is the alpha-stage UX hurdle that the
-- original B1 phone-required flow (Mode A, migration 047) doesn't
-- solve.
--
-- Trust model is the same across all three modes: vouch lands
-- automatically when someone signs up via the link. The sender
-- gets a "from open invite link — review?" nudge on their network
-- dashboard so they can revoke a vouch if the wrong person claims
-- the link (the existing DELETE /api/vouches path).
--
-- Why one table for three modes (instead of separate tables):
--   - Same lifecycle (pending → claimed/canceled/expired), same cap
--     (20 active per sender), same cron sweep, same RLS policies.
--   - Difference is in WHO can claim (phone match, single token,
--     multi-token-up-to-N) — handled at /join/[token]/complete with
--     a `mode` column branch, not a new table.

-- ──────────────────────────────────────────────────────────────────
-- 1. Mode dimension
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE pending_vouches
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'phone';

-- Keep the mode CHECK as a separate ALTER so re-runs after a partial
-- failure don't trip on a NOT EXISTS column.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.pending_vouches'::regclass
      AND conname = 'pending_vouches_mode_check'
  ) THEN
    ALTER TABLE pending_vouches ADD CONSTRAINT pending_vouches_mode_check
      CHECK (mode IN ('phone', 'open_individual', 'open_group'));
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────
-- 2. Group-mode metadata. NULL for phone + open_individual rows.
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE pending_vouches
  ADD COLUMN IF NOT EXISTS group_label text,
  ADD COLUMN IF NOT EXISTS max_claims int,
  ADD COLUMN IF NOT EXISTS claim_count int NOT NULL DEFAULT 0;

-- ──────────────────────────────────────────────────────────────────
-- 3. Mode-aware phone CHECK — replaces 047's
--    pending_vouches_phone_when_pending. The two requirements:
--      a) phone-mode pending rows MUST have a phone (needed for
--         webhook auto-claim by phone match).
--      b) open-mode rows MUST NOT have a phone (privacy: there's no
--         intended recipient until someone claims the token).
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE pending_vouches DROP CONSTRAINT IF EXISTS pending_vouches_phone_when_pending;
ALTER TABLE pending_vouches ADD CONSTRAINT pending_vouches_phone_when_pending
  CHECK (
    (mode = 'phone' AND status = 'pending' AND recipient_phone IS NOT NULL)
    OR (mode IN ('open_individual', 'open_group') AND recipient_phone IS NULL)
    OR status <> 'pending'
  );

-- pending_vouches_phone_scrubbed_after_terminal stays unchanged —
-- NULL is always a valid scrubbed state regardless of mode.

-- ──────────────────────────────────────────────────────────────────
-- 3b. Recipient name nullability. Mode A and B both label the
--     pending row by a person's name; Mode C labels by group_label
--     instead, so recipient_name needs to be optional. The existing
--     length CHECK passes harmlessly on NULL (CHECK fails only on
--     FALSE), and the API layer enforces presence per-mode.
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE pending_vouches ALTER COLUMN recipient_name DROP NOT NULL;

-- Mode-aware presence: Mode A/B require a name, Mode C requires a
-- group_label (and forbids a recipient_name to keep the data model
-- unambiguous).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.pending_vouches'::regclass
      AND conname = 'pending_vouches_label_by_mode'
  ) THEN
    ALTER TABLE pending_vouches ADD CONSTRAINT pending_vouches_label_by_mode
      CHECK (
        (mode IN ('phone', 'open_individual') AND recipient_name IS NOT NULL AND group_label IS NULL)
        OR (mode = 'open_group' AND group_label IS NOT NULL AND recipient_name IS NULL)
      );
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────
-- 4. Group-mode invariants. max_claims is required for open_group
--    and forbidden for the other two; claim_count must stay in
--    [0, max_claims] for open_group rows.
-- ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.pending_vouches'::regclass
      AND conname = 'pending_vouches_max_claims_for_group'
  ) THEN
    ALTER TABLE pending_vouches ADD CONSTRAINT pending_vouches_max_claims_for_group
      CHECK (
        (mode = 'open_group' AND max_claims IS NOT NULL AND max_claims BETWEEN 2 AND 50)
        OR (mode <> 'open_group' AND max_claims IS NULL)
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.pending_vouches'::regclass
      AND conname = 'pending_vouches_claim_count_in_range'
  ) THEN
    ALTER TABLE pending_vouches ADD CONSTRAINT pending_vouches_claim_count_in_range
      CHECK (
        claim_count >= 0
        AND (mode <> 'open_group' OR claim_count <= max_claims)
      );
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────
-- 5. Provenance on vouches. Lets /dashboard/network surface a
--    "from open invite link — review?" badge on vouches that landed
--    via Mode B / Mode C, so the sender has a one-tap path to revoke
--    if the wrong person claimed their link.
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE vouches
  ADD COLUMN IF NOT EXISTS from_pending_vouch_id uuid REFERENCES pending_vouches(id);

CREATE INDEX IF NOT EXISTS idx_vouches_from_pending_vouch
  ON vouches(from_pending_vouch_id)
  WHERE from_pending_vouch_id IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────
-- 6. Hot-path index for the dashboard list rendering, which filters
--    by sender + mode + status when computing the per-mode counts.
-- ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pending_vouches_sender_mode_status
  ON pending_vouches(sender_id, mode, status);

-- ──────────────────────────────────────────────────────────────────
-- 7. Race-safe claim-count bump for Mode C (open_group).
--    The supabase-js client doesn't support `column = column + 1`
--    directly, and a read-then-write pattern from JS opens a race
--    window where two concurrent claims could over-count past
--    max_claims. A single SQL statement closes the window: the
--    WHERE predicate ensures only callers below the cap succeed,
--    and Postgres serializes concurrent UPDATEs on the same row.
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_pending_vouch_claim_count(p_id uuid)
RETURNS int AS $$
DECLARE
  new_count int;
BEGIN
  UPDATE pending_vouches
  SET claim_count = claim_count + 1
  WHERE id = p_id
    AND mode = 'open_group'
    AND status = 'pending'
    AND claim_count < max_claims
  RETURNING claim_count INTO new_count;
  RETURN new_count;  -- NULL if the predicate didn't match (cap reached or wrong mode)
END;
$$ LANGUAGE plpgsql;
