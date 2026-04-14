# One Degree BNB — Project Plan

> Last updated: April 13, 2026

## What This Is

One Degree BNB is a private rental network where every guest is vouched for by someone the host trusts. People already rent their homes to friends of friends — over text, email, Facebook groups. This is the platform for that behavior.

- Private listings invisible to the public
- Guests vetted through personal vouching
- Hosts control exactly who sees their home
- Payments handled directly between host and guest (Venmo/Zelle) — platform never touches rental money

This is not for vacation rentals or commercial hosting. It's for monetizing primary homes that sit empty while the owner travels.

## Who It's For

**ICP 1: The Reluctant Host** — Owns a primary home (apartment or weekend house). Would rent it when traveling but won't put it on Airbnb because it's their real home with their stuff and neighbors. Would say yes to a friend's friend in a heartbeat.

**ICP 2: The Under-the-Radar Renter** — Has an apartment where the lease or local regulations make public listing risky or impossible. STR rules (e.g., NYC 30-day minimum) target public platforms. Private arrangements between trusted people are different. Guest is vetted, listing is invisible, no public record.

Both groups are aged 25–45, travel regularly, and are already doing this informally.

## URLs & Repos

| Component | URL / Location |
|-----------|---------------|
| Landing page | https://onedegreebnb.com |
| MVP app | https://app.onedegreebnb.com (migrating to alpha-a.onedegreebnb.com) |
| Landing repo | bbagent-01/onedegree-bnb (Cloudflare Pages, auto-deploy on push to main) |
| App repo | bbagent-01/onedegree-app (GitHub Actions → Cloudflare Pages) |
| Landing local | ~/Dropbox/Claude/Projects/onedegree-bnb |
| Notion SOT | Page ID 33384c6b-0fdc-811b-8ff1-c7d49dc71b79 |
| Domains | onedegreebnb.com (primary), 1degreebnb.com (redirect), app.onedegreebnb.com (app) |
| Track B app | https://alpha-b.onedegreebnb.com (branch: track-b/airbnb-clone) |

## ⚠️ Branch Safety — READ BEFORE EVERY SESSION

Two tracks share one repo. **Working on the wrong branch has happened repeatedly.** Every CC session MUST verify its branch before writing any code.

| Track | Branch | Deploy URL |
|-------|--------|------------|
| **Track A** (Alpha-A sessions) | `main` | alpha-a.onedegreebnb.com |
| **Track B** (Alpha-B sessions) | `track-b/airbnb-clone` | alpha-b.onedegreebnb.com |

**Mandatory first command in every session:**
```bash
git branch --show-current
```
- If the output does NOT match the expected branch for this track → **STOP. Do not write any code.** Switch to the correct branch first.
- Track A sessions: expected output is `main`. If you see `track-b/airbnb-clone`, run `git checkout main`.
- Track B sessions: expected output is `track-b/airbnb-clone`. If you see `main`, run `git checkout track-b/airbnb-clone`.
- **Never commit Track A work to track-b/airbnb-clone or Track B work to main.**

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Clerk v7 (Google + email) |
| Storage | Supabase Storage |
| Email | Resend (from loren@onedegreebnb.com) |
| Styling | Tailwind CSS + shadcn/ui |
| Deploy (landing) | Cloudflare Pages (direct) |
| Deploy (app) | GitHub Actions → Cloudflare Pages |
| Waitlist backend | Cloudflare Worker → CF KV |
| Analytics | Cloudflare Web Analytics |
| Ads tracking | GTM (GTM-K54LNGVF) + gtag.js |

## Locked Decisions (Phase 2)

These are final. All CC sessions build to this spec.

### 1. Invite-only platform (feature flag for open signup)
- Users can only join if invited by an existing member
- When you invite someone, you vouch for them — same 3-question flow, your reputation on the line
- No way to bring someone onto the platform without putting your name behind them
- Env var `SIGNUP_MODE` (default: `invite-only`) allows flipping to open signup without code changes
- When open: anyone can sign up but needs vouches to access listings, inviting and vouching separate

### 2. Vouch or nothing
- No "connected" tier below vouch
- No mass-import of contacts as weak signals
- Every edge in the trust graph is a deliberate vouch

