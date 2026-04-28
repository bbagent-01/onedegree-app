# Track B Schema Changes

Schema changes introduced by Track B sessions. Each entry documents what was added and why.

## S10.7 — Trust v2 compute layer (migration 046)

**Migration:** `supabase/migrations/046_trust_v2_compute.sql`
**Compute module:** `src/lib/trust/v2-compute.ts`
**Config:** `src/lib/trust/config.ts` (`TRUST_VOUCH_K = 30`)
**Cron route:** `src/app/api/cron/recompute-trust-v2/route.ts`
**One-off invoker:** `scripts/recompute-trust-v2-now.ts`
**Spec:** Trust v2 spec (inlined in S10.7 task brief) — see §03 (formulas), §04 (bootstrap), §08 (schema), §09 (Phase 1).

### Goal

Phase 1 of the Trust v2 model: schema + nightly recompute for the new
`vouch_signal` / `vouch_score` / `rating_avg` / `rating_count` user
columns plus the cron that maintains them. **Display layer is untouched
this session** — `TrustTag`, `MultiHopView`, `compute1DegreeScore`, and
every reader of the legacy 1° connection score continues to render
exactly as before. Alpha 1 Cluster 4.5 will switch the display layer
to read `users.vouch_score`.

Strictly additive. No drops, no type changes on existing columns.

### Schema additions — users (six columns total, five new)

| Column | Type | Default | Source |
|--------|------|---------|--------|
| `vouch_signal` | NUMERIC(10,4) | `0` | new — mig 046 |
| `vouch_score` | NUMERIC(4,1) | `0` | new — mig 046 (user-level 0–10; distinct from `vouches.vouch_score`) |
| `rating_avg` | NUMERIC(3,2) | NULL | new — mig 046 |
| `rating_count` | INTEGER | `0` | new — mig 046 |
| `last_score_computed_at` | TIMESTAMPTZ | NULL | new — mig 046 |
| `vouch_power` | DECIMAL(3,2) | `1.0` | already existed (mig 014b) — re-used |

**Why `vouch_power` wasn't re-added.** Spec §08 lists six columns including
`vouch_power NUMERIC(4,3) DEFAULT 1.000`. The column was already on `users`
from mig 014b (DECIMAL(3,2), default 1.0) with the same semantics — average
of guest_ratings of users this user has vouched for, clamped to [0.5, 1.5].
The "no type changes on existing columns" constraint forbids re-typing it,
so the cron writes the existing column. The spec's [0.0, 2.0] range guidance
is satisfied — [0.5, 1.5] is a subset — and we picked [0.5, 1.5] specifically
to keep the legacy `trg_vouch_power` trigger (mig 014b) and the cron in lockstep.

### Combined rating trigger

| Trigger | Table | Fires On | Purpose |
|---------|-------|----------|---------|
| `trg_update_user_combined_ratings` | stay_confirmations | INSERT / UPDATE OF guest_rating, host_rating, guest_id, host_id / DELETE | Maintains `users.rating_avg` + `users.rating_count` for the affected guest_id and host_id. |

`rating_avg` is the **combined** average across both roles: every
non-null `stay_confirmations.guest_rating` where `guest_id = u` plus
every non-null `stay_confirmations.host_rating` where `host_id = u`,
averaged. `rating_count` is the count of those rows. The legacy
`trg_update_user_ratings` (mig 014b) keeps `users.guest_rating` /
`users.host_rating` split-by-role values current — both triggers run;
neither replaces the other.

The migration also runs a one-shot backfill so existing rows have the
correct `rating_avg` / `rating_count` immediately. (At the time of
S10.7, no `stay_confirmations` rows had star ratings, so the backfill
left every user with NULL rating_avg + 0 rating_count — expected.)

### Recompute math (spec §03)

```
weight(j → i) = vouch_power(j) × log(1 + vouch_signal(j) + 1)
              = vouch_power(j) × log(2 + vouch_signal(j))
vouch_signal(i) = Σ weight(j → i)               (over inbound vouches)
vouch_score(i)  = 10 × (1 − e^(−vouch_signal(i) / TRUST_VOUCH_K))
vouch_power(i)  = avg(rating_avg of users i has vouched for)
                  clamped [0.5, 1.5]; 1.0 default
```

