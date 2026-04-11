# Schema Notes — One Degree BNB

> Last updated: CC-6c (April 10, 2026)

## Tables (8)

| Table | Purpose |
|-------|---------|
| users | Synced from Clerk webhook. Stores ratings, vouch_power, phone. |
| vouches | Directed trust edges. vouch_type + years_known_bucket → point value. |
| invites | Invite tokens for invite-only signup. Email or phone. |
| listings | Host properties with visibility controls. |
| listing_photos | Photos per listing with preview flag and sort order. |
| contact_requests | Guest → host booking requests. |
| stay_confirmations | Mutual confirmation + 3 ratings (host, guest, listing) + review text. |
| incidents | Reporter-filed incident records. Data collection only, no auto-scoring. |

## Enums

| Enum | Values |
|------|--------|
| vouch_type_enum | standard, inner_circle |
| years_known_bucket_enum | lt1yr, 1to3yr, 4to7yr, 8to15yr, 15plusyr |
| incident_severity_enum | minor, moderate, serious |
| incident_handling_enum | excellent, responsive, poor, terrible |

## Key Columns (post-migration)

### users
| Column | Type | Notes |
|--------|------|-------|
| guest_rating | DECIMAL(3,2) | Avg from stay_confirmations where user is guest |
| guest_review_count | INTEGER | Number of reviews as guest |
| host_rating | DECIMAL(3,2) | Avg from stay_confirmations where user is host |
| host_review_count | INTEGER | Number of reviews as host |
| vouch_power | DECIMAL(3,2) | Avg guest_rating of vouchees with ≥1 review |
| phone_number | TEXT UNIQUE | Verified mobile from Clerk, identity anchor |

### vouches
| Column | Type | Notes |
|--------|------|-------|
| vouch_type | vouch_type_enum | standard (15 pts) or inner_circle (25 pts) |
| years_known_bucket | years_known_bucket_enum | Multiplier: 0.6× to 1.8× |
| reputation_stake_confirmed | BOOLEAN | User checked the "I understand" box |
| stay_confirmation_id | UUID (nullable) | Links post-stay vouches to the stay |

### stay_confirmations
| Column | Type | Notes |
|--------|------|-------|
| host_rating | INTEGER 1-5 | Guest rates the host |
| guest_rating | INTEGER 1-5 | Host rates the guest |
| listing_rating | INTEGER 1-5 | Guest rates the listing |
| review_text | TEXT | Optional written review |

## Functions

### calculate_one_degree_scores(p_viewer_id UUID, p_target_ids UUID[])
**Returns:** TABLE(target_id UUID, score INTEGER, connection_count INTEGER)

Batch RPC. For each target, finds all 2-hop paths (viewer → connector → target) through the vouch graph. Each path's strength is:

```
path = (viewer_vouch_points + connector_vouch_points × vouch_power_factor) / 2
```

Where:
- vouch_points = base_points (15 or 25) × years_multiplier (0.6 to 1.8)
- vouch_power_factor = connector's vouch_power / 4.0 (default 1.0× if no data)

Score is the sum of all path strengths, rounded to integer.

### calculate_vouch_power(p_user_id UUID)
**Returns:** DECIMAL(3,2)

Calculates avg guest_rating of all users this person has vouched for (where vouchee has ≥1 review). Also stores the result in users.vouch_power.

## Trigger

### trg_vouch_power
**Fires:** AFTER UPDATE OF guest_rating ON users
**Does:** For every user who vouched for the updated user, recalculates their vouch_power.

## Test Queries

Run these in the Supabase SQL Editor after running the migration.

### 1. Insert test users

```sql
-- Clean up any previous test data
DELETE FROM vouches WHERE voucher_id IN (SELECT id FROM users WHERE email LIKE '%@test.1db');
DELETE FROM users WHERE email LIKE '%@test.1db';

-- Insert 4 test users
INSERT INTO users (clerk_id, name, email) VALUES
  ('test_viewer',    'Viewer (Host)',  'viewer@test.1db'),
  ('test_connector', 'Connector (A)',  'connector@test.1db'),
  ('test_target',    'Target (Guest)', 'target@test.1db'),
  ('test_conn2',     'Connector (B)',  'conn2@test.1db');
```

