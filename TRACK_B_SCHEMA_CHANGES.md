# Track B Schema Changes

Schema changes introduced by Track B sessions. Each entry documents what was added and why.

## CC-C2.1 — Formula + Phone + Transparency

**Migration:** `supabase/migrations/016_invite_delivery_tracking.sql`

### Schema Changes

| Table | Column | Type | Purpose |
|-------|--------|------|---------|
| `invites` | `delivery_method` | TEXT | How invite was delivered: `sms`, `email`, `both`, or `failed` |
| `invites` | `delivery_status` | TEXT | Delivery outcome: `delivered` or `failed` |

### Formula Change: Harmonic Dampening

The 1° score formula was updated from additive sum to harmonic dampening:
- **Old:** `1° score = Σ path_strengths` (additive)
- **New:** Sort paths descending, `1° vouch score = Σ (path_strength / rank)` (harmonic)
- One strong connection now outweighs many weak ones
- No DB column changes — computation is server-side only

### Terminology Rename

- **Composite score** renamed from "trust score" → "1° Vouch Score" (full) / "1° Score" (short)
- **Per-vouch score** stays as "vouch score" (unchanged)
- No DB column renames — labels only

### New Components

| Component | Purpose |
|-----------|---------|
| `src/components/trust/connection-breakdown.tsx` | ConnectionPopover wrapper + breakdown content for avatars |
| `src/lib/sms/send-invite.ts` | Twilio SMS invite delivery with graceful fallback |

### New API Routes

| Route | Purpose |
|-------|---------|
| `GET /api/trust/connection?targetId=...` | Connection breakdown data for popover |

### Updated Defaults

Default `access_settings` updated for alpha phase:
- `see_preview`: anyone (unchanged)
- `see_full`: **anyone** (was min_score 10)
- `request_book`: **min_score 30** (was 20)
- `message`: **min_score 15** (was 10)
- `request_intro`: anyone (unchanged)
- `view_host_profile`: anyone (unchanged)

### Clerk Phone Capture

The Clerk webhook already captures `phone_numbers[0].phone_number` in E.164 format.
**Action needed from Loren:** In Clerk Dashboard, ensure the signup form requests phone number.
- URL: https://dashboard.clerk.com → User & Authentication → Email, Phone, Username
- Enable "Phone number" and set to "Required" or "Optional"

### Twilio SMS Setup (Loren Action Required)