`TRUST_VOUCH_K = 30` (spec §03; tunable via env var of the same name).
The +1 inside the log is the bootstrap floor (spec §04) so brand-new
users with signal=0 still contribute log(2)≈0.69 per vouch.

### Recompute orchestrator (`recomputeAllTrustV2`)

Pulls all users + all vouches in two queries, then iterates a fixed
point until `max delta < 0.01` or 12 passes. Each pass:

1. Refreshes `vouch_power` from current `rating_avg` of vouchees.
2. Refreshes `vouch_signal` using updated power + previous-pass signal.

Final pass derives `vouch_score` from `vouch_signal` and persists all
four columns + `last_score_computed_at = now()` for every user.

**Initial backfill (live alpha-c run, 2026-04-27):** 51 users · 10
passes · converged · max Δ = 0.0033 · 1.5s. Score range 0.0–6.3
(Loren: 6.3 with 13 inbound vouches; bottom of populated graph: 0.4
for users with 1 inbound vouch; 13 zero-inbound users at 0.0).

### Cron wiring

The hourly Cloudflare Worker (`cron-worker/`) was extended with
`/api/cron/recompute-trust-v2` in its fan-out. The route is a no-op
when the most recent `users.last_score_computed_at` is younger than
`TRUST_RECOMPUTE_STALE_HOURS = 20` hours, so the hourly trigger
effectively runs once a day. `?force=1` overrides the staleness check
for one-off invocations.

### What was NOT done (deferred to Alpha 1 Cluster 4.5)

- Spec §09 Phase 1 line item: "rescale existing connection_score output
  to 0–10." Skipped this session because the legacy display reads
  `compute1DegreeScore` directly, and rescaling without simultaneously
  updating the display would render 1° scores incorrectly. Display swap
  + connection-score rescale ship together in Alpha 1.
- TrustTag / MultiHopView / any visual change. Not touched.

### Backwards compat

- Existing `vouches.vouch_score` (per-vouch points, 15–25 in legacy
  model) is unrelated to the new `users.vouch_score` (user-level 0–10).
  Both columns coexist on different tables; readers were never confused
  because they always reference the qualified column.
- `users.vouch_power` is now written by both `trg_vouch_power` (mig 014b,
  fires on `users.guest_rating` UPDATE) and the v2 cron — both produce
  identical values because they use the same formula and bounds.
- `users.guest_rating` / `users.host_rating` / `users.guest_review_count`
  / `users.host_review_count` continue to be maintained by the legacy
  `trg_update_user_ratings` trigger; readers of those columns are
  unaffected.

---

## S10.5 — Listing schema forward-look (migration 045)

**Migration:** `supabase/migrations/045_listing_schema_forward_look.sql`
**Backfill:** `scripts/backfill-045-listing-meta.ts`
**Audit input:** `docs/S10.4_LISTING_SCHEMA_AUDIT.md`

### Goal

Promote wizard fields out of the `<!--meta:{...}-->` description blob into real columns, add the new product fields the Build Plan calls for (tags · stay_style · service_discounts · accessibility · structured pet/children policy · check-in/out instructions · house manual), split preview-content toggles out of `access_settings` into a dedicated `preview_settings` column, and correct the stale `access_settings` DEFAULT.

**Strictly additive.** No drops, no type changes on existing columns. The S10.4 audit identified ~10 drop candidates (price_per_night, address text, preview_photos, the four legacy access columns, …); they are deferred to a cleanup migration after Alpha 0 ships.

### Schema changes — listings

#### Promoted-from-meta scalar columns (all NULLable)

| Column | Type | CHECK |
|--------|------|-------|
| `place_kind` | TEXT | `IN ('entire','private','shared')` |
| `property_label` | TEXT | `IN ('house','apartment','condo','townhouse','cabin','loft','other')` |
| `max_guests` | INTEGER | `>= 1` |
| `bedrooms` | INTEGER | `>= 0` |
| `beds` | INTEGER | `>= 0` |
| `bathrooms` | NUMERIC(3,1) | `>= 0` |
| `street` | TEXT | — |
| `city` | TEXT | — |
| `state` | TEXT | — |
| `postal_code` | TEXT | — |
| `lat` | NUMERIC(9,6) | — |
| `lng` | NUMERIC(9,6) | — |
| `weekly_discount_pct` | INTEGER | `BETWEEN 0 AND 99` |
| `monthly_discount_pct` | INTEGER | `BETWEEN 0 AND 99` |
| `extended_overview` | TEXT | — |
| `guest_access_text` | TEXT | — |
| `interaction_text` | TEXT | — |
| `other_details_text` | TEXT | — |