### 2. Insert test vouches

```sql
-- Viewer vouches for Connector A (inner circle, 8-15 yrs = 25 × 1.4 = 35 pts)
INSERT INTO vouches (voucher_id, vouchee_id, vouch_type, years_known_bucket, reputation_stake_confirmed)
SELECT v.id, c.id, 'inner_circle', '8to15yr', true
FROM users v, users c WHERE v.email = 'viewer@test.1db' AND c.email = 'connector@test.1db';

-- Connector A vouches for Target (standard, 1-3 yrs = 15 × 0.8 = 12 pts)
INSERT INTO vouches (voucher_id, vouchee_id, vouch_type, years_known_bucket, reputation_stake_confirmed)
SELECT c.id, t.id, 'standard', '1to3yr', true
FROM users c, users t WHERE c.email = 'connector@test.1db' AND t.email = 'target@test.1db';

-- Viewer vouches for Connector B (standard, 4-7 yrs = 15 × 1.0 = 15 pts)
INSERT INTO vouches (voucher_id, vouchee_id, vouch_type, years_known_bucket, reputation_stake_confirmed)
SELECT v.id, c.id, 'standard', '4to7yr', true
FROM users v, users c WHERE v.email = 'viewer@test.1db' AND c.email = 'conn2@test.1db';

-- Connector B vouches for Target (inner circle, <1 yr = 25 × 0.6 = 15 pts)
INSERT INTO vouches (voucher_id, vouchee_id, vouch_type, years_known_bucket, reputation_stake_confirmed)
SELECT c.id, t.id, 'inner_circle', 'lt1yr', true
FROM users c, users t WHERE c.email = 'conn2@test.1db' AND t.email = 'target@test.1db';
```

### 3. Test calculate_one_degree_scores

```sql
SELECT * FROM calculate_one_degree_scores(
  (SELECT id FROM users WHERE email = 'viewer@test.1db'),
  ARRAY(SELECT id FROM users WHERE email = 'target@test.1db')
);
```

**Expected:** Two paths through Connector A and Connector B.
- Path A: (35 + 12 × 1.0) / 2 = 23.5
- Path B: (15 + 15 × 1.0) / 2 = 15.0
- Total score = 39 (rounded), connection_count = 2

**Verified output (2026-04-10):** `{ score: 39, connection_count: 2 }`

### 4. Test vouch_power trigger

```sql
-- Give Target a guest_rating (simulates completed stay review)
UPDATE users SET guest_rating = 4.5, guest_review_count = 1
WHERE email = 'target@test.1db';

-- Check that Connector A and Connector B now have vouch_power set
SELECT name, vouch_power FROM users WHERE email IN ('connector@test.1db', 'conn2@test.1db');
```

**Expected:** Both connectors should have vouch_power = 4.50 (they each vouched for one person with a 4.5 rating).

**Verified output (2026-04-10):** Connector (A) = 4.50, Connector (B) = 4.50

### 5. Test calculate_vouch_power RPC

```sql
SELECT calculate_vouch_power(
  (SELECT id FROM users WHERE email = 'connector@test.1db')
);
```

**Expected:** Returns 4.50

**Verified output (2026-04-10):** `4.50`

### 6. Test with vouch_power affecting score

```sql
-- Now that connectors have vouch_power, recalculate score
SELECT * FROM calculate_one_degree_scores(
  (SELECT id FROM users WHERE email = 'viewer@test.1db'),
  ARRAY(SELECT id FROM users WHERE email = 'target@test.1db')
);
```

**Expected:**
- Path A: (35 + 12 × 4.5/4.0) / 2 = (35 + 13.5) / 2 = 24.25
- Path B: (15 + 15 × 4.5/4.0) / 2 = (15 + 16.875) / 2 = 15.94
- Total score = 40 (rounded), connection_count = 2

