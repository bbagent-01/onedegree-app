-- ============================================================
-- Migration 051: Demo expansion + cruft cleanup
-- ============================================================
-- B7 (continued). Adds 15 famous historical figures to the demo
-- population (writers, scientists, activists — all died pre-1980,
-- broad public-domain coverage). Each gets a Wikipedia/Wikimedia
-- archival portrait, a historic-home listing with photo, and a
-- dense vouching graph that spans famous people, presidents from
-- migration 050, and Loren reciprocally.
--
-- Also removes the leftover non-Loren, non-president test users
-- (Brightbase Agent + 7 spawned_imp_* accounts) so the only
-- preserved real-style account is Loren's. Loren is identified
-- by his stable Clerk ID (the only `is_test_user=true` admin we
-- want to keep).
--
-- Idempotent: rerunning replaces the famous-person set cleanly
-- and re-asserts the cruft removal.
-- ============================================================

BEGIN;

-- 1. Cruft cleanup — same FK chain as migration 050.
DO $$
DECLARE
  victim_ids   uuid[];
  victim_cr    uuid[];
  victim_sc    uuid[];
BEGIN
  -- Anyone who is a test user but NOT Loren and NOT a president
  -- and NOT an already-seeded famous person.
  SELECT ARRAY(
    SELECT id FROM users
    WHERE is_test_user = true
      AND clerk_id <> 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'
      AND clerk_id NOT LIKE 'seed_president_%'
      AND clerk_id NOT LIKE 'seed_famous_%'
  ) INTO victim_ids;

  IF cardinality(victim_ids) = 0 THEN RETURN; END IF;

  SELECT ARRAY(
    SELECT id FROM contact_requests
    WHERE host_id      = ANY(victim_ids)
       OR guest_id     = ANY(victim_ids)
       OR cancelled_by = ANY(victim_ids)
  ) INTO victim_cr;

  PERFORM 1 FROM information_schema.columns
    WHERE table_name = 'contact_requests' AND column_name = 'intro_connector_id';
  IF FOUND THEN
    EXECUTE format(
      'SELECT ARRAY(SELECT unnest($1) UNION SELECT id FROM contact_requests WHERE intro_connector_id = ANY($2) OR intro_sender_id = ANY($2) OR intro_recipient_id = ANY($2))'
    ) INTO victim_cr USING victim_cr, victim_ids;
  END IF;

  SELECT ARRAY(
    SELECT id FROM stay_confirmations
    WHERE host_id  = ANY(victim_ids)
       OR guest_id = ANY(victim_ids)
  ) INTO victim_sc;

  IF cardinality(victim_sc) > 0 THEN
    DECLARE t text; BEGIN
      FOREACH t IN ARRAY ARRAY['vouches','incidents','rental_agreements','security_deposits']
      LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = t AND column_name = 'stay_confirmation_id')
        THEN
          EXECUTE format('UPDATE %I SET stay_confirmation_id = NULL WHERE stay_confirmation_id = ANY($1)', t)
            USING victim_sc;
        END IF;
      END LOOP;
    END;
    DELETE FROM stay_confirmations WHERE id = ANY(victim_sc);
  END IF;

  IF cardinality(victim_cr) > 0 THEN
    UPDATE stay_confirmations SET contact_request_id = NULL WHERE contact_request_id = ANY(victim_cr);
    DELETE FROM contact_requests WHERE id = ANY(victim_cr);
  END IF;

  UPDATE invites         SET claimed_by = NULL WHERE claimed_by = ANY(victim_ids);
  UPDATE pending_vouches SET claimed_by = NULL WHERE claimed_by = ANY(victim_ids);

  DELETE FROM users WHERE id = ANY(victim_ids);
END $$;

-- 2. Idempotent: drop any previous seed_famous_* before re-inserting
DELETE FROM users WHERE clerk_id LIKE 'seed\_famous\_%' ESCAPE '\';

