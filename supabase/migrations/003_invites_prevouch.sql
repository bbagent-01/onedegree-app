-- Migration 003: Update invites table for pre-vouch invite flow (CC-7)
--
-- Changes:
-- - Rename email → invitee_email, make nullable
-- - Rename phone → invitee_phone
-- - Add token default (auto-generate)
-- - Add vouch fields (vouch_type, years_known_bucket, reputation_stake_confirmed)
-- - Add claim tracking (claimed_by, claimed_at, expires_at)
-- - Drop status column (replaced by claimed_by IS NOT NULL)
-- - Update indexes

-- Rename columns
ALTER TABLE invites RENAME COLUMN email TO invitee_email;
ALTER TABLE invites RENAME COLUMN phone TO invitee_phone;

-- Make email nullable (can invite by phone only)
ALTER TABLE invites ALTER COLUMN invitee_email DROP NOT NULL;

-- Add token default
ALTER TABLE invites ALTER COLUMN token SET DEFAULT encode(gen_random_bytes(32), 'hex');

-- Add vouch fields
ALTER TABLE invites ADD COLUMN vouch_type vouch_type_enum NOT NULL DEFAULT 'standard';
ALTER TABLE invites ADD COLUMN years_known_bucket years_known_bucket_enum NOT NULL DEFAULT 'lt1yr';
ALTER TABLE invites ADD COLUMN reputation_stake_confirmed BOOLEAN DEFAULT false;

-- Add claim tracking
ALTER TABLE invites ADD COLUMN claimed_by UUID REFERENCES users(id);
ALTER TABLE invites ADD COLUMN claimed_at TIMESTAMPTZ;
ALTER TABLE invites ADD COLUMN expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days');

-- Drop old status column
ALTER TABLE invites DROP COLUMN status;

-- Update indexes
DROP INDEX IF EXISTS idx_invites_email;
CREATE INDEX idx_invites_invitee_email ON invites(invitee_email) WHERE invitee_email IS NOT NULL;
CREATE INDEX idx_invites_invitee_phone ON invites(invitee_phone) WHERE invitee_phone IS NOT NULL;
CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_inviter ON invites(inviter_id);

-- Remove the NOT NULL defaults we added for existing rows (keep for new rows)
-- The defaults on vouch_type and years_known_bucket are fine to keep.