#### New product fields

| Column | Type | Default / NULL? | CHECK |
|--------|------|-----------------|-------|
| `tags` | TEXT[] | `'{}'` · NOT NULL | (none — vocab locked app-side) |
| `stay_style` | TEXT | NULL | `IN ('vacation_rental','lived_in_home','partial_prep')` |
| `service_discounts` | JSONB | `'[]'` · NOT NULL | shape: `[{service, discount_amount, discount_type, notes}]` (app-side) |
| `checkin_instructions` | TEXT | NULL | — |
| `checkout_instructions` | TEXT | NULL | — |
| `house_manual` | TEXT | NULL | — |
| `pets_allowed` | BOOLEAN | NULL | — |
| `children_allowed` | BOOLEAN | NULL | — |
| `pets_on_property` | BOOLEAN | NULL | — (host-has-pets, distinct from pets_allowed) |
| `accessibility_features` | TEXT[] | `'{}'` · NOT NULL | — |

#### House-rules booleans (promoted from `house_rules` text blob)

| Column | Type | NULL? |
|--------|------|-------|
| `no_smoking` | BOOLEAN | NULL |
| `no_parties` | BOOLEAN | NULL |
| `quiet_hours` | BOOLEAN | NULL |

`house_rules` (text) stays as the canonical home for the host's free-form custom rules.

#### Preview-settings split

| Column | Type | Default / NULL? |
|--------|------|-----------------|
| `preview_settings` | JSONB | all-true shape · NOT NULL |

`access_settings` keeps the WHO (gates), `preview_settings` is the WHAT (which fields show in preview). Wizard now writes to **both** during the transitional period — readers still go through `access_settings.preview_content`. The duplicate sub-key is removed in the cleanup migration once readers are switched over.

#### `access_settings` DEFAULT — corrected

Was the pre-mig-019 6-key shape (`see_full`/`message`/`request_book`/`request_intro`/`view_host_profile`); now the post-mig-020 4-key shape **minus `preview_content`** (now lives in `preview_settings`):

```json
{
  "see_preview":           {"type": "anyone"},
  "full_listing_contact":  {"type": "min_score", "threshold": 15},
  "allow_intro_requests":  true
}
```

This only affects future inserts that omit the column; existing rows are untouched.

#### Indexes

- `idx_listings_max_guests` (partial, NOT NULL) — guest-count filter
- `idx_listings_bedrooms` (partial, NOT NULL) — bedroom filter
- `idx_listings_property_label` (partial, NOT NULL) — precise property-type filter
- `idx_listings_tags` (GIN) — tag containment filter
- `idx_listings_stay_style` (partial, NOT NULL) — stay-style filter

### Decision: `property_type` vs `property_label`

Two options surfaced in S10.4 §9 q6: **(a)** widen the `property_type` CHECK to include condo/townhouse/cabin/loft (so `propertyTypeToDb()` stops collapsing) or **(b)** keep `property_type` as the 4-value coarse bucket (`apartment`/`house`/`room`/`other`) and rely on `property_label` for the precise UI value. **Picked (b)** — `propertyTypeToDb()` and the existing `property_type` CHECK stay unchanged; new `property_label` column carries the lossless 7-value vocabulary (the 6 wizard labels + `loft` for forward compat). Less code churn, no risk of breaking any reader that branched on the 4 values.

### Decision: `default_availability_status` mapping

Wizard collects `available`/`unavailable`/`possibly`; column CHECK is `available`/`possibly_available`/`blocked` (S10.4 §7.4). **Picked: rename in submit handler** (no DB change). The wizard's `publish()` now sends the mapped value through the existing `calendar-settings` PATCH route.

### Backfill

`scripts/backfill-045-listing-meta.ts` runs once after the migration. For every existing listing it:

