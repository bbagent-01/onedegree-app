# One Degree B&B — Project Plan

> Last updated: April 15, 2026 · Alpha-C phase

## Overview

One Degree B&B (1DB) is a trust-based short-term rental platform — "Airbnb meets Hinge." Listings are private and only visible through personal networks and vouches. Guests must be vouched for by someone the host trusts. Payments happen off-platform (Venmo/Zelle). The platform facilitates introductions, not transactions.

## Domains & URLs

| Resource | URL |
|---|---|
| Landing page | https://onedegreebnb.com |
| Clean Airbnb clone (rollback) | https://alpha-b.onedegreebnb.com |
| 1DB overlay (Alpha-C testing) | https://alpha-c.onedegreebnb.com |
| Production (after CC-C8) | https://app.onedegreebnb.com |
| GitHub repo (app) | https://github.com/bbagent-01/onedegree-app |
| GitHub repo (landing) | https://github.com/bbagent-01/onedegree-bnb |

## Local Folders

| Folder | Branch | Purpose |
|---|---|---|
| `~/Claude/Projects/onedegree-app-track-b` | `track-b/1db-overlay` | Primary build (Alpha-C) |
| `~/Claude/Projects/onedegree-app` | `main` | Track A (abandoned) |
| `~/Claude/Projects/onedegree-bnb` | `main` | Landing page |

## Branch Safety

**Run `git branch --show-current` before writing any code in every CC session.**

| Folder | Expected Branch | If Wrong |
|---|---|---|
| onedegree-app-track-b | `track-b/1db-overlay` | STOP — wrong branch. Never checkout main. |

**Never run `git checkout main` from the Track B folder.**
**Never commit to `main` from the Track B folder.**

## Stack

- Next.js 15 (App Router) on Cloudflare Pages
- Supabase (Postgres + Auth helpers + Realtime + Storage)
- Clerk v7 (auth)
- shadcn/ui + Tailwind CSS
- Resend (transactional email via Cloudflare Worker)
- TypeScript throughout

## Trust Mechanics (Alpha-C Model)

### Vouch Score
`vouch_score = base_points × years_known_multiplier`

| Vouch Type | Base Points |
|---|---|
| Standard | 15 |
| Inner Circle | 25 |

| Years Known | Multiplier |
|---|---|
| <1 year | 0.6× |
| 1–3 years | 1.0× |
| 3–5 years | 1.2× |
| 5–10 years | 1.5× |
| 10+ years | 1.8× |

### Vouch Power
Auto-derived from the average guest_rating of everyone a user has vouched for.
- Baseline: 4.0 = 1.0× (neutral)
- Scale: rating / 4.0, clamped to [0.5, 1.5]
- No data = 1.0× (benefit of doubt)

### 1° Score (between two users)
For each mutual connector: `path_strength = avg(your_vouch_score_for_connector, connector_vouch_score_for_target × connector_vouch_power)`
`1degree_score = Σ path_strengths`

### Three Rating Types (post-stay)
- Guest Rating (1–5★) — host rates guest behavior → feeds vouch power
- Host Rating (1–5★) — guest rates host behavior
- Listing Rating (1–5★) — guest rates the place

### Listing Visibility
Three modes: public, preview_gated (default), hidden.
Per-action access_settings JSON controls: see_preview, see_full, request_book, message, request_intro, view_host_profile.
Alpha access types: "anyone", "min_score" (threshold), "max_degrees" (hop count), "specific_people" (user_ids).

### Platform Posture
1DB facilitates introductions. It does NOT process payments, is NOT party to rental agreements, and does NOT operate as a booking service. All financial arrangements happen directly between parties off-platform.

## Schema (Alpha-C)

### Core tables (from Airbnb clone)
users, listings, bookings, reviews, messages, message_threads, wishlists, listing_photos, listing_amenities

### Trust tables (Alpha-C additions)
- **vouches** — voucher_id, vouchee_id, vouch_type (standard/inner_circle), years_known_bucket, vouch_score (computed), is_post_stay, is_staked, source_booking_id
- **invites** — inviter_id, invitee_phone, invitee_email, invitee_name, pre_vouch_data (jsonb), status, claimed_by

### Column extensions (Alpha-C)
- **users**: phone_number, vouch_power, guest_rating_avg, host_rating_avg, vouch_count_given, vouch_count_received
- **listings**: visibility_mode, preview_photos (jsonb), preview_description, access_settings (jsonb)
- **reviews**: guest_rating, host_rating, listing_rating

## Alpha-C Session Sequence
CC-C0 (smoke test agent, deferred) → CC-C1a (schema + core computation) → CC-C1b (degrees + seed data) → CC-C2 (vouch + invite flows) → CC-C3 (listing visibility + host controls) → CC-C4 (trust UI integration) → CC-C5 (contact flow + reviews) → CC-C6 (branding + polish) → CC-C7 (legal) → CC-C8 (smoke test + ship)
