-- CC-C2.1: Add delivery tracking columns to invites table.
-- Tracks whether invite was sent via SMS, email, or both.

ALTER TABLE invites
ADD COLUMN IF NOT EXISTS delivery_method TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT NULL;

COMMENT ON COLUMN invites.delivery_method IS 'How the invite was delivered: sms, email, both, or failed';
COMMENT ON COLUMN invites.delivery_status IS 'Delivery status: delivered or failed';
