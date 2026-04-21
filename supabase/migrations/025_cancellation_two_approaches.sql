-- ============================================================
-- Migration 025: Cancellation & payment policy — two approaches
-- Session: Booking-flow v2 Chunk 4 revision 2
-- Date: 2026-04-21
-- Idempotent: safe to re-run
-- ============================================================
--
-- Why: hosts think about payment in one of two ways.
--
--   A) "Collect full payment up front, offer refunds on a schedule"
--       (Airbnb-style)
--   B) "Collect in installments; once paid, each installment is
--       nonrefundable"                (our previous default)
--
-- Both are legitimate. The app is neutral on which one a host
-- should pick — we don't custody money either way. The policy
-- JSONB now carries an explicit `approach` flag plus both the
-- payment_schedule and refund_schedule fields so every policy row
-- is self-describing. Unused fields stay as empty arrays so
-- parsing code doesn't have to special-case the other approach.
--
-- New JSONB shape:
--   {
--     "approach": "installments" | "refunds",
--     "preset": "flexible" | "moderate" | "strict" | "custom",
--     "payment_schedule": PaymentScheduleEntry[],
--     "refund_schedule": RefundWindow[],
--     "security_deposit": PaymentScheduleEntry[],
--     "custom_note": TEXT | null
--   }
--
-- PaymentScheduleEntry:
--   { due_at, days_before_checkin?, amount_type, amount }
-- RefundWindow:
--   { cutoff_days_before_checkin, refund_pct }
--
-- Destructive migration: wipes + re-seeds to the installments /
-- Moderate template. Alpha-only.
-- ============================================================

UPDATE users            SET cancellation_policy            = NULL;
UPDATE listings         SET cancellation_policy_override   = NULL;
UPDATE contact_requests SET cancellation_policy            = NULL;

-- Installments / Moderate as the platform default: 50% five days
-- before check-in, 50% at check-in. Refund schedule empty because
-- under the installments approach each payment is nonrefundable
-- once collected.
UPDATE users
SET cancellation_policy = jsonb_build_object(
  'approach', 'installments',
  'preset', 'moderate',
  'payment_schedule', jsonb_build_array(
    jsonb_build_object(
      'due_at', 'days_before_checkin',
      'days_before_checkin', 5,
      'amount_type', 'percentage',
      'amount', 50
    ),
    jsonb_build_object(
      'due_at', 'check_in',
      'amount_type', 'percentage',
      'amount', 50
    )
  ),
  'refund_schedule', '[]'::jsonb,
  'security_deposit', '[]'::jsonb,
  'custom_note', NULL
)
WHERE id IN (SELECT DISTINCT host_id FROM listings);

DO $$
DECLARE
  n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n FROM users WHERE cancellation_policy IS NOT NULL;
  RAISE NOTICE 'Two-approach reshape complete — % hosts default to installments/Moderate', n;
END $$;