-- 3. INSERT the 15 famous people
INSERT INTO users (clerk_id, name, email, avatar_url, bio, phone_number, is_test_user)
VALUES
(
    'seed_famous_einstein',
    'Albert Einstein',
    'famous_einstein@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/einstein.jpg',
    'Theoretical physicist. Hosting from the Mercer Street house in Princeton. Pipe smoke unavoidable. Long thinking walks recommended.',
    '+12025550200',
    true
  ),
(
    'seed_famous_twain',
    'Mark Twain',
    'famous_twain@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/twain.jpg',
    'Author, riverboat pilot, opinion-haver. Hosting from the Hartford house. Writing room on the third floor. Cigars on the porch.',
    '+12025550201',
    true
  ),
(
    'seed_famous_curie',
    'Marie Curie',
    'famous_curie@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/curie.jpg',
    'Physicist + chemist, two Nobel Prizes (Physics 1903, Chemistry 1911). Hosting from the birthplace townhouse on Freta Street. Lead-lined storage for any souvenirs.',
    '+12025550202',
    true
  ),
(
    'seed_famous_hemingway',
    'Ernest Hemingway',
    'famous_hemingway@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/hemingway.jpg',
    'Novelist, fisherman, war correspondent. Hosting from Whitehead Street in Key West. Six-toed cats roam freely. Daiquiris at sunset.',
    '+12025550203',
    true
  ),
(
    'seed_famous_van_gogh',
    'Vincent van Gogh',
    'famous_van_gogh@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/van_gogh.jpg',
    'Post-Impressionist painter. Hosting from the room above the Auberge in Auvers — last home, briefly. Easels provided. Mustard-yellow walls.',
    '+12025550204',
    true
  ),
(
    'seed_famous_earhart',
    'Amelia Earhart',
    'famous_earhart@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/earhart.jpg',
    'Aviator + record-breaker. Hosting from the Atchison birthplace on the bluff above the Missouri. Long views west. Goggles in the entryway.',
    '+12025550205',
    true
  ),
(
    'seed_famous_keller',
    'Helen Keller',
    'famous_keller@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/keller.jpg',
    'Author, lecturer, activist. Hosting from Ivy Green, the Tuscumbia farmstead. The water pump in the yard is the original. Quiet preferred.',
    '+12025550206',
    true
  ),
(
    'seed_famous_e_roosevelt',
    'Eleanor Roosevelt',
    'famous_e_roosevelt@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/e_roosevelt.jpg',
    'Diplomat, activist, longest-serving First Lady. Hosting from Val-Kill in Hyde Park. My own place, finally. Tea on the porch.',
    '+12025550207',
    true
  ),
(
    'seed_famous_churchill',
    'Winston Churchill',
    'famous_churchill@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/churchill.jpg',
    'Prime Minister, painter, brick-layer. Hosting from Chartwell in the Weald of Kent. Cigars provided. Painting studio open to guests.',
    '+12025550208',
    true
  ),
(
    'seed_famous_poe',
    'Edgar Allan Poe',
    'famous_poe@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/poe.jpg',
    'Writer of strange tales. Hosting from the small brick row house on Amity Street. Ravens at dusk. Drafts in the desk drawer.',
    '+12025550209',
    true
  ),
(
    'seed_famous_potter',
    'Beatrix Potter',
    'famous_potter@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/potter.jpg',
    'Author, illustrator, conservationist. Hosting from Hill Top in the Lake District. Sheep welcome on the lower fields. Tea in the parlor.',
    '+12025550210',
    true
  ),
(
    'seed_famous_darwin',
    'Charles Darwin',
    'famous_darwin@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/darwin.jpg',
    'Naturalist, geologist, biologist. Hosting from Down House in Kent. Long walks on the sandwalk. Pigeons in the dovecote.',
    '+12025550211',
    true
  ),
(
    'seed_famous_whitman',
    'Walt Whitman',
    'famous_whitman@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/whitman.jpg',
    'Poet, printer, government clerk. Hosting from the Mickle Street row house in Camden. Verses in every drawer. Loud singing tolerated.',
    '+12025550212',
    true
  ),
