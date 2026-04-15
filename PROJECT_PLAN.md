# One Degree B&B — Project Plan

> Last updated: April 15, 2026

## Overview

One Degree B&B (1DB) is a trust-based short-term rental platform — "Airbnb meets Hinge." Listings are private and only visible through personal networks and vouches. Guests must be vouched for by someone the host trusts. Payments happen off-platform (Venmo/Zelle). The platform facilitates introductions, not transactions.

## Domains & URLs

| Resource | URL |
|---|---|
| Landing page | https://onedegreebnb.com |
| Clean Airbnb clone (rollback) | https://alpha-b.onedegreebnb.com |
| 1DB overlay (testing) | https://alpha-c.onedegreebnb.com |
| Production (after B9) | https://app.onedegreebnb.com |
| GitHub repo (app) | https://github.com/bbagent-01/onedegree-app |
| GitHub repo (landing) | https://github.com/bbagent-01/onedegree-bnb |

## Local Folders

| Folder | Branch | Purpose |
|---|---|---|
| `~/Claude/Projects/onedegree-app-track-b` | `track-b/airbnb-clone` (B6c) or `track-b/1db-overlay` (B7+) | Primary build |
| `~/Claude/Projects/onedegree-app` | `main` | Track A (abandoned) |
| `~/Claude/Projects/onedegree-bnb` | `main` | Landing page |

## Branch Safety

**Run `git branch --show-current` before writing any code in every CC session.**

| Folder | Expected Branch | If Wrong |
|---|---|---|
| onedegree-app-track-b (B6c and earlier) | `track-b/airbnb-clone` | STOP — wrong branch. Never checkout main. |
| onedegree-app-track-b (B7a and later) | `track-b/1db-overlay` | STOP — wrong branch. Never checkout main. |
| onedegree-app | `main` | Track A — abandoned, do not use for new sessions. |

**Never run `git checkout main` from the Track B folder.**
**Never commit to `main` from the Track B folder.**

## Stack

- **Framework:** Next.js 15 (App Router)
- **UI:** shadcn/ui (base-nova), Tailwind CSS
- **Auth:** Clerk v7
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage (photos)
- **Email:** Resend (notifications@onedegreebnb.com)
- **Hosting:** Cloudflare Pages
- **Cron:** Cloudflare Worker (onedegree-cron-worker, hourly at :07)
- **Fonts:** DM Sans (body) + JetBrains Mono (data/scores)

## Build Architecture

**Track A (abandoned):** Incremental feature builds on original scaffold. Sessions CC-5 through CC-9a. No longer in development.

**Track B (primary build):**
- **B2–B6c:** Pure Airbnb clone — no trust mechanics, all listings visible to all users, standard "Reserve" flow
- **B7a–B7d:** 1DB trust overlay — adds visibility gating, vouching, invite flow, trust UI, branding on top of the polished Airbnb clone
- **B8:** Legal pages — terms, privacy, community guidelines
- **B9:** Smoke test + promote to production

### Branches

| Branch | Deploy | Purpose |
|---|---|---|
| `track-b/airbnb-clone` | alpha-b.onedegreebnb.com | Clean Airbnb clone — rollback point if overlay breaks things |
| `track-b/1db-overlay` | alpha-c.onedegreebnb.com | 1DB trust mechanics on top of clone — production target |
| `main` | app.onedegreebnb.com | Production — promoted from 1db-overlay after B9 |

## Session Status

### Completed (on track-b/airbnb-clone)
- **CC-B1:** ✅ Reference extraction — analyzed 3 open-source Airbnb clones, produced component specs + design tokens
- **CC-B2:** ✅ Foundation — layout shell, nav, listing card (Embla carousel), category filter bar, responsive grid, trust badge component
- **CC-B3a:** ✅ Browse + search — real data from Supabase, search bar (location/dates/guests), sort options, URL state
- **CC-B3b:** ✅ Filters + map — price range, property type, beds/baths, amenities filters, Leaflet split-screen map
- **CC-B4:** ✅ Listing detail — 5-image photo gallery + lightbox, booking sidebar, content sections, reviews, host card
- **CC-B5a:** ✅ Host dashboard — stats cards, reservation management (approve/decline), listings grid, active/paused toggle
- **CC-B5b:** ✅ Create/edit listing — 7-step wizard, photo upload + drag-reorder, calendar management, tabbed edit form
- **CC-B6a:** ✅ Booking + messaging — booking request flow, threaded inbox, Supabase Realtime, approve/decline from inbox
- **CC-B6b:** ✅ Trips + notifications — My Trips page, system messages, Resend email (6 categories), cron worker, review system

