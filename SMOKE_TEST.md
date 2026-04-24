# Smoke Test — CC-7

> Run after seeding with `npx tsx scripts/seed.ts --loren-email <your-email>`
> Run migration `003_invites_prevouch.sql` before testing invite flow.

## CC-6d Checklist (existing)

- [ ] **Login:** Sign in with Clerk. User row exists in `users` table.
- [ ] **Browse page:** `/listings` shows listing cards appropriate to vouch level.
  - Loren (with seed data) should see Park Slope, Hudson Valley, Williamsburg, West Village (preview), and UWS (inner_circle).
  - An unvouched user sees only `preview_visibility=anyone` listings.
- [ ] **UWS listing visibility:** James's UWS listing (`preview_visibility=inner_circle`) is NOT visible to standard-vouched users. IS visible to Loren (who inner_circled James, and James's listing has inner_circle preview).
  - Note: inner_circle visibility means the **host** must have inner_circled the **viewer**. Since the seed has Loren inner_circling James (not vice versa), this listing should actually NOT be visible to Loren unless James inner_circles Loren back. Verify actual behavior.
- [ ] **Vouch flow:** Click "Vouch for [Name]" on a profile → VouchModal opens → submit → vouch_power updates in DB.
- [ ] **Profile page:** `/profile/[userId]` shows correct trust metrics.
  - Own profile: 1° score says "Depends on viewer."
  - Other user: 1° score shows actual score relative to you.
  - Vouches received/given lists render correctly.
- [ ] **Create listing:** `/listings/create` → fill form → submit → new listing appears in browse.
- [ ] **Listing detail — locked state:** Click a preview-only listing → see locked banner with trust score info.
- [ ] **Listing detail — full state:** Click a full-access listing → see description, host card, amenities, "Request to Book."
- [ ] **Navigation:** Sidebar shows Browse, My Profile, Create Listing, Invite Someone, My Invites. If user has listings, "My Listings" also appears.
- [ ] **Mobile nav:** On narrow viewport, bottom tabs appear and sidebar is hidden.
- [ ] **Filter bar:** Area search filters correctly. Price range filters work. Sort options reorder.
- [ ] **Empty states:**
  - Unvouched user sees "No listings visible yet" + CTA.
  - Filtered-out results show "No listings match your filters."

## CC-7 Invite Flow Checklist

### Invite Creation
- [ ] **Nav links:** "Invite Someone" and "My Invites" appear in sidebar nav.
- [ ] **Invite page:** `/invite` loads with 3-step indicator (Contact Info → Vouch → Share Link).
- [ ] **Contact toggle:** Email/phone toggle works, input type changes.
- [ ] **Vouch form:** After entering contact, "Next" advances to vouch form (reused VouchForm component). All 3 steps present: vouch type, years known, reputation stake.
- [ ] **Generate link:** Submit creates invite → shows copyable link. "Copy" button works.
- [ ] **DB row:** Check `invites` table — row exists with inviter_id, contact info, vouch_type, years_known_bucket, token, expires_at.

### Join Flow
- [ ] **Join page (valid):** Open `/join/[token]` in incognito → see inviter name, platform description, "Sign Up" button.
- [ ] **Join page (expired):** Update `expires_at` to past in DB → refresh → see "Invite Expired" error.
- [ ] **Join page (claimed):** Set `claimed_by` to a user ID → refresh → see "Already Used" error.
- [ ] **Join page (invalid token):** Visit `/join/bogus-token` → see "Invalid Invite Link" error.
- [ ] **Signup flow:** Click "Sign Up" → Clerk signup modal opens → complete with phone → redirected to `/join/[token]/claim`.
- [ ] **Claim processing:** After claim:
  - invite.claimed_by = new user's ID
  - invite.claimed_at is set
  - A vouch row exists: voucher_id = inviter, vouchee_id = new user, matching vouch_type and years_known_bucket
  - Inviter's vouch_power recalculated (check users table)
  - Redirected to `/listings` (with welcome toast)

### My Invites
- [ ] **My Invites page:** `/my-invites` shows pending invites with copyable links and expiry countdown.
- [ ] **Claimed section:** After an invite is claimed, it moves to "Joined" section with the new user's name and join date.
- [ ] **Empty state:** New user with no invites sees "No invites yet" with CTA.

### SIGNUP_MODE Feature Flag
- [ ] **invite-only mode (default):** Visit `/sign-up` directly → see "Trustead is Invite-Only" message.
- [ ] **open mode:** Set `SIGNUP_MODE=open` in `.env.local` → Visit `/sign-up` → Clerk signup form appears normally.
- [ ] **Invite link in open mode:** Invite links still work and apply pre-vouch even when signup is open.

### Clerk Webhook (Phone Sync)
- [ ] **Phone number synced:** After signup with phone, check `users` table → `phone_number` column populated.

## Notes

- The seed script creates fictional users with `@seed.1db` emails. They can't log in via Clerk — they're data-only.
- To test as a "second user," create another Clerk account and have Loren vouch for them.
- The `--clean` flag wipes all `@seed.1db` data and re-seeds.
- **SIGNUP_MODE** env var defaults to `invite-only`. Set to `open` to allow direct signups.
- Invite links expire after 7 days. Token is auto-generated (32-byte hex).