(
    'seed_famous_fitzgerald',
    'F. Scott Fitzgerald',
    'famous_fitzgerald@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/fitzgerald.jpg',
    'Novelist of the Jazz Age. Hosting from the Summit Avenue brownstone in Saint Paul. Gin discreetly stocked. Wear something nice.',
    '+12025550213',
    true
  ),
(
    'seed_famous_anthony',
    'Susan B. Anthony',
    'famous_anthony@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/anthony.jpg',
    'Suffragist + reformer. Hosting from the Madison Street brick house in Rochester. Speeches available on request. No vouching for anyone who won''t extend the franchise.',
    '+12025550214',
    true
  );

-- 4. INSERT one listing per famous person
INSERT INTO listings (
  host_id, property_type, title, area_name, description,
  price_min, price_max, preview_visibility, full_visibility, amenities, is_active
)
VALUES
(
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_einstein'),
    'house',
    'Einstein House — Princeton Clapboard',
    'Princeton, NJ',
    'Modest two-story clapboard at 112 Mercer Street, Einstein''s home from 1935 until 1955. Wood-paneled study with the chalkboard, leafy front porch, walking distance to the Institute for Advanced Study.',
    230, 230,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'garden', 'library']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    'house',
    'Mark Twain House — High-Victorian on Farmington Avenue',
    'Hartford, CT',
    'High-Victorian Gothic on Farmington Avenue, designed by Edward Tuckerman Potter. Painted brick, sweeping conservatory, the billiard-room study where Tom Sawyer and Huck Finn were written.',
    270, 270,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'billiards', 'library', 'porch']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_curie'),
    'house',
    'Maria Skłodowska-Curie Museum — Birthplace in the Old Town',
    'Warsaw, Poland',
    '18th-century townhouse in Warsaw''s Old Town, where Maria Skłodowska was born. Restored period rooms, a small museum below, and a quiet courtyard garden.',
    180, 180,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'library', 'museum', 'courtyard']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_hemingway'),
    'house',
    'Hemingway Home — Key West Spanish Colonial',
    'Key West, FL',
    '1851 Spanish Colonial on Whitehead Street, two stories of coral rock with wraparound verandas. Saltwater pool, gardens of palms and bougainvillea, the writing studio above the carriage house.',
    290, 290,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'pool', 'garden', 'porch', 'library']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_van_gogh'),
    'house',
    'Auberge Ravoux — Final Lodgings in Auvers',
    'Auvers-sur-Oise, France',
    'Tiny attic room at the Auberge Ravoux, where van Gogh lodged for the final 70 days of his life. Sloped ceiling, single window, the village square below. The auberge restaurant downstairs is still open.',
    160, 160,
    'anyone', 'vouched',
    ARRAY['wifi', 'shared_kitchen', 'garden', 'village_square_view']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_earhart'),
    'house',
    'Amelia Earhart Birthplace — Bluff Above the Missouri',
    'Atchison, KS',
    'Gothic Revival cottage on a Missouri River bluff where Amelia spent her early childhood. Wraparound veranda, original family furnishings, sweeping views of the river.',
    175, 175,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'porch', 'river_view']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_keller'),
    'house',
    'Ivy Green — Family Farmstead',
    'Tuscumbia, AL',
    '1820 white-clapboard family home on a 640-acre Alabama farmstead. The famous water pump still stands. Cook''s cottage, magnolias, and a working herb garden.',
    170, 170,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'garden', 'porch', 'fireplace']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_e_roosevelt'),
    'house',
    'Val-Kill Cottage — Eleanor''s Hyde Park Retreat',
    'Hyde Park, NY',
    'Stone-and-stucco fieldstone cottage on Fall Kill creek — Eleanor''s only fully owned home. Reading porch, swimming pond, and the rolling Hyde Park countryside.',
    230, 230,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'porch', 'pond_swimming']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_churchill'),
    'house',
    'Chartwell — Country House in the Weald of Kent',
    'Westerham, UK',
    'Country house above the Weald with 80 acres of gardens, lakes, and walled vegetable plots. The painting studio in the orchard. Chartwell Mary''s blue dining room.',
    350, 350,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'garden', 'lake', 'studio']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_poe'),
    'house',
    'Poe House — Baltimore Brick Row House',
    'Baltimore, MD',
    'Tiny 1830s brick row house in Baltimore where Poe lived in the 1830s. Three small rooms, narrow staircase, and a back garret bedroom under the eaves.',
    145, 145,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'garret_bedroom']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_potter'),
    'house',
    'Hill Top — 17th-Century Lake District Farm',
    'Near Sawrey, UK',
    '17th-century Lake District farmhouse on 34 acres of fells and gardens. The slate-roofed kitchen, oak settles, and the cottage garden of Peter Rabbit fame.',
    210, 210,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'garden', 'fells_walking']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_darwin'),
    'house',
    'Down House — Country Home in Kent',
    'Downe, UK',
    'Georgian country house in Downe village with 18 acres of meadow, gardens, and the famous Sandwalk where Darwin paced out his thinking. The study still holds his notebooks.',
    260, 260,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'garden', 'trails', 'library']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_whitman'),
    'house',
    'Walt Whitman House — Mickle Street Row House',
    'Camden, NJ',
    'Two-story wood frame on Mickle Street, the only house Walt ever owned. Small parlor, the upstairs bedroom-study, and the back garden where he kept his caged birds.',
    140, 140,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'garden']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_fitzgerald'),
    'house',
    'Fitzgerald House — Summit Avenue Brownstone',
    'Saint Paul, MN',
    '1889 Romanesque brownstone row house on Summit Avenue, where Fitzgerald wrote and revised ''This Side of Paradise.'' Stained glass, dark woodwork, and a small reading parlor.',
    195, 195,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'library']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_anthony'),
    'house',
    'Susan B. Anthony House — Brick Italianate',
    'Rochester, NY',
    'Two-story brick Italianate where Anthony was arrested in 1872 for voting. The front parlor, the desk, and the upstairs bedroom where she died. Quiet residential block.',
    160, 160,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'library', 'garden']::text[],
    true
  );

