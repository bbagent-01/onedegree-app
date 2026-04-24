-- Migration 040 — Store the host-offered nightly rate + cleaning fee
-- alongside the offered total so the terms card can render a truthful
-- breakdown on the guest side.
--
-- Before this, we only stored `total_estimate` on a contact_request.
-- The terms card then computed a "Discount" line by subtracting
-- (listing_price_min × nights + listing_cleaning_fee) from the
-- offered total — which worked as long as the host only tweaked one
-- number but hid where the delta actually came from when they
-- changed both. Example: if the host waived the $110 cleaning fee
-- AND knocked $45/night off a 4-night stay, the guest saw a single
-- "Discount -$290" line that looked arbitrary.
--
-- Storing the offered breakdown means the terms card can display
-- exactly what the host offered (with optional "Listing rate $X"
-- comparison sublines) and the guest never has to guess.
--
-- Both columns are nullable for backwards compatibility with legacy
-- rows that predate this migration; the card falls back to the
-- derived view in that case.

ALTER TABLE contact_requests
  ADD COLUMN IF NOT EXISTS offered_nightly_rate INTEGER,
  ADD COLUMN IF NOT EXISTS offered_cleaning_fee INTEGER;

COMMENT ON COLUMN contact_requests.offered_nightly_rate IS
  'Whole-dollar per-night rate the host offered on this reservation. NULL for legacy rows.';
COMMENT ON COLUMN contact_requests.offered_cleaning_fee IS
  'Whole-dollar cleaning fee the host offered (0 = waived). NULL for legacy rows.';
