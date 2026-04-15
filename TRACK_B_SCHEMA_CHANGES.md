# Track B Schema Changes

Schema changes introduced by Track B sessions. Each entry documents what was added and why.

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
