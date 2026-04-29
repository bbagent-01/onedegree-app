-- A2 / B4 — SMS opt-out tracking for A2P 10DLC compliance.
--
-- Twilio audits campaigns that send "Reply STOP to opt out" copy and
-- requires the sender to honour inbound STOP/UNSUBSCRIBE/CANCEL/END/QUIT
-- replies. This table records every opt-out so the pre-send filters in
-- src/lib/sms/* can short-circuit before hitting the Twilio API.
--
-- HELP returns a canned reply but does not record an opt-out.
-- START / UNSTOP removes the opt-out row (re-subscribes).
--
-- Phone numbers are stored in E.164 format (+15555551234), the same
-- format used everywhere else in the app (users.phone_number,
-- invites.invitee_phone). The TWILIO_PHONE_NUMBER env var is also E.164.
--
-- RLS intentionally not enabled in this migration — RLS lockdown is
-- A3's scope. Service-role-only access via getSupabaseAdmin() until then.

CREATE TABLE IF NOT EXISTS sms_opt_outs (
  phone_number TEXT PRIMARY KEY,
  opted_out_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'STOP'
);

COMMENT ON TABLE sms_opt_outs IS
  'A2P 10DLC opt-out registry. Pre-send filters consult this before any direct-Twilio send (invite, proposal alert). OTP/auth flows intentionally bypass — users must never be able to lock themselves out of sign-in via STOP.';

COMMENT ON COLUMN sms_opt_outs.source IS
  'How the opt-out was recorded: STOP / UNSUBSCRIBE / CANCEL / END / QUIT / STOPALL (Twilio inbound), or "manual" (admin-recorded).';
