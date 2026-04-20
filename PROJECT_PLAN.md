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

### 1° Vouch Score (between two users)
For each mutual connector: `path_strength = avg(your_vouch_score_for_connector, connector_vouch_score_for_target × connector_vouch_power)`
Sort all path strengths descending: p1 ≥ p2 ≥ p3 ≥ … ≥ pN
`1° vouch score = Σ (pi / i) for i = 1 to N` (harmonic dampening)
Weights: P1 = 1.0, P2 = 0.5, P3 = 0.333, P4 = 0.25, etc.
One strong connection outweighs many weak ones.

### 3° and 4° Dampened Scores (CC-C5 Revisit, v2 2026-04-20)
For a multi-hop chain `[viewer, ..., target]` with hop strengths `h1..hN`:
- `3° score = avg(h1, h2, h3) × 0.66` (rounded, clamped [0, 100])
- `4° score = avg(h1, h2, h3, h4) × 0.5` (rounded, clamped [0, 100])

Rationale: the mean captures the overall quality of the chain rather than being hostage to a single weak link; the dampening factors stay modest at 3° (0.66) and heavier at 4° (0.5) so more hops translate into a visibly lower score. Each hop strength is the directional `vouch_score` (or the reverse if only that exists). Badges: 3° mustard pill + shield + score, 4° zinc pill + shield + score.

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

---

# Standing Rules — Read Before Every Session

## 1. Autonomous Execution (NON-NEGOTIABLE)

Loren is non-technical. Claude must ALWAYS attempt to complete tasks autonomously. Asking Loren to do something is the exception, not the norm.

**Always attempt first:**
- Running migrations (use Supabase CLI, MCP, or credentials in .env.local)
- Installing packages, running scripts, executing commands
- Reading files, searching the codebase, inspecting the database
- Deploying code (git push triggers deploy)
- Debugging by reading logs, testing endpoints, inspecting schema

**Only ask Loren when genuinely blocked:**
- Personal account credentials Claude cannot access
- Manual approval in a third-party UI Claude cannot automate (DNS settings, billing, OAuth consent screens)
- Product decisions requiring Loren's judgment (copy tone, feature choices)

**When asking is unavoidable, EVERY request must include:**
- A clickable hyperlink to the EXACT page (not "go to Cloudflare" — link to https://dash.cloudflare.com/[account_id]/pages/view/[project]/settings)
- Numbered or bulleted steps assuming zero prior context and zero technical knowledge
- A copy-block for EVERY piece of text Loren needs to enter anywhere — form field values, search terms, button labels, config keys, commit messages, URLs, everything
- Visual landmarks when useful ("the button is top-right, blue, labeled 'Deploy'")

**Never say:** "Go to X and do Y."
**Always say:** "Click [this exact URL](https://...). You'll land on a page with a field labeled `Name` — paste this value: `[copy block]`. Then click the button labeled `Save` in the top-right corner."

Every time Claude is about to ask Loren to do something, pause and ask: can I do this myself? If the answer is even possibly yes, try first.

## 2. End-of-Session Recap (Required Output)

Every session ends with a structured recap in ONE copy-block in this exact format:

## CC-[ID] — [Name]
**Date:** [YYYY-MM-DD]
**Branch:** [branch name]
**Commits:** [hash, hash, ...]

### What was done
- [bullets]

### What was preserved
- [backward-compat items kept intact, deprecated-but-not-deleted files, etc.]

### Corrections made during session
- [Bugs in the spec, wrong expected values, missed edge cases, mid-session changes Loren requested. Each correction includes a one-line "lesson" for future sessions. If no corrections were needed, write "None."]

### What's needed next
- [Explicit handoff to next session — blockers, prerequisites, open questions]

The recap must be wrapped in a single copy-paste-ready block. No markdown tables, no split sections.

## 3. Branch Safety

**Run `git branch --show-current` before writing any code in every CC session.**

| Folder | Expected Branch | If Wrong |
|---|---|---|
| onedegree-app-track-b | `track-b/1db-overlay` | STOP — wrong branch. Never checkout main. |

**Never run `git checkout main` from the Track B folder.**
**Never commit to `main` from the Track B folder.**

## 4. Testing Handoff (Claude Tells Loren What to Test)

Before producing the final session recap, Claude tells Loren what to test. Loren does not know the build details and is not reading the code — Claude is responsible for translating the session's output into a concrete test walkthrough.

**The testing handoff must include:**
- A short plain-language summary of what was built (1–3 sentences, no jargon)
- A numbered list of specific things to verify, each with:
  - The exact URL to visit (clickable hyperlink)
  - Zero-assumption click-path ("Click the button labeled X in the top-right")
  - What Loren should see if it's working
  - What Loren should see if it's broken
  - Any text to paste provided as a copy-block

Wait for Loren to confirm the tests pass (or report issues) before producing the recap. If Loren reports an issue, fix it in the same session and re-propose the test.

**Never ask Loren "what do you want to test?" — Claude proposes the tests. Loren executes and confirms.**

## 5. No Assumptions About Loren's Technical Knowledge

Loren is the founder, not an engineer. Assume zero knowledge of:
- Git commands, terminal syntax, npm scripts
- Database schemas, SQL, Supabase internals
- Cloudflare, Clerk, deployment pipelines
- React component structure, TypeScript types, file paths

If any instruction or test step requires technical knowledge, rewrite it in plain language with the exact steps and copy-blocks needed.
