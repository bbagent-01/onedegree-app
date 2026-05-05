-- ============================================================
-- Migration 053: demo profile-state variety
-- ============================================================
-- B7 (continued). Adds 6 demo users that exercise three distinct
-- trust-badge states beyond plain 1°/2°/3°:
--   - 4+°       : Lafayette + John Marshall, chained to the founder
--                 cluster (Madison/Monroe/J.Adams sit at 3° from Loren)
--   - no conn   : Chopin + Andersen, vouched only with each other
--                 (degree=null, vouch_score>0 → "in network, no path")
--   - new member: Nightingale + Thoreau, zero vouches anywhere
--                 (degree=null, vouch_score=0 → cold-start "New member"
--                 per src/lib/trust/badge.ts:isColdStart)
--
-- Also backdates the existing demo users' created_at by 30 days so
-- the new-member pair stands out as actually-recent in the UI.
--
-- All listings use preview_visibility='anyone' so any signed-in user
-- can see them in /browse, regardless of trust degree.
--
-- Idempotent: drops any prior seed_variety_* rows before re-inserting.
-- ============================================================

BEGIN;

-- 0. Idempotent reset of the variety set
DELETE FROM users WHERE clerk_id LIKE 'seed\_variety\_%' ESCAPE '\';

-- 1. INSERT the 6 variety users (vouch_score baked in per archetype)
INSERT INTO users (
  clerk_id, name, email, avatar_url, bio, phone_number, is_test_user, vouch_score
)
VALUES
(
    'seed_variety_lafayette',
    'Marquis de Lafayette',
    'variety_lafayette@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/variety/lafayette.png',
    'French general, friend of Washington, Lincoln-was-too-young-to-meet figure. Hosting from La Grange near Paris. Tricolor optional.',
    '+12025550300',
    true,
    3.8
  ),
(
    'seed_variety_john_marshall',
    'John Marshall',
    'variety_john_marshall@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/variety/john_marshall.jpg',
    '4th Chief Justice of the United States. Hosting from Marshall Street in Richmond. Constitutional questions answered after coffee.',
    '+12025550301',
    true,
    3.8
  ),
(
    'seed_variety_chopin',
    'Frédéric Chopin',
    'variety_chopin@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/variety/chopin.jpeg',
    'Composer + pianist. Hosting from Żelazowa Wola, the Polish manor where I was born. Practicing piano in the parlor — knock first.',
    '+12025550302',
    true,
    2.5
  ),
(
    'seed_variety_andersen',
    'Hans Christian Andersen',
    'variety_andersen@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/variety/andersen.jpg',
    'Storyteller. Hosting from the yellow cottage in Odense. Tin soldiers and paper-cuttings on the desk. Mind the duck pond.',
    '+12025550303',
    true,
    2.5
  ),
(
    'seed_variety_nightingale',
    'Florence Nightingale',
    'variety_nightingale@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/variety/nightingale.jpg',
    'Statistician + nursing reformer. Just joined — Embley Park is where I grew up. Quiet evenings preferred. Pie charts on the wall.',
    '+12025550304',
    true,
    0
  ),
(
    'seed_variety_thoreau',
    'Henry David Thoreau',
    'variety_thoreau@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/variety/thoreau.jpg',
    'Naturalist + essayist. New here. Hosting from a one-room cabin replica on the shore of Walden. Bring a notebook. Beans extra.',
    '+12025550305',
    true,
    0
  );

-- 2. INSERT one listing per variety user (all preview_visibility='anyone')
INSERT INTO listings (
  host_id, property_type, title, area_name, description,
  price_min, price_max, preview_visibility, full_visibility, amenities, is_active
)
VALUES
(
    (SELECT id FROM users WHERE clerk_id = 'seed_variety_lafayette'),
    'house',
    'La Grange-Bléneau — Lafayette''s Country Château',
    'Courpalay, France',
    'Medieval moated château remodeled by Lafayette after he returned from the American Revolution. Tower library, walled gardens, and the long allée he planted with Washington seedlings.',
    280, 280,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'library', 'garden', 'moat']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_variety_john_marshall'),
    'house',
    'Marshall House — Federal-Era Brick Townhouse',
    'Richmond, VA',
    'Federal-era brick townhouse Marshall built in 1790. Chief Justice''s study, original 18th-century furnishings, and a small kitchen garden out back.',
    210, 210,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'library', 'garden']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_variety_chopin'),
    'house',
    'Żelazowa Wola — Chopin''s Birthplace Manor',
    'Żelazowa Wola, Poland',
    'Whitewashed manor on the Utrata river west of Warsaw. The piano room overlooking the park, willow-lined paths, and summer concerts on the lawn.',
    175, 175,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'piano', 'garden', 'river_view']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_variety_andersen'),
    'house',
    'H.C. Andersens Hus — Yellow Cottage in Odense',
    'Odense, Denmark',
    'Tiny mustard-yellow cottage in the old quarter of Odense, where Andersen was born. Two rooms, a garret, and a courtyard the village children still visit.',
    140, 140,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'garret_bedroom', 'courtyard']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_variety_nightingale'),
    'house',
    'Embley Park — Hampshire Country Estate',
    'Romsey, UK',
    'Hampshire country estate where Florence spent her childhood. Long gravel drive, walled rose garden, and a small wing converted into a reading library.',
    220, 220,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'library', 'garden']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_variety_thoreau'),
    'house',
    'Thoreau''s Cabin — Replica on the Walden Shore',
    'Concord, MA',
    'Single-room cabin on Walden Pond, faithful replica of the 10x15 ft house Thoreau built himself in 1845. Bed, desk, three chairs (one for solitude, two for friendship). Pond swimming.',
    95, 95,
    'anyone', 'vouched',
    ARRAY['kitchen', 'wood_stove', 'pond_swimming', 'trails']::text[],
    true
  );