-- 5. INSERT cover photo per listing
INSERT INTO listing_photos (listing_id, public_url, is_preview, sort_order)
VALUES
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_famous_einstein') AND title = 'Einstein House — Princeton Clapboard'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/einstein-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_famous_twain') AND title = 'Mark Twain House — High-Victorian on Farmington Avenue'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/twain-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_famous_curie') AND title = 'Maria Skłodowska-Curie Museum — Birthplace in the Old Town'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/curie-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_famous_hemingway') AND title = 'Hemingway Home — Key West Spanish Colonial'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/hemingway-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_famous_van_gogh') AND title = 'Auberge Ravoux — Final Lodgings in Auvers'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/van_gogh-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_famous_earhart') AND title = 'Amelia Earhart Birthplace — Bluff Above the Missouri'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/earhart-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_famous_keller') AND title = 'Ivy Green — Family Farmstead'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/keller-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_famous_e_roosevelt') AND title = 'Val-Kill Cottage — Eleanor''s Hyde Park Retreat'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/e_roosevelt-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_famous_churchill') AND title = 'Chartwell — Country House in the Weald of Kent'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/churchill-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_famous_poe') AND title = 'Poe House — Baltimore Brick Row House'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/poe-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_famous_potter') AND title = 'Hill Top — 17th-Century Lake District Farm'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/potter-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_famous_darwin') AND title = 'Down House — Country Home in Kent'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/darwin-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_famous_whitman') AND title = 'Walt Whitman House — Mickle Street Row House'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/whitman-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_famous_fitzgerald') AND title = 'Fitzgerald House — Summit Avenue Brownstone'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/fitzgerald-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_famous_anthony') AND title = 'Susan B. Anthony House — Brick Italianate'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/anthony-home.jpg',
    true,
    0
  );