1. Parses `<!--meta:{...}-->` from `description` via `parseListingMeta()` (with a one-level unwrap for the seed-script `{"meta":{...}}` shape).
2. Populates new columns from meta JSON — never overwriting non-null values.
3. Maps `house_rules` text blob → `no_smoking` / `no_parties` / `quiet_hours` / `pets_allowed` booleans.
4. Copies `meta.cleaningFee` → `cleaning_fee` (the column existed but was never written by listing CRUD).
5. Maps `meta.defaultAvailability` → `default_availability_status` (with the value-set rename above).
6. Mirrors `access_settings.preview_content` → `preview_settings`.
7. Strips the meta-comment from `description` after a successful read.

**Live-DB run:** 61/61 listings updated; 0 parse failures; 0 leftover meta-comments. 20-21 rows received structured columns (the rest had no meta blob to extract from).

### Wizard + API rewires

- `POST /api/listings` body whitelist extended to all new columns (`route.ts`).
- `PATCH /api/listings/[id]` passthrough whitelist extended to the same columns; arrays (`tags`, `accessibility_features`) and JSONB (`preview_settings`, `service_discounts`) handled separately (`[id]/route.ts`).
- `src/app/(app)/hosting/create/page.tsx` `publish()` now writes the new columns directly. The legacy `encodeListingMeta()` blob is still emitted on `description` so legacy readers stay functional during the transition; cleanup migration deletes it.
- `src/lib/listing-meta.ts` is left intact as a read-only fallback for any pre-backfill rows that slip through; not deleted yet.

### RLS

No new policies. The new columns are public attributes that inherit existing listing visibility (`visibility_mode` + `access_settings`). They do not introduce new authority and don't need their own RLS.

### Trust v2 schema deltas (deferred)

Per FT-1 spec, Trust v2 Phase 1 (compute + schema) was scoped into this session. Display layer (Phase 2/3) is deferred to Alpha 1 Cluster 4.5. **Phase 1 schema deltas are not landed in this migration** because the FT-1 spec is not present in the repo as of this session — adding speculative columns is worse than waiting one session for the spec to land. Tracked as follow-up.

---

## S9d — Origin proposal on threads (migration 044)

**Migration:** `supabase/migrations/044_threads_origin_proposal.sql`

### Schema Changes

| Table | Column | Type | Purpose |
|-------|--------|------|---------|
| `message_threads` | `origin_proposal_id` | UUID NULL · FK → proposals(id) ON DELETE SET NULL | Records the proposal a thread was opened from (Trip Wish or Host Offer). Drives the OriginProposalCard at the top of the thread + the "Send stay terms" / "Request these terms" bridge buttons. |

Index: `idx_message_threads_origin_proposal_id` — partial on `WHERE origin_proposal_id IS NOT NULL` (vast majority of threads stay null).

### Why this shape

- **Nullable + ON DELETE SET NULL.** Legacy threads keep null and behave as before. If a proposal is deleted later, the thread stays alive — the card flips to a static "no longer available" row.
- **Additive.** No data migration; no RLS change (thread participants already control visibility on `message_threads`).
- **First-contact wins.** When a thread is re-opened from a different proposal, the existing `origin_proposal_id` is preserved (provenance, not "latest click").

### New components

| Component | Purpose |
|-----------|---------|
| `src/components/inbox/origin-proposal-card.tsx` | Compact thread-header card linking back to the originating proposal. |
| `src/components/inbox/proposal-bridge-actions.tsx` | Decides which CTA to render (TW host → Send stay terms; HO guest → Request these terms). |
| `src/components/proposals/host-listing-picker.tsx` | Modal listing the host's active listings (used by the TW path to pick which property to send terms about). |

### New API routes

| Route | Purpose |
|-------|---------|
| `GET /api/me/listings` | Lists current viewer's active listings minimally (id, title, area_name, price_min, thumbnail_url). Powers the picker. |
| `POST /api/contact-requests/from-proposal/[threadId]` | Creates a pending `contact_request` prefilled from the originating proposal. Branches by proposal kind (TW vs HO) and routes the user to the canonical listing-scoped thread. |

### Updated touchpoints

- `getOrCreateThread` + `/api/message-threads` + `/api/dm/open-thread` accept an optional `originProposalId` / `proposalId` and stamp it on insert. Existing rows are backfilled only when the column is null.
- `MessageAuthorButton` passes `proposalId` through both create paths so the resulting thread carries the link forward.
- `getThreadDetail` selects `origin_proposal_id` and hydrates a small `origin_proposal` slice (`{id, kind, title, listing_id, status, isAvailable}`) for the inbox surface.

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