**Verified output (2026-04-10):** `{ score: 40, connection_count: 2 }`

### 7. Test no-connection case

```sql
SELECT * FROM calculate_one_degree_scores(
  (SELECT id FROM users WHERE email = 'target@test.1db'),
  ARRAY(SELECT id FROM users WHERE email = 'viewer@test.1db')
);
```

**Expected:** score = 0, connection_count = 0 (Target has no vouches for anyone who vouches for Viewer)

**Verified output (2026-04-10):** `{ score: 0, connection_count: 0 }`

### 8. Clean up test data

```sql
DELETE FROM vouches WHERE voucher_id IN (SELECT id FROM users WHERE email LIKE '%@test.1db');
DELETE FROM users WHERE email LIKE '%@test.1db';
```

## Listings (CC-6c Updates)

### listings table changes (migration 002)
| Column | Type | Notes |
|--------|------|-------|
| property_type | TEXT | Required. apartment/house/room/other |
| title | TEXT | Required listing title |
| area_name | TEXT | Required. e.g. "Park Slope, Brooklyn" |
| price_min | INTEGER | Per night, USD (nullable) |
| price_max | INTEGER | Per night, USD (nullable) |
| availability_flexible | BOOLEAN | Default false. When true, ignore date range |
| preview_visibility | TEXT | anyone/vouched/trusted/inner_circle/specific (default: anyone) |
| full_visibility | TEXT | anyone/vouched/trusted/inner_circle/specific (default: vouched) |
| min_trust_score | INTEGER | Applies when tier = 'trusted'. Default 0 |
| specific_user_ids | UUID[] | Applies when tier = 'specific'. Default empty |
| updated_at | TIMESTAMPTZ | Auto-set on insert |

### listing_photos table changes (migration 002)
| Column | Type | Notes |
|--------|------|-------|
| storage_path | TEXT | Supabase Storage path (nullable, for legacy) |
| public_url | TEXT | Was `url`, renamed to `public_url` |

### Visibility tiers (CC-6c)
- **anyone** — no restrictions
- **vouched** — viewer must have ≥1 vouch received
- **trusted** — viewer's 1° score vs host must meet min_trust_score
- **inner_circle** — host must have given viewer an inner_circle vouch
- **specific** — viewer's user ID must be in specific_user_ids array

Preview visibility gates the area, price, and preview photos.
Full visibility gates the description, host identity, full gallery, and contact.

## Supabase Storage — listing-photos Bucket

### Setup (manual via Supabase Dashboard)

1. Go to **Storage** in the Supabase Dashboard
2. Create a new **public** bucket named `listing-photos`
3. Enable RLS on the bucket with these policies:

**Read policy (public read for all authenticated):**
```sql
-- Bucket: listing-photos, operation: SELECT
CREATE POLICY "Authenticated users can read listing photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'listing-photos');
```

**Upload policy (users upload to their own prefix):**
```sql
-- Bucket: listing-photos, operation: INSERT
CREATE POLICY "Users can upload to own prefix"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listing-photos'
    AND (storage.foldername(name))[1] = auth.jwt() ->> 'sub'
  );
```

**Delete policy (users delete their own files):**
```sql
-- Bucket: listing-photos, operation: DELETE
CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'listing-photos'
    AND (storage.foldername(name))[1] = auth.jwt() ->> 'sub'
  );
```

### Upload path convention
Files are uploaded to: `{clerk_user_id}/{uuid}.{ext}`

This ensures RLS works correctly — each user can only upload/delete within their own folder prefix.

## Deploying from Scratch

If you need to rebuild the database from zero:

1. Run `supabase/schema.sql` in the Supabase SQL Editor — this creates all tables, indexes, RLS policies, functions, and triggers.
2. Note: the `schema.sql` file uses `CREATE TYPE` without the idempotent wrapper. If types already exist, use the migration file instead which has `DO $$ ... EXCEPTION` blocks.
3. The Clerk webhook will auto-create user rows on sign-up.
4. vouch_power is auto-maintained by the trigger — no cron needed.