### Next (on track-b/airbnb-clone)
- **CC-B6c:** 📋 Wishlist, profile view/edit, help center + FAQ, settings page

### Upcoming (on track-b/1db-overlay — new branch from airbnb-clone)
- **CC-B7a:** 📋 Trust infrastructure — trust score computation, visibility gating, blurred previews, TrustBadge/ConnectionPath/TrustGate components
- **CC-B7b:** 📋 Vouch + invite flows — 3-question vouch modal (1/6/8/10 scale), post-stay prompts, invite non-member, network dashboard section
- **CC-B7c:** 📋 Trust UI integration — Reserve → Contact Host, trust indicators everywhere, profile trust sections, trust gate in create/edit listing
- **CC-B7d:** 📋 Branding + sparse-state — copy/tone pass, logo, adaptive grid for low inventory, network-growth empty states

### Final
- **CC-B8:** 📋 Legal pages — Terms of Service (Craigslist-style posture), Privacy Policy, Community Guidelines, cookie consent
- **CC-B9:** 📋 Smoke test + production — full flow test, bug fixes, promote to app.onedegreebnb.com

## Database Schema

### Existing Tables (migrations 001–010)
- **users** — synced from Clerk via webhook. Fields: id, clerk_id, email, first_name, last_name, profile_image_url, trust_score, vouch_power, guest_rating, host_rating, email_prefs (JSONB), created_at, updated_at
- **vouches** — directed trust edges. Fields: voucher_id, vouchee_id, trust_level (1/6/8/10), years_known, reputation_stake (1–10), confirmed_at, is_post_stay
- **invites** — non-member invitations. Fields: id, inviter_id, invitee_email, invitee_name, vouch_data (JSONB), status, created_at
- **listings** — property listings. Fields: id, host_id, title, description, nightly_rate, cleaning_fee, city, state, lat, lng, max_guests, bedrooms, beds, bathrooms, property_type, space_type, amenities (JSONB), house_rules (JSONB), photos (JSONB), status, min_stay, check_in_time, check_out_time, created_at, updated_at
- **listing_availability** — date-level availability. Fields: id, listing_id, date, status (available/blocked), custom_price, created_at
- **contact_requests** — booking requests. Fields: id, listing_id, guest_id, host_id, message, check_in, check_out, guests, total_estimate, status (pending/accepted/declined/cancelled), cancelled_at, cancelled_by, checkin_reminder_sent_at, review_prompt_sent_at, created_at, updated_at
- **reviews** — post-stay reviews. Fields: id, booking_id, reviewer_id, reviewee_id, listing_id, rating, cleanliness, accuracy, communication, checkin, location, value, text, created_at
- **message_threads** — conversation threads. Fields: id, listing_id, guest_id, host_id, booking_id, created_at, updated_at
- **messages** — individual messages. Fields: id, thread_id, sender_id, content, is_system, created_at

### Tables to be created (B6c)
- **saved_listings** — wishlist/favorites. Fields: user_id, listing_id, created_at

### Tables to be created (B7a)
- **listings.min_trust_gate** — new column (integer, default 0)

### Schema Coordination Rule
Before creating any new table in a CC session, check if it already exists. If it exists, use its schema exactly. New tables or columns documented in `TRACK_B_SCHEMA_CHANGES.md`.

## Migrations Applied