### 3. Two-tier vouching: standard (15 pts) + inner circle (25 pts)
- Standard vouch = 15 base points
- Inner circle = 25 base points
- Two radio buttons in the vouch flow

### 4. Incidents recorded, not auto-scored
- Incidents are recorded (severity + handling) for data collection
- No automatic penalties on scores from incidents
- Guest rating moves only from post-stay star reviews (1–5)
- Vouch power auto-derives from guest ratings of vouchees and acts as multiplier on connector vouch scores

### 5. Phone number as identity anchor
- Every account requires a verified phone number (SMS code via Clerk)
- One phone = one person — prevents mass fake accounts
- Enables pre-vouch by phone: vouch for someone's number before they sign up, vouch attaches when they create an account
- Beta enhancement: Twilio Lookup API to flag VoIP/burner numbers (not blocking for alpha)

## Trust System — Three Metrics

Every user has three independent scores that together create a trust composite.

### 1° Score (e.g., 72 (3))
- How connected a guest is to you, through your network
- Viewer-relative — calculated from shared connections between you and the guest
- For each shared connection: path = avg(your vouch of connector, connector's vouch of guest × vouch power factor)
- The "(3)" means 3 of your connections vouch for this person
- A host sees the score, WHO connects them, and the strength of each link
- Changes only from vouches — never reviews or incidents

### Guest Rating (e.g., 4.2★ (5 stays))
- 1–5 star average from post-stay reviews as a guest
- Only changes via reviews — nothing else

### Host Rating (e.g., 4.6★ (3 stays))
- 1–5 star average from post-stay reviews as a host
- Separate from guest rating — someone can be a great guest but mediocre host

### Listing Rating (e.g., 4.0★)
- 1–5 star review of the place itself, per-listing
- A great host can have an average listing

### Vouch Power (e.g., 4.1)
- Average guest rating of everyone you've vouched for
- Auto-derived — nobody rates your vouching directly
- Acts as a multiplier on connector's vouch score: VP / 4.0 (so 4.0 = 1.0× baseline)
- Self-regulating: vouch for bad guests, your vouch power drops, your endorsements carry less weight

### Post-Stay Vouch (Optional)
- A completed stay is NOT an automatic vouch — review and vouch are separate actions
- Post-stay flow: (1) rate the stay (required, 1–5 stars) then (2) optionally vouch for the guest
- If host vouches post-stay, years known auto-sets to <1 year (0.6× multiplier)
- A guest can have a strong guest rating but low 1° score if hosts aren't vouching after stays

## The 3-Question Vouch Flow

Each vouch assigns a point value to a specific connection between two people.
Formula: `vouch points = base points × years multiplier`

### Step 1: Vouch Type
- Standard vouch → 15 base points
- Inner circle ★ → 25 base points

### Step 2: Years Known
| Bucket | Multiplier |
|--------|-----------|
| <1 year | 0.6× |
| 1–3 years | 0.8× |
| 4–7 years | 1.0× |
| 8–15 years | 1.4× |
| 15+ years | 1.8× |

### Step 3: Reputation Stake
Checkbox: "I understand my vouch power will be affected if this person causes problems for a host." Must check to submit.

### How Trust Flows: The 1° Chain
Trust is always contextual to the viewer. When a host evaluates a guest, the signal comes from the chain:

**You (host) → Connectors (your friends) → Guest (person you don't know)**

What the host sees for a guest:
- **1° score** — calculated from averaged vouch scores on both sides of each connection path, with vouch power applied
- **Who connects them** — which of the host's connections vouch for this guest
- **How much the host trusts each connector** — the host's own vouch type + years for each connector
- **How much each connector trusts the guest** — the connector's vouch type + years for the guest
- **Each connector's vouch power** — how reliable are this connector's endorsements historically

A stranger on Airbnb has 50 reviews from people you'll never meet. A 1° guest has 3 vouches from people you personally know and trust.

### Example Values
| You vouch for… | Type (base pts) | Years known | Points |
|----------------|----------------|-------------|--------|
| College friend Jake | Standard (15) | 8 yr (1.4×) | 21 pts |
| Best friend Maya | Inner circle (25) | 20 yr (1.8×) | 45 pts |
| Coworker David | Standard (15) | 2 yr (0.8×) | 12 pts |
| Close new friend Priya | Inner circle (25) | <1 yr (0.6×) | 15 pts |

## Listing Visibility

Every listing has two layers. Hosts control who sees each one independently.

### Preview (Anonymous)
- General neighborhood (not exact location)
- Price range per night
- Availability window
- 2–3 curated photos
- Host trust metrics — degree score, guest rating (anonymous — no name or photo)

### Full Listing (Gated by Trust)
- Specific location + cross streets
- Host identity (name, photo, bio)
- Full photo gallery
- House rules + amenities
- Exact price + calendar
- Contact / request-to-book button

### Host Controls
Hosts set access requirements independently for each action. Options for each:
- Anyone on platform (even unvouched)
- Any vouched user (has ≥1 vouch)
- Minimum degree score (host sets threshold)
- Minimum guest rating (host sets threshold)
- Inner circle only
- Specific people (hand-picked)

Actions hosts control:
- **See preview** — can this person see the listing exists?
- **See full listing** — can they see host identity, full photos, exact location?
- **Request to book** — can they send a booking request?
- **Send a message** — can they message the host directly?
- **Request an intro** — can they ask a mutual connection for an introduction?

## On-Platform Tools

- **House Manual** — Digital guide (wifi, lockbox, appliance instructions, neighborhood recs). Shared with confirmed guests only.
- **Rental Agreement** — AI-generated contract from property details, dates, terms. Downloadable PDF.
- **Security Deposit** — Agreement template with suggested amounts. Host/guest handle transfer directly.
- **Before & After Photos** — Timestamped photo documentation of property condition at check-in/check-out.
- **Listing Photo Touch-Up** — Auto-enhance user-submitted photos (brightness, color, straightening).
- **Insurance Options** — DIY templates for coverage gaps, or opt-in platform-managed coverage for a fee.

## Revenue Model

**Key Decision: Payment Handling** — Handling payments creates liability, especially for under-the-radar hosts. Three models:
- No payment handling (subscription/paid tools only) — cleanest liability
- Light payment handling (flat fee per booking) — platform touches money minimally  
- Full payment handling (Airbnb model) — max revenue, max liability

Free during beta. Payments off-platform (Venmo/Zelle). Revenue options under consideration:

- **Flat fee per booking** ($10–25 when a stay is confirmed) — likely
- **Paid tools** (AI contract generator, deposit template, before/after photo tools, check-in checklist) — likely
- **Optional stay insurance** (Airbnb-style damage coverage, opt-in, platform takes a fee) — likely
- **Subscription / pro tier** (monthly/annual for frequent hosts) — maybe
- **Freemium with ads** — unlikely, misaligned with brand

## Platform Posture

One Degree BNB facilitates introductions between people who already trust each other. It does not process payments, is not party to rental agreements, and does not maintain public listings. Hosts and guests make their own arrangements.

Listings are private and invitation-only — invisible to search engines and to anyone outside the host's trust network. This doesn't make any rental arrangement legal or illegal. Hosts should understand their own lease and local rules.

Designed for real homes, not commercial rentals. Legal consultation scheduled pre-Phase 3.

## Incident Recording (Phase 2 — Data Only)

Incidents are recorded but do not affect scores. Reviews are what move the guest rating.

Severity levels: minor / moderate / serious
Handling levels: excellent / responsive / poor / terrible

The incident form is accessible from the post-stay review flow. Data stored in `incidents` table for future Phase 3 analysis.

## Database Schema (8 Tables + planned: listing_availability, messages, message_threads)

Full SQL in `supabase/schema.sql`.

- **users** — synced from Clerk via webhook. `guest_rating` DECIMAL(2,1), `host_rating` DECIMAL(2,1), `vouch_power` DECIMAL(2,1), `bio` TEXT, `phone_number` TEXT UNIQUE (verified mobile, identity anchor)
- **vouches** — directed edges. `vouch_type` ENUM (standard, inner_circle), `years_known_bucket` ENUM, `reputation_stake_confirmed` BOOLEAN. UNIQUE on (voucher_id, vouchee_id)
- **invites** — invite tokens for invite-only signup. Token, inviter_id, invitee_email or phone, redeemed_at
- **listings** — `preview_visibility` + `full_visibility` enums, `min_trust_score`, `area_name`, `property_type`, prices, dates, amenities JSONB
- **listing_photos** — `is_preview` flag, `sort_order`. Supabase Storage URLs
- **contact_requests** — guest → host with message, dates, status (pending/accepted/declined)
- **stay_confirmations** — mutual confirmation + guest rating + host rating + listing rating (all 1–5★) + review text. Both confirm = completed stay
- **incidents** — reporter_id, reported_user_id, stay_id, severity ENUM, handling ENUM, description. Data collection only

RPC functions: `calculate_one_degree_score(viewer_id, target_id)`, `calculate_vouch_power(user_id)`, `check_listing_visibility`

RLS enabled on all tables.

## Build Phases

### Alpha — Build + Validate Demand (active)
Build the full V1 app with seed data, test every workflow internally. Run Google Ads in parallel to validate demand (signup volume, survey completion, host/guest split).

CC sessions:
- **CC-5** ✅ App scaffold + auth + schema + deploy
- **CC-5.5** ✅ Scaffold validation (Clerk, webhook, Supabase, env vars)
- **CC-6a** ✅ Schema migration + trust RPCs + vouch_power trigger
- **CC-6b** ✅ Vouch flow UI — 3-question modal
- **CC-6c** ✅ Listings + photo upload + visibility system (app-layer)
- **CC-6d** ✅ Browse page + profiles + nav + seed data + smoke test
- **CC-6.5** ✅ shadcn/ui component library adoption (migration, no new features)
- **CC-7** ✅ Invite-only signup + invite links + pre-vouch (non-member)
- **CC-8** 🚀 Contact flow + 3-rating reviews + stay tools (stubs) + dashboard — deployed, smoke testing
- **CC-9a** 🚀 Calendar system — availability ranges, stay rules, turnover, calendar UI — running
- **CC-1** 📋 Listing enhancements — edit listing, on/off toggle, photo management, amenities, house rules, capacity
- **CC-2** 📋 Pricing (custom per range, discounts, cleaning fee) + date-based search
- **CC-3** 📋 Communication — in-app messaging, automated messages, email notifications via Resend

Alpha complete when: all sessions done, core loop works end-to-end, 50+ waitlist signups from ads.

### Beta — Real Users, Real Stays (after alpha)
Invite best waitlist signups (hosts first). Real vouches, real listings, real stays. Loren seeds the network by vouching friends.

Gate: 10 active host listings. At least 3 completed stays. Organic referrals starting.

### Launch — Growth + Monetization (after beta)
Full trust algorithm, revenue model activated, on-platform tools fully built, optional payment processing, mobile app, ID verification. Legal consultation before scaling.

## Track B (Parallel Build)
- Branch: `track-b/airbnb-clone` — **NOT main**
- Deploy: alpha-b.onedegreebnb.com
- Repo: bbagent-01/onedegree-app (same repo, different branch)
- Local: ~/Claude/Projects/onedegree-app
- Session naming: `1DB - Alpha-B - CC-B# - Name`
- Status: CC-B1 + CC-B2 complete. CC-B3a in progress.
- Architecture: B2–B6 = pure Airbnb clone (no trust mechanics). B7 = 1DB trust overlay.
- Rule: Shares Supabase + Clerk with Track A. No code sharing between tracks.
- **Track A sessions MUST be on `main`. Track B sessions MUST be on `track-b/airbnb-clone`.**
- See "Branch Safety" section above — run `git branch --show-current` before every session.

## CC Session Naming Convention

`1DB - Alpha-A - CC-{#} - {title}` (Track A) / `1DB - Alpha-B - CC-B{#} - {title}` (Track B)

First line of every CC prompt = session name. This master chat tracks status, updates the Project Hub and this file, and generates handoff prompts.

## Workflow

There is a Project Hub (HTML file, tabbed) that holds the master plan, all CC session prompts, and mechanics decisions. A master chat in Claude.ai tracks session status, generates new prompts, and updates the hub and this file after each session. Claude Code (CC) sessions are where code gets built — each session receives a self-contained prompt from the hub. At the end of each CC session, produce a completion report (what was built, files changed, notes for future sessions) so the master chat can update the hub and this file. This file (PROJECT_PLAN.md) lives in both repos (landing + app) so every CC session can read it.