Add these env vars to `.env.local` and Cloudflare Pages environment:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER` (E.164 format, e.g. `+15551234567`)

If missing at runtime, SMS delivery falls back to email only.

---

## CC-C2 — Vouch & Invite Flows (no new migrations)

**No new database tables or columns.** CC-C2 uses the schema created by CC-C1a/C1b.

### Updated API Routes

| Route | Changes |
|-------|---------|
| `POST /api/vouches` | Now uses `is_post_stay`, `source_booking_id`, `is_staked` fields from 014b. Returns `vouchScore`. |
| `GET /api/vouches` | Now returns `vouch_score`, `is_post_stay`, `is_staked`. |
| `POST /api/invites` | Now uses `invitee_name`, `pre_vouch_data` (JSONB), `status` from 014b. Sends invitation email via Resend. |
| `GET /api/invites` | Now returns `invitee_name`, `pre_vouch_data`, `status`. |
| `GET /api/users/search` | Now searches by email in addition to name. |
| `POST /api/webhooks/clerk` | `user.created` event now claims pending invites by matching phone/email, auto-creates vouches from `pre_vouch_data`. |

### New Components

| Component | Purpose |
|-----------|---------|
| `src/components/trust/vouch-modal.tsx` | 2-step vouch modal (type + years). Dialog on desktop, Sheet on mobile. |
| `src/components/trust/vouch-button.tsx` | Trigger button that checks for existing vouch. |
| `src/components/trust/post-stay-vouch-banner.tsx` | Post-stay prompt shown on trip detail and hosting pages. |
| `src/components/trust/network-section.tsx` | "Your Network" section for host dashboard. |

### New Pages

| Page | Purpose |
|------|---------|
| `/vouch` | Search members and vouch for them. |
| `/invite` | 4-step invite form (info → type → years → preview/send). |

### New Modules

| Module | Purpose |
|--------|---------|
| `src/lib/network-data.ts` | Server-side data for the network section (uses `get_user_network` RPC). |
| `src/hooks/use-media-query.ts` | Client hook for responsive Dialog/Sheet switching. |

---

## CC-C1b — Degrees of Separation (migration 015)

**Migration:** `supabase/migrations/015_degrees_of_separation.sql`

### New RPCs

| RPC | Purpose |
|-----|---------|
| `get_degrees_of_separation_batch(viewer_id, target_ids[])` | Recursive CTE computing minimum hop count from viewer to each target via the vouches graph. Vouches are bidirectional edges. Capped at 4 hops. Returns `{ target_id, degrees }` — degrees is NULL if no path exists within the cap. |

### New TypeScript modules

| Module | Purpose |
|--------|---------|
| `src/lib/trust/degrees.ts` | `computeDegreesOfSeparation(viewerId, targetId)` — single target. `computeDegreesOfSeparationBatch(viewerId, targetIds[])` — batch. Both use the RPC with JS-side BFS fallback. |

### Updated TypeScript modules

| Module | Change |
|--------|--------|
| `src/lib/trust/types.ts` | Added `HydratedConnector`, `DegreesResult`, `BatchDegreesResult` types. Replaced `connector_name`/`connector_avatar` on `TrustPath` with a `connector?: HydratedConnector` object. |
| `src/lib/trust/check-access.ts` | Completed `max_degrees` access type: `degrees !== null && degrees <= threshold`. |
| `src/lib/trust/compute-score.ts` | Added `hydrateConnectors()` — batched user lookup to populate `connector` field on trust paths. Single-target `compute1DegreeScore` now returns hydrated paths. |
| `src/lib/trust/compute-score-batch.ts` | Batch `compute1DegreeScores` now hydrates connector profiles in a single batched query after assembly. |
| `src/lib/trust/index.ts` | Re-exports `computeDegreesOfSeparation`, `computeDegreesOfSeparationBatch`, new types. |

### New scripts

| Script | Purpose |
|--------|---------|
| `scripts/seed-trust-data.ts` | Creates 10 test users + Loren's account, rich vouch graph (16 vouches), 3 test listings (min_score, max_degrees, specific_people), 4 stays with reviews. Verifies 1° score, vouch power, degrees of separation, and all 4 access types. Idempotent (safe to re-run). |

### Why this shape

The degrees computation uses a single recursive CTE (`WITH RECURSIVE`) over the vouches table, treating each vouch as a bidirectional edge. This is the most expensive query in the trust engine — capped at 4 hops to bound runtime. The batch version handles 50–100 targets in one query by using `unnest(target_ids)` with a LEFT JOIN on the BFS result. At alpha scale (~50 users, ~200 vouches), this should execute in <500ms. At >5K users, consider materialized views or Neo4j migration.

---

## CC-C1a — Alpha-C Trust Model (migration 014)

**Migration:** `supabase/migrations/014_alpha_c_trust_model.sql`

### years_known_bucket_enum — extended

New values added: `lt1`, `1to3`, `3to5`, `5to10`, `10plus`. Old values (`lt1yr`, `1to3yr`, `4to7yr`, `8to15yr`, `15plusyr`) remain for backward compatibility but are not used by new code.

### vouches table

| Column | Type | Notes |
|--------|------|-------|
| vouch_score | NUMERIC | Computed on insert/update: base_points × years_multiplier. Standard=15, Inner Circle=25. |
| is_post_stay | BOOLEAN NOT NULL DEFAULT false | Whether this vouch was created after a confirmed stay. |
| source_booking_id | UUID nullable | Reference to the contact request that prompted this vouch. |
| is_staked | BOOLEAN NOT NULL DEFAULT false | Whether the voucher has staked reputation on this vouch. |
| updated_at | TIMESTAMPTZ DEFAULT now() | Auto-bumped by trigger on vouch_type or years_known_bucket change. |

**Trigger:** `trg_compute_vouch_score` — BEFORE INSERT/UPDATE on vouch_type or years_known_bucket, computes vouch_score and updates vouch counts on both users.

### users table

| Column | Type | Notes |
|--------|------|-------|
| vouch_count_given | INTEGER NOT NULL DEFAULT 0 | Count of vouches this user has given. Maintained by trigger. |
| vouch_count_received | INTEGER NOT NULL DEFAULT 0 | Count of vouches this user has received. Maintained by trigger. |

- `vouch_power` default changed from NULL to 1.0 (benefit of the doubt for new users).
- Existing NULL vouch_power values backfilled to 1.0.

### listings table

| Column | Type | Notes |
|--------|------|-------|
| visibility_mode | TEXT NOT NULL DEFAULT 'preview_gated' | One of: public, preview_gated, hidden. Replaces old preview_visibility/full_visibility system. |
| preview_photos | JSONB nullable | Subset of photos shown to gated viewers. |
| preview_description | TEXT nullable | Teaser description for gated viewers. |
| access_settings | JSONB NOT NULL | Per-action access rules. Default: see_preview=anyone, see_full=min_score(10), request_book=min_score(20), message=min_score(10), request_intro=anyone, view_host_profile=anyone. |

- `min_trust_gate` (from 013) stays for backward compat but `access_settings` is the canonical source of truth.
- Old columns (`preview_visibility`, `full_visibility`, `min_trust_score`, `specific_user_ids`) untouched — Track A schema, not used by new code.

### invites table

| Column | Type | Notes |
|--------|------|-------|
| invitee_name | TEXT nullable | Display name for the invitee. |
| pre_vouch_data | JSONB nullable | Pre-vouch information (vouch type, years known, etc.) as flexible JSON. |
| status | TEXT NOT NULL DEFAULT 'sent' | One of: sent, clicked, joined. |

### New RPCs

| RPC | Purpose |
|-----|---------|
| `get_trust_data_for_viewer(viewer_id, target_ids[])` | Single query returning all vouch path data for 1° score computation. Returns one row per connector path. |
| `recalculate_vouch_power_for_user(user_id)` | Recompute + store vouch_power. New formula: avg(guest_rating)/4.0 clamped [0.5, 1.5]. |
| `get_user_network(user_id)` | Returns vouched-for and vouched-by relationships with user profiles. |

### New/Updated Triggers

| Trigger | Table | Fires On | Purpose |
|---------|-------|----------|---------|
| `trg_compute_vouch_score` | vouches | BEFORE INSERT/UPDATE | Computes vouch_score, updates user vouch counts. |
| `trg_vouch_power` | users | AFTER UPDATE OF guest_rating | Recalculates vouch_power for all vouchers of this user. New formula: rating/4.0 clamped [0.5, 1.5]. |
| `trg_update_user_ratings` | stay_confirmations | AFTER UPDATE OF guest/host/listing_rating | Updates user avg ratings and listing avg rating. |
| `trg_update_user_ratings_insert` | stay_confirmations | AFTER INSERT (with ratings) | Same as above, for insert case. |

### New TypeScript modules

| Module | Purpose |
|--------|---------|
| `src/lib/trust/types.ts` | Shared types, constants (VOUCH_BASE_POINTS, YEARS_MULTIPLIER, DEFAULT_ACCESS_SETTINGS) |
| `src/lib/trust/compute-score.ts` | `compute1DegreeScore(viewerId, targetId)` — single-target 1° score |
| `src/lib/trust/compute-score-batch.ts` | `compute1DegreeScores(viewerId, targetIds[])` — batch, 1-2 queries max |
| `src/lib/trust/vouch-power.ts` | `computeVouchPower(userId)`, `persistVouchPower(userId)` |
| `src/lib/trust/check-access.ts` | `checkListingAccess(viewerId, listing, score, degrees?)` |
| `src/lib/trust/index.ts` | Re-exports public API |

### Why this shape

The Alpha-C model replaces B7a's trust_level 1/6/8/10 scale with vouch_type (standard/inner_circle) + years_known_bucket. Vouch scores are now pre-computed and stored on the vouch row. The 1° score computation uses a single RPC that returns all path data in one query, avoiding N+1. The old `trust-data.ts` and `calculate_one_degree_scores` RPC are preserved for backward compat — CC-C3 will rewire the browse/detail pages to use the new `src/lib/trust/` modules.

## CC-B7a — Listing trust gate (migration 013)

**Migration:** `supabase/migrations/013_min_trust_gate.sql`

### listings table

| Column | Type | Notes |
|--------|------|-------|
| min_trust_gate | INTEGER NOT NULL DEFAULT 0 | Required viewer trust score to see full listing details. 0 = visible to the whole network, higher values restrict to closer connections. |

- Partial index `idx_listings_min_trust_gate` over `(min_trust_gate) WHERE min_trust_gate > 0` for future server-side filtering.
- Backfill: all existing rows default to 0, so the Airbnb-clone experience is preserved until hosts explicitly set a gate in CC-B7c.

### Why this shape
Per-listing gating is the simplest way for a host to differentiate a private guest room (gate of 60+) from a public-facing cabin (gate of 0), without requiring a separate visibility tier enum. The viewer's trust score is computed server-side in `src/lib/trust-data.ts` against the existing `calculate_one_degree_scores` RPC and compared to this column.

## CC-B6c — Named wishlists (migration 012)

**Migration:** `supabase/migrations/012_named_wishlists.sql`

### New table

#### `wishlists`
Airbnb-style named collections. One user → many wishlists → many listings.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | gen_random_uuid() |
| user_id | UUID NOT NULL | FK → users, ON DELETE CASCADE |
| name | TEXT NOT NULL | Max 60 chars (enforced at API) |
| is_default | BOOLEAN NOT NULL DEFAULT false | True for the auto-created "Saved" list |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMPTZ NOT NULL DEFAULT now() | Bumped on save/remove for natural sort |

- Index: `(user_id, created_at DESC)` for listing the user's lists.
- Partial unique: `(user_id) WHERE is_default = true` enforces "at most one default per user."
- RLS enabled with permissive SELECT; mutations go through the service role.

### saved_listings reshape

- Added `wishlist_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE`.
- Backfill: any existing saved_listings rows are moved into a freshly created `"Saved"` default list for each owning user.
- Primary key swapped from `(user_id, listing_id)` → `(wishlist_id, listing_id)` so the same listing can live in multiple wishlists.
- Added index `(user_id, listing_id)` so the "is this listing saved anywhere for this user?" query stays fast.

### Why this shape
Mirrors Airbnb's collection model (wishlists have names, same listing can appear in multiple). Keeping `user_id` denormalized on saved_listings lets us do the "any list contains this" heart-fill query without a join.

## CC-B6c — Wishlists, profile fields, support requests

**Migration:** `supabase/migrations/011_wishlists_profiles_support.sql`

### New tables

#### `saved_listings`
Per-user wishlist / favorites join table.

| Column | Type | Notes |
|--------|------|-------|
| user_id | UUID NOT NULL | FK → users, ON DELETE CASCADE |
| listing_id | UUID NOT NULL | FK → listings, ON DELETE CASCADE |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT now() | |

- Primary key: `(user_id, listing_id)` — dedupes and acts as the lookup index.
- Secondary indexes: `(user_id, created_at DESC)` for the Wishlists page, `(listing_id)` for host-side counts later.
- RLS enabled with a permissive SELECT policy. Writes go through the service role in `/api/wishlists`.

#### `support_requests`
Help Center contact form submissions. Not exposed through any API yet — read directly from Supabase Studio for now.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | gen_random_uuid() |
| user_id | UUID | FK → users, ON DELETE SET NULL (nullable so logged-out guests can submit) |
| name | TEXT | |
| email | TEXT | |
| category | TEXT NOT NULL | One of: bug, question, feedback, other |
| message | TEXT NOT NULL | Max 4000 chars (enforced at API layer) |
| status | TEXT NOT NULL DEFAULT 'open' | Free-form for future triage workflow |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT now() | |

- Index: `(status, created_at DESC)` for an eventual support dashboard.
- RLS enabled with no policies → only the service role can read/write.

### Users table additions

| Column | Type | Purpose |
|--------|------|---------|
| location | TEXT | City / state shown on the profile card |
| languages | TEXT[] | Array of language names ("English", "Spanish", …) |
| occupation | TEXT | Free-form work / role |
| deactivated_at | TIMESTAMPTZ | Soft delete marker set from the Settings page |

All columns are nullable; no backfill needed. Profile-data.ts tolerates
missing columns via a generic `SELECT *` so the app still renders on
older schemas.

### Why this shape
Wishlists and profile fields are generic enough that Track A is welcome
to adopt them verbatim. Support requests live entirely in Track B for
now — we can fold them into a shared admin surface later.

## CC-B6a — Messaging inbox

**Migration:** `supabase/migrations/007_messaging_inbox.sql`

### New tables

#### `message_threads`
One thread per (listing_id, guest_id) pair. Host derived from listing.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | gen_random_uuid() |
| listing_id | UUID NOT NULL | FK → listings, ON DELETE CASCADE |
| guest_id | UUID NOT NULL | FK → users, ON DELETE CASCADE |
| host_id | UUID NOT NULL | FK → users, ON DELETE CASCADE |
| contact_request_id | UUID | FK → contact_requests (nullable) |
| last_message_at | TIMESTAMPTZ | Auto-bumped by trigger on new message |
| last_message_preview | TEXT | First 140 chars of the most recent message |
| guest_unread_count | INTEGER | Unread by the guest |
| host_unread_count | INTEGER | Unread by the host |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | Auto-bumped by trigger |

Unique constraint: `(listing_id, guest_id)` — one thread per listing/guest pair.

#### `messages`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| thread_id | UUID NOT NULL | FK → message_threads, ON DELETE CASCADE |
| sender_id | UUID | FK → users (nullable for system messages) |
| content | TEXT NOT NULL | |
| is_system | BOOLEAN | true = booking lifecycle event, centered + muted in UI |
| created_at | TIMESTAMPTZ | |

### Trigger
`trg_messages_after_insert` keeps `message_threads.last_message_*` in sync and increments unread counters for the recipient on every message insert. System messages bump both counters.

### Realtime
Both `messages` and `message_threads` are added to the `supabase_realtime` publication so the inbox can subscribe to live inserts/updates.

### RLS
Permissive SELECT policies for authenticated users. Server-side mutations go through the service role; the policies are a safety net for any future direct browser reads.

### Why this shape
Track A doesn't have messaging tables yet, so Track B owns the schema for now. When Track A adds messaging, the schemas should converge — these tables are designed to work without trust-graph dependencies and can be reused as-is.
