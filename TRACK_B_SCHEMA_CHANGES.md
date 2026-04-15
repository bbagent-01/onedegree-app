# Track B Schema Changes

Schema changes introduced by Track B sessions. Each entry documents what was added and why.

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