-- 6. INSERT vouches (famous↔famous, famous↔presidents, famous↔Loren).
--    The WHERE filters skip rows where either side resolves to NULL —
--    safe even if some target user is missing (e.g. presidents from
--    migration 050 not yet applied). ON CONFLICT DO NOTHING absorbs
--    any duplicates against the existing vouch graph from 050.
INSERT INTO vouches (voucher_id, vouchee_id, vouch_type, years_known_bucket, reputation_stake_confirmed)
SELECT v.voucher_id, v.vouchee_id,
       v.vouch_type::vouch_type_enum,
       v.years_known_bucket::years_known_bucket_enum,
       v.reputation_stake_confirmed
FROM (
  VALUES
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_darwin'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_einstein'),
    'inner_circle', '15plusyr', true),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_einstein'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_darwin'),
    'inner_circle', '15plusyr', true),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_curie'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_einstein'),
    'inner_circle', '15plusyr', true),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_einstein'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_curie'),
    'inner_circle', '15plusyr', true),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_darwin'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_curie'),
    'inner_circle', '15plusyr', true),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_curie'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_darwin'),
    'inner_circle', '15plusyr', true),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_hemingway'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_fitzgerald'),
    'inner_circle', '15plusyr', true),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_fitzgerald'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_hemingway'),
    'inner_circle', '15plusyr', true),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_whitman'),
    'inner_circle', '15plusyr', true),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_whitman'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    'inner_circle', '15plusyr', true),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_fitzgerald'),
    'inner_circle', '15plusyr', true),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_fitzgerald'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    'inner_circle', '15plusyr', true),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_anthony'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_keller'),
    'inner_circle', '15plusyr', true),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_keller'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_anthony'),
    'inner_circle', '15plusyr', true),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_anthony'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_e_roosevelt'),
    'inner_circle', '15plusyr', true),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_e_roosevelt'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_anthony'),
    'inner_circle', '15plusyr', true),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_keller'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_e_roosevelt'),
    'inner_circle', '15plusyr', true),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_e_roosevelt'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_keller'),
    'inner_circle', '15plusyr', true),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_potter'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_darwin'),
    'inner_circle', '15plusyr', true),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_darwin'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_potter'),
    'inner_circle', '15plusyr', true),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_churchill'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_e_roosevelt'),
    'inner_circle', '15plusyr', true),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_e_roosevelt'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_churchill'),
    'inner_circle', '15plusyr', true),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_einstein'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_einstein'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_einstein'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_churchill'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_churchill'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_einstein'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_einstein'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_e_roosevelt'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_e_roosevelt'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_einstein'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_hemingway'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_hemingway'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_keller'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_keller'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_curie'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_anthony'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_anthony'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_curie'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_curie'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_keller'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_keller'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_curie'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_curie'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_potter'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_potter'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_curie'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_hemingway'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_churchill'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_churchill'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_hemingway'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_hemingway'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_van_gogh'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_van_gogh'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_hemingway'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_hemingway'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_poe'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_poe'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_hemingway'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_van_gogh'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_potter'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_potter'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_van_gogh'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_van_gogh'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_van_gogh'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_van_gogh'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_whitman'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_whitman'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_van_gogh'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_van_gogh'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_poe'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_poe'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_van_gogh'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_earhart'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_e_roosevelt'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_e_roosevelt'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_earhart'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_earhart'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_anthony'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_anthony'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_earhart'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_earhart'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_keller'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_keller'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_earhart'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_earhart'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_churchill'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_churchill'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_earhart'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_earhart'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_earhart'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_keller'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_darwin'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_darwin'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_keller'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_churchill'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_churchill'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_churchill'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_fitzgerald'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_fitzgerald'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_churchill'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_poe'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_whitman'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_whitman'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_poe'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_poe'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_poe'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_poe'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_potter'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_potter'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_poe'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_potter'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_potter'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_potter'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_anthony'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_anthony'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_potter'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_potter'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_keller'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_keller'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_potter'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_darwin'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_darwin'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_darwin'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_whitman'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_whitman'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_darwin'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_whitman'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_fitzgerald'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_fitzgerald'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_whitman'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_fitzgerald'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_poe'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_poe'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_fitzgerald'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_anthony'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_anthony'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_e_roosevelt'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_e_roosevelt'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_e_roosevelt'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_truman'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_truman'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_e_roosevelt'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_e_roosevelt'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_wilson'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_wilson'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_e_roosevelt'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_e_roosevelt'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_e_roosevelt'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_einstein'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_einstein'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_einstein'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_wilson'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_wilson'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_einstein'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_einstein'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_einstein'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_grant'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_grant'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_t_roosevelt'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_t_roosevelt'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_churchill'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_churchill'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_churchill'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_truman'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_truman'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_churchill'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_churchill'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_eisenhower'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_eisenhower'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_churchill'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_churchill'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jfk'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_jfk'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_churchill'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_anthony'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_anthony'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_anthony'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_grant'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_grant'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_anthony'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_keller'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_wilson'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_wilson'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_keller'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_keller'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_keller'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_hemingway'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jfk'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_jfk'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_hemingway'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_hemingway'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_hemingway'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_fitzgerald'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_fitzgerald'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_fitzgerald'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_wilson'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_wilson'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_fitzgerald'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_darwin'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_darwin'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_curie'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_wilson'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_wilson'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_curie'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_whitman'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_whitman'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_whitman'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_grant'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_grant'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_whitman'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_van_gogh'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_t_roosevelt'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_t_roosevelt'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_van_gogh'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_potter'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_t_roosevelt'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_t_roosevelt'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_potter'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_earhart'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_earhart'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_earhart'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_t_roosevelt'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_t_roosevelt'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_earhart'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_earhart'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_truman'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_truman'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_earhart'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_poe'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jackson'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_jackson'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_poe'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_poe'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_j_adams'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_j_adams'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_poe'),
    'standard', '15plusyr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_einstein'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_einstein'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_twain'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_curie'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_curie'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_hemingway'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_hemingway'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_van_gogh'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_van_gogh'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_earhart'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_earhart'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_keller'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_keller'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_e_roosevelt'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_e_roosevelt'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_churchill'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_churchill'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_poe'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_poe'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_potter'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_potter'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_darwin'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_darwin'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_whitman'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_whitman'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_fitzgerald'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_fitzgerald'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_famous_anthony'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_famous_anthony'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false)
) AS v(voucher_id, vouchee_id, vouch_type, years_known_bucket, reputation_stake_confirmed)
WHERE v.voucher_id IS NOT NULL AND v.vouchee_id IS NOT NULL
ON CONFLICT (voucher_id, vouchee_id) DO NOTHING;

-- 7. Sanity check
DO $$
DECLARE
  pres_count int; fam_count int; list_count int;
  vouch_count int; real_count int; total_test int;
BEGIN
  SELECT COUNT(*) INTO pres_count FROM users WHERE clerk_id LIKE 'seed_president_%';
  SELECT COUNT(*) INTO fam_count  FROM users WHERE clerk_id LIKE 'seed_famous_%';
  SELECT COUNT(*) INTO list_count FROM listings l
    JOIN users u ON l.host_id = u.id
    WHERE u.clerk_id LIKE 'seed_president_%' OR u.clerk_id LIKE 'seed_famous_%';
  SELECT COUNT(*) INTO vouch_count FROM vouches;
  SELECT COUNT(*) INTO real_count  FROM users WHERE is_test_user = false;
  SELECT COUNT(*) INTO total_test  FROM users WHERE is_test_user = true;
  RAISE NOTICE 'B7-051 complete: presidents=%, famous=%, total_test_users=%, real_users=%, total_listings=%, total_vouches=%',
    pres_count, fam_count, total_test, real_count, list_count, vouch_count;
END $$;

COMMIT;