| # | File | What it adds |
|---|---|---|
| 001–007 | Core tables | users, vouches, listings, bookings, reviews, invites, contacts |
| 008 | `008_trips_notifications.sql` | users.email_prefs, contact_requests.cancelled_at/by, status enum |
| 009 | `009_reminder_tracking.sql` | contact_requests.checkin_reminder_sent_at, review_prompt_sent_at |
| 010 | `010_contact_request_total.sql` | contact_requests.total_estimate |
| 011 | `011_wishlists_profiles_support.sql` | saved_listings, support_requests, users profile columns |
| 012 | `012_named_wishlists.sql` | wishlists table, saved_listings reshape for named collections |
| 013 | `013_min_trust_gate.sql` | listings.min_trust_gate — per-listing trust visibility threshold |

## Infrastructure

| Component | Details |
|---|---|
| Resend | API key in .env.local + CF Pages env. Sends from notifications@onedegreebnb.com. 6 email categories. |
| Cron worker | `onedegree-cron-worker` at workers.dev. Cron `7 * * * *` (hourly at :07). Posts to /api/cron/check-reminders. |
| Cache headers | `public/_headers` — fresh HTML every visit, immutable bundles. |
| Deploy (alpha-b) | GitHub Actions → Cloudflare Pages, branch: track-b/airbnb-clone |
| Deploy (alpha-c) | Cloudflare Pages, branch: track-b/1db-overlay (set up in B7a) |

## Environment Variables (shared across all deploys)

All env vars are identical across alpha-b, alpha-c, and production. Stored in .env.local and Cloudflare Pages dashboard.

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `CRON_SECRET`

## Trust Mechanics (implemented in B7)

### Trust Score Computation
- Direct vouch (1st degree): trust_level × years_known_multiplier × reputation_stake × voucher's vouch_power
- Indirect path (2nd degree): computed through intermediary connections
- Composite: base (best single vouch) + confidence bonus (diminishing returns from additional vouches)

### Years Known Multipliers
- <1 year: 0.6x
- 1–3 years: 1.0x
- 3–5 years: 1.2x
- 5–10 years: 1.5x
- 10+ years: 1.8x

### Vouch Scale (locked)
- 1 = "I know of them" (acquaintance)
- 6 = "I'd vouch for them" (friend)
- 8 = "I'd trust them in my home" (close friend)
- 10 = "They're family" (unconditional trust)
- Scale intentionally skips 2–5, 7, 9.

### Post-Stay Vouch Rule
Post-stay vouches force "Less than 1 year" bucket — non-overridable.

### Platform Posture
Craigslist-style: facilitates introductions, not party to agreements. Does NOT process payments, is NOT a booking service. All financial arrangements happen directly between parties.

## Instruction Preferences for CC Sessions

Every Claude Code session and agent working on this project must follow these rules:

1. **Before asking me to do any technical step, check if it can be done via CLI, API, script, or code. If yes, do it yourself — do not ask me first.**
2. If a step genuinely requires me (credential in a browser, paid action, irreversible prod change), then ALL of the following are mandatory:
   - a. Use numbered steps. One action per step. Never combine multiple clicks into one step.
   - b. Every URL I need to visit must be a clickable hyperlink, and it must deep-link to the exact page — never just the homepage.
   - c. Every string I need to copy/paste/type goes in its own fenced code block. Never inline inside a sentence.
   - d. Tell me exactly which button to click, which field to paste into, which menu item to pick. Assume zero technical knowledge.
   - e. End with a verification step: "you should see X" so I know it worked.
3. If a step needs a credential or token I don't have, give me the exact deep link to create it AND explain how to save it so you can use it automatically next time (e.g. "paste this line into .env.local: `FOO=bar`").
4. Never say "run X" or "open Y" without specifying the app, the menu path, and the exact command or button.
5. After every code change, commit and push immediately. Don't wait for me to ask.
6. Every push message must end with a deep-link to the exact alpha page/route I should test, not just "deploys in ~1 min".

## Session Naming Convention
- Track B: `1DB - Alpha-B - CC-B# - Name`
- Track A (abandoned): `1DB - Alpha-A - CC-# - Name`
