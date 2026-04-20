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

## 4. Task Completion Log

See commit log on `track-b/1db-overlay` for per-task commits. Summary in the session recap at end of this file (populated after commits land).