-- 3. INSERT cover photo per listing
INSERT INTO listing_photos (listing_id, public_url, is_preview, sort_order)
VALUES
(
    (SELECT id FROM listings
       WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_variety_lafayette')
         AND title = 'La Grange-Bléneau — Lafayette''s Country Château'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/variety/lafayette-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings
       WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_variety_john_marshall')
         AND title = 'Marshall House — Federal-Era Brick Townhouse'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/variety/john_marshall-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings
       WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_variety_chopin')
         AND title = 'Żelazowa Wola — Chopin''s Birthplace Manor'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/variety/chopin-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings
       WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_variety_andersen')
         AND title = 'H.C. Andersens Hus — Yellow Cottage in Odense'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/variety/andersen-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings
       WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_variety_nightingale')
         AND title = 'Embley Park — Hampshire Country Estate'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/variety/nightingale-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings
       WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_variety_thoreau')
         AND title = 'Thoreau''s Cabin — Replica on the Walden Shore'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/variety/thoreau-home.jpg',
    true,
    0
  );

-- 4. INSERT vouches (4+° chain + no-conn pair only — new-member pair gets nothing)
INSERT INTO vouches (voucher_id, vouchee_id, vouch_type, years_known_bucket, reputation_stake_confirmed)
SELECT v.voucher_id, v.vouchee_id,
       v.vouch_type::vouch_type_enum,
       v.years_known_bucket::years_known_bucket_enum,
       v.reputation_stake_confirmed
FROM (
  VALUES
    ((SELECT id FROM users WHERE clerk_id = 'seed_variety_lafayette'),
    (SELECT id FROM users WHERE clerk_id = 'seed_variety_john_marshall'),
    'inner_circle', '15plusyr', true),
    ((SELECT id FROM users WHERE clerk_id = 'seed_variety_john_marshall'),
    (SELECT id FROM users WHERE clerk_id = 'seed_variety_lafayette'),
    'inner_circle', '15plusyr', true),
    ((SELECT id FROM users WHERE clerk_id = 'seed_variety_lafayette'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_madison'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_madison'),
    (SELECT id FROM users WHERE clerk_id = 'seed_variety_lafayette'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_variety_lafayette'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_monroe'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_monroe'),
    (SELECT id FROM users WHERE clerk_id = 'seed_variety_lafayette'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_variety_lafayette'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_washington'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_washington'),
    (SELECT id FROM users WHERE clerk_id = 'seed_variety_lafayette'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_variety_john_marshall'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_j_adams'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_j_adams'),
    (SELECT id FROM users WHERE clerk_id = 'seed_variety_john_marshall'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_variety_john_marshall'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_madison'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_madison'),
    (SELECT id FROM users WHERE clerk_id = 'seed_variety_john_marshall'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_variety_chopin'),
    (SELECT id FROM users WHERE clerk_id = 'seed_variety_andersen'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_variety_andersen'),
    (SELECT id FROM users WHERE clerk_id = 'seed_variety_chopin'),
    'standard', '15plusyr', false)
) AS v(voucher_id, vouchee_id, vouch_type, years_known_bucket, reputation_stake_confirmed)
WHERE v.voucher_id IS NOT NULL AND v.vouchee_id IS NOT NULL
ON CONFLICT (voucher_id, vouchee_id) DO NOTHING;

-- 5. Backdate existing demo users (presidents, famous, far, no-conn)
--    by 30 days so the new-member pair shows as actually-recent in the
--    UI. Loren's account + the new-member pair are NOT touched.
UPDATE users
SET created_at = now() - interval '30 days'
WHERE is_test_user = true
  AND clerk_id <> 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'
  AND clerk_id NOT IN (
    'seed_variety_nightingale',
    'seed_variety_thoreau'
  );

-- 6. Sanity check
DO $$
DECLARE
  far_count int; noconn_count int; new_count int;
  far_vouches int; noconn_vouches int; new_vouches int;
BEGIN
  SELECT COUNT(*) INTO far_count    FROM users WHERE clerk_id IN ('seed_variety_lafayette','seed_variety_john_marshall');
  SELECT COUNT(*) INTO noconn_count FROM users WHERE clerk_id IN ('seed_variety_chopin','seed_variety_andersen');
  SELECT COUNT(*) INTO new_count    FROM users WHERE clerk_id IN ('seed_variety_nightingale','seed_variety_thoreau');

  SELECT COUNT(*) INTO far_vouches    FROM vouches v
    JOIN users u ON v.voucher_id = u.id OR v.vouchee_id = u.id
    WHERE u.clerk_id IN ('seed_variety_lafayette','seed_variety_john_marshall');
  SELECT COUNT(*) INTO noconn_vouches FROM vouches v
    JOIN users u ON v.voucher_id = u.id OR v.vouchee_id = u.id
    WHERE u.clerk_id IN ('seed_variety_chopin','seed_variety_andersen');
  SELECT COUNT(*) INTO new_vouches    FROM vouches v
    JOIN users u ON v.voucher_id = u.id OR v.vouchee_id = u.id
    WHERE u.clerk_id IN ('seed_variety_nightingale','seed_variety_thoreau');

  RAISE NOTICE 'B7-053 complete: far=% (vouches=%), no_conn=% (vouches=%), new_member=% (vouches=%, expected 0)',
    far_count, far_vouches, noconn_count, noconn_vouches, new_count, new_vouches;
END $$;

COMMIT;
