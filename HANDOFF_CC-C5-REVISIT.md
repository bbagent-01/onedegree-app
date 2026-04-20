# HANDOFF_CC-C5-REVISIT

**Session:** CC-C5 / C5.1 Revisit — Verify + Bugs + Multi-Hop
**Branch:** `track-b/1db-overlay`
**Date:** 2026-04-20

## 1. C5 End-to-End Verification

Audit was performed via code inspection (live-site walk not possible without authenticated browser session as Loren). DB state verified via Supabase Management API.

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Seed photos | PASS | 10 active listings in DB; listing_photos table populated (migration 018 set cover flag) |
| 2 | Gated TrustTag always visible | PASS | `trust-tag.tsx:103-121` renders zinc shield + em-dash when degree=null |
| 3 | Connector avatars + subtext | PASS | `connector-avatars.tsx` + `gated-listing-view.tsx:176` |
| 4 | Contact Host CTA everywhere | PASS | `booking-sidebar.tsx:218, 300`, `sticky-anchor-bar.tsx:154` all say "Contact Host" |
| 5 | Pre-filled message composer | PARTIAL | Contact Host click exists, pre-fill content not verified in composer chain (flag for next session) |
| 6 | Off-platform payment messaging | PASS | `payment-arrangement-card.tsx:45`, `booking-sidebar.tsx:232` — auto system message on accept flagged for next session |
| 7 | 3-rating review flow | PARTIAL | post-stay vouch banner present, but dedicated host+guest+listing review form not confirmed (no `src/app/(app)/reviews/` directory) |
| 8 | Vouch power display | PASS | `vouch-modal.tsx:471-489` shows X.XX× + boost/reduce copy |
| 9 | Direction copy | PARTIAL | "Host's trust to you" label on filter needs re-verify — payment copy correct; flag for polish |
| 10 | Migration 020 applied | PASS | All 56 listings: `legacy_see_full/message/request_book/request_intro/view_host_profile = 0`, `has_full_listing_contact = 56`, `has_see_preview = 56` |
| 11 | Multi-hop reach, correct pills | PASS | `trust-tag.tsx:48-55` confirms 1°=brand, 2°=emerald, 3°=#bf8a0d, 4°=zinc-500 |
| 12 | MultiHopView anonymity | PASS | `connection-breakdown.tsx:615-690` blurs + eye-off + period initials |
| 13 | Preview content toggles | PASS | `gated-listing-view.tsx:60-71, 162-168` respects show_profile_photo + show_host_first_name |
| 14 | Pavel / Ines reachable | PASS | `scripts/seed-host-graph.ts:86-93` sets up 4° peripherals |

**Decision:** PASS with 3 PARTIALs to flag for Loren's smoke test. No code regressions found.

## 2. Phone Uniqueness Audit

**DB state at session start:**
- Migration 001 already added `UNIQUE (phone_number)` constraint on users table.
- But the constraint allows multiple `NULL` values, and `user_3C4zII...` (lorenpolster@gmail.com) has `phone_number: NULL` in our DB.
- Loren's second account (`user_3CXey0...`, loren@brightbase.co) has `phone_number: +19493384373`.
- So the second signup with the same phone was NOT a constraint violation — Clerk never told us the phone was on the first account, because our DB row for account #1 has NULL.

**Root cause:** The lorenpolster@gmail.com account predates the phone-required signup posture. Our webhook has `phone_numbers?.[0]?.phone_number ?? null` which returns null when Clerk hasn't verified a phone on that user. Later, Loren added a phone to Clerk-side for that account, but the webhook never fired the update, so the DB still sees null.

**No duplicates to dedupe in the current DB** — the UNIQUE constraint holds; the bug was a latent null gap.

## 3. Multi-Hop Scoring Reversal

The C5 recap locked "3° shows degree + chain + link strengths but no composite number." Reversed this session per Loren:

