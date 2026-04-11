# Smoke Test — CC-8

> Run after running migration `004_cc8_contact_reviews_tools.sql` in the Supabase SQL Editor.
> Existing seed data from CC-6d should still work.

## Prerequisites

1. Run migration `supabase/migrations/004_cc8_contact_reviews_tools.sql` in Supabase SQL Editor.
2. Re-run seed data if needed: `npx tsx scripts/seed.ts --loren-email <your-email>`
3. Log in as Loren (your real Clerk account).

## CC-8 Checklist

### Contact Request Flow
- [ ] **Send contact request:** Go to a listing you have full access to (e.g., Park Slope). Click "Request to Book" → fill form (dates, guest count, message) → submit. Check `contact_requests` table for new row with correct host_id, guest_id, message.
- [ ] **Host sees request:** Go to Dashboard → "Pending Requests" tab shows the new request with guest info.
- [ ] **Host accepts:** Click "Respond" → Accept → request status changes to "accepted". Guest sees "Accepted" badge on My Trips.
- [ ] **Host declines:** (test with a second request) → Decline with message → status = "declined", guest sees decline + message.

### Stay Confirmation + Review
- [ ] **Initiate stay confirmation:** After acceptance, go to My Trips → click "Confirm Stay" on accepted request → creates stay_confirmation row.
- [ ] **Both confirm:** Host confirms from Dashboard, guest confirms from My Trips → both_confirmed = true.
- [ ] **Host reviews guest:** Dashboard → Completed → "Review Guest" → rate 1-5★ + optional text → submit → `stay_confirmations.guest_rating` set. Check `users.guest_rating` and `guest_review_count` updated for the guest. Check `vouch_power` trigger fired for vouchers of that guest.
- [ ] **Guest reviews host + listing:** My Trips → Past Stays → "Review Host & Listing" → rate host 1-5★ + listing 1-5★ + optional text → submit → `stay_confirmations.host_rating` and `listing_rating` set. Check `users.host_rating` and `host_review_count` updated. Check `listings.avg_listing_rating` and `listing_review_count` updated.

### Post-Stay Vouch
- [ ] **Vouch prompt appears:** After host submits guest review, "Vouch for [guest]?" prompt appears.
- [ ] **Years locked:** Click "Yes, vouch" → VouchModal opens with years_known_bucket locked to "Less than 1 year" (greyed out).
- [ ] **Vouch saved:** Submit vouch → vouch row created with `stay_confirmation_id` set and `years_known_bucket = lt1yr`.
- [ ] **Skip works:** Click "No thanks" → prompt disappears, no vouch created.

### Incident Recording
- [ ] **Report from review flow:** In Dashboard review dialog, click "Report an incident instead" → incident form opens.
- [ ] **Submit incident:** Select severity + handling + optional description → submit → row in `incidents` table.
- [ ] **No score impact:** Verify user scores unchanged after incident report.

### Tools (V1 Stubs)
- [ ] **Tools hub:** Navigate to /tools → see 4 tool cards (House Manual, Rental Agreement, Security Deposit, Property Photos).
- [ ] **House manual:** Click House Manual → enter listing ID → fill sections → Save → row in `house_manuals` table with JSONB content.
- [ ] **Rental agreement:** Click Rental Agreement → fill form → Save → "Generate Preview" shows formatted text → row in `rental_agreements`.
- [ ] **Security deposit:** Click Security Deposit → enter amount + terms → Save → row in `security_deposits`.
- [ ] **Property photos:** Click Property Photos → see upload stubs (disabled for V1).

### Dashboard
- [ ] **Summary cards:** Dashboard shows correct counts — active listings, pending requests, completed stays, avg rating.
- [ ] **Pending tab:** Shows incoming requests with guest info + accept/decline.
- [ ] **Upcoming tab:** Shows confirmed future stays.
- [ ] **Completed tab:** Shows past stays with review status.
- [ ] **Listings tab:** Shows host's active listings with rating info.

### My Trips
- [ ] **Pending tab:** Shows guest's pending requests waiting for host response.
- [ ] **Upcoming tab:** Shows confirmed future stays with confirm button if needed.
- [ ] **Past tab:** Shows completed stays with reviews left and received.

### Navigation
- [ ] **Dashboard link:** Appears in sidebar for users with listings.
- [ ] **My Trips link:** Appears for all users.
- [ ] **Tools link:** Appears for users with listings.
- [ ] **Mobile bottom nav:** Shows Browse, My Trips, Dashboard (or Create for non-hosts), Profile.

## Notes

- Contact requests use `host_id` denormalized from listings for fast dashboard queries.
- Rating recalculation uses running averages (no aggregation queries needed on read).
- The `trg_vouch_power` trigger cascades from guest_rating updates — verify it fires when host reviews guest.
- Tools pages accept listing IDs pasted from URLs. A proper listing dropdown selector is Phase 3.
- Property photos upload is fully stubbed — upload buttons are disabled.