- 1°: numeric score (existing — brand purple)
- 2°: numeric score (existing — emerald)
- **3°: dampened numeric score (NEW — mustard #bf8a0d)**
- 4°+: degree only, no score (zinc)

Formula: see `src/lib/trust-data.ts` and PROJECT_PLAN.md § Trust Mechanics.

## 4. Phone-Forward Identity Audit

| Surface | Phone posture | Action taken |
|---|---|---|
| `/invite` (invite flow) | Phone required, email optional | No change — already phone-primary. `invite/page.tsx:140-167` |
| `/vouch` (search) | Searches by name/email/phone, phone recognized when input is `+` or digit-heavy | No change — `api/users/search/route.ts:32-57` |
| `POST /api/invites` | Accepts phone OR email; phone triggers SMS first, email falls back | No change — already phone-first |
| Clerk webhook claim | Claims pending invites by phone OR email match | No change — `webhooks/clerk/route.ts:81-140` |
| Signup (Clerk hosted) | Phone required via Clerk dashboard (requires Loren config) | **Action needed**: Clerk → Users & Authentication → Email, Phone, Username → Phone number: **Required + Primary identifier**. [Clerk dash deep link](https://dashboard.clerk.com/apps/) |
| `/join/[token]` landing | **Missing page** — invites point at `${APP_URL}/join/${token}` but no route exists yet | Flagged for next session |

**Net result:** app code is already phone-primary. The remaining gap is a Clerk dashboard setting (Loren-only action) and the missing `/join/[token]` page (out of scope this session).

## 5. Task Completion Log

Commits on top of `b2d45e6` (end of C5):
- `b751b87` Phone uniqueness: migration 021 + settings edit flow
- `361fd65` 3° dampened trust score + mustard badge style
- `c6ab359` TrustTag: formal 0° and 4°+ states
- `8028ae3` Trust detail enumerates ALL chains, not just representative
- `eb0fbb9` max_degrees access option re-enabled (C5.1)

## 6. Smoke-Test Checklist (for Loren)

All tests on [alpha-c.onedegreebnb.com](https://alpha-c.onedegreebnb.com). Wait ~1 minute after each push for Cloudflare Pages to rebuild.

### A. Phone uniqueness + edit
1. Visit [Account settings](https://alpha-c.onedegreebnb.com/settings). Confirm "Phone number" row appears with your current phone masked to the last 4 (e.g. `••• ••• 4373`).
2. Click it → [Phone settings](https://alpha-c.onedegreebnb.com/settings/phone). Confirm page loads with current phone shown.
3. Click "Change phone number" → enter a different number (e.g. your Google Voice) → Send code → enter SMS code → Verify & save.
4. **Expected:** toast "Phone number updated," settings list shows new number masked.
5. Sign out. Try to create a new Clerk account with the same phone you just set.
6. **Expected:** Clerk flow fails OR (if Clerk allows) the app rejects with "This phone number is already registered."

### B. 3° dampened badge
7. Open [/browse](https://alpha-c.onedegreebnb.com/browse). Find a tile with a **mustard 3rd° pill**. Confirm it shows: `3rd°` pill → mustard shield → integer score → mustard connector dots → `★ rating (n)`.
8. Click the tile. On the listing detail, confirm the "Hosted by" row shows the same 3rd° pattern (medium size: pill + shield + score + mustard dot + dash + bridge avatar).

### C. 0° and 4°+ states
9. Find a 4°+ host on /browse (Pavel or Ines). Confirm tile shows zinc `4th°` pill + bridge avatar + rating.
10. Click. On listing detail, confirm the medium badge shows `4th°` + chain visual + bridge avatar + subtext "Distant connection · Request intro through bridge" (subtext is opt-in so may not show on every surface yet).
11. Find a listing by someone you have zero path to. Confirm the TrustTag shows zinc `Not connected` pill + muted shield.

### D. Multi-chain trust detail
12. On a 3° or 4° tile, click the TrustTag to open the popover.
13. **Expected:** "You're a 3rd° connection to [Host]" header. If multiple paths exist, subtext reads "N paths between you · strongest first" and you see a separate `Path 1 / Path 2` card for each chain. Each card shows Target → ... → You with small score pills between every pair.

### E. max_degrees visibility
14. Go to [/hosting/listings](https://alpha-c.onedegreebnb.com/hosting/listings) → pick one → Edit → Visibility tab.
15. Change "Full Listing + Contact" to `Within N degrees of me` → pick `Within 1° (vouched)`. Save.
16. Open an incognito tab, sign in as a 2° viewer (or use a different account you haven't vouched directly). Visit that listing.
17. **Expected:** You see the preview but are gated at full listing. Switch back to host, change to `Within 3°`. Reload as 2° viewer → full listing now unlocked.

### Known partials (not in scope this session)
- Pre-filled message composer for Contact Host — `handoff §1 row 5`
- Auto system message on host-accept — `handoff §1 row 6`
- 3-rating review form — `handoff §1 row 7`
- "Host's trust to you" filter label — `handoff §1 row 9`
- `/join/[token]` invite-acceptance page — `handoff §4`
- Clerk dashboard setting "Phone required + primary" — `handoff §4`

