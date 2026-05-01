-- ============================================================
-- Migration 050: Demo seed — US presidents
-- ============================================================
-- B7. Replaces the legacy seed-script demo population (clerk_id like
-- 'seed_*') with 15 historical US presidents (all died pre-1980).
-- Photos sourced from Wikipedia / Wikimedia Commons (public domain),
-- mirrored to Supabase storage buckets:
--   - profile-photos/presidents/<key>.jpg
--   - listing-photos/presidents/<key>-home.jpg
-- See DEMO_SEED_SOURCES.md for per-photo provenance.
--
-- Preserves: Loren's account, Brightbase Agent, all spawned_imp_* users.
-- Does NOT touch any user with is_test_user = false.
--
-- Idempotent: re-running this migration cleanly replaces the president
-- demo set and leaves all other users untouched.
-- ============================================================

BEGIN;

-- 1. Pre-clean FK rows that DO NOT cascade. Several tables block a user
--    DELETE: contact_requests, stay_confirmations, invites.claimed_by,
--    pending_vouches.claimed_by. AND stay_confirmations holds a FK back
--    to contact_requests, so the cleanup order matters. Walk the chain
--    leaves-up:
--      a) Clear back-references INTO our stay_confirmations
--         (vouches, incidents, house_manuals, rental_agreements,
--          security_deposits — all nullable)
--      b) Delete those stay_confirmations
--      c) Clear stay_confirmations.contact_request_id pointing into our CRs
--      d) Delete our contact_requests
--      e) NULL the invites + pending_vouches claimed_by
--    Safe no-op when victim set is empty.
DO $$
DECLARE
  victim_ids   uuid[];
  victim_cr    uuid[];
  victim_sc    uuid[];
BEGIN
  SELECT ARRAY(SELECT id FROM users WHERE clerk_id LIKE 'seed\_%' ESCAPE '\')
    INTO victim_ids;
  IF cardinality(victim_ids) = 0 THEN RETURN; END IF;

  -- Collect target contact_requests (incl. cancelled_by + intro_* if present)
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

  -- Collect target stay_confirmations (host or guest is a victim)
  SELECT ARRAY(
    SELECT id FROM stay_confirmations
    WHERE host_id  = ANY(victim_ids)
       OR guest_id = ANY(victim_ids)
  ) INTO victim_sc;

  -- (a) Clear back-refs into our stay_confirmations.
  --     Only certain tables actually have a stay_confirmation_id col;
  --     guard each with information_schema so the migration is portable
  --     across schema variants.
  IF cardinality(victim_sc) > 0 THEN
    DECLARE
      t text;
    BEGIN
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
    -- (b) Now we can safely delete the stay_confirmations themselves
    DELETE FROM stay_confirmations WHERE id = ANY(victim_sc);
  END IF;

  -- (c) Clear stay_confirmations.contact_request_id pointing to victim CRs
  --     (these stay_confirmations belong to OTHER users, so we don't delete them)
  IF cardinality(victim_cr) > 0 THEN
    UPDATE stay_confirmations SET contact_request_id = NULL WHERE contact_request_id = ANY(victim_cr);
    -- (d) Delete the contact_requests
    DELETE FROM contact_requests WHERE id = ANY(victim_cr);
  END IF;

  -- (e) Clean up invites + pending_vouches NO-ACTION refs
  UPDATE invites         SET claimed_by = NULL WHERE claimed_by = ANY(victim_ids);
  UPDATE pending_vouches SET claimed_by = NULL WHERE claimed_by = ANY(victim_ids);
END $$;

-- 2. DELETE seed users — cascades to: vouches, listings (→ listing_photos),
--    invites where they were inviter, incidents, house_manuals, etc.
DELETE FROM users WHERE clerk_id LIKE 'seed\_%' ESCAPE '\';

-- 3. INSERT the 15 presidents
INSERT INTO users (clerk_id, name, email, avatar_url, bio, phone_number, is_test_user)
VALUES
(
    'seed_president_washington',
    'George Washington',
    'president_washington@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/washington.jpg',
    '1st president of the United States. Hosting from the Mansion House Farm at Mount Vernon. Quiet retreats, river views, no whiskey provided (any longer).',
    '+12025550100',
    true
  ),
(
    'seed_president_j_adams',
    'John Adams',
    'president_j_adams@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/j_adams.jpg',
    '2nd president of the United States. Hosting from Peacefield in Quincy. Bring books. The library has more than the country had at founding.',
    '+12025550101',
    true
  ),
(
    'seed_president_jefferson',
    'Thomas Jefferson',
    'president_jefferson@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/jefferson.jpg',
    '3rd president. Hosting from Monticello. Architecture nerds welcome. Strong opinions about wine, weather instruments, and dome construction.',
    '+12025550102',
    true
  ),
(
    'seed_president_madison',
    'James Madison',
    'president_madison@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/madison.jpg',
    '4th president. Hosting from Montpelier in Orange. Library quiet hours strictly observed. Constitution drafts available on request.',
    '+12025550103',
    true
  ),
(
    'seed_president_monroe',
    'James Monroe',
    'president_monroe@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/monroe.jpg',
    '5th president. Hosting from Highland near Charlottesville. Era of Good Feelings, etc. Borders friendly. Doctrine flexible.',
    '+12025550104',
    true
  ),
(
    'seed_president_jackson',
    'Andrew Jackson',
    'president_jackson@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/jackson.jpg',
    '7th president. Hosting from The Hermitage outside Nashville. Strong-willed. Strong coffee. Don''t bring a national bank.',
    '+12025550105',
    true
  ),
(
    'seed_president_lincoln',
    'Abraham Lincoln',
    'president_lincoln@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/lincoln.jpg',
    '16th president of the United States. Hosting from Springfield, IL. Tall ceilings (and tall host). Honest pricing only.',
    '+12025550106',
    true
  ),
(
    'seed_president_grant',
    'Ulysses S. Grant',
    'president_grant@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/grant.jpg',
    '18th president of the United States. Hosting from a small Adirondack cottage near Saratoga. Cigars not provided. Memoirs in the bedside drawer.',
    '+12025550107',
    true
  ),
(
    'seed_president_t_roosevelt',
    'Theodore Roosevelt',
    'president_t_roosevelt@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/t_roosevelt.jpg',
    '26th president of the United States. Hosting from Sagamore Hill on Long Island. Bring boots. Bully welcome. Hot baths after long hikes.',
    '+12025550108',
    true
  ),
(
    'seed_president_taft',
    'William Howard Taft',
    'president_taft@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/taft.jpg',
    '27th president, then Chief Justice. Hosting from the family home in Cincinnati. Civil discourse expected. Robes provided.',
    '+12025550109',
    true
  ),
(
    'seed_president_wilson',
    'Woodrow Wilson',
    'president_wilson@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/wilson.jpg',
    '28th president of the United States. Hosting from a Georgian Revival on S Street in DC. Embassy Row neighbors. League of Nations brochures in the foyer.',
    '+12025550110',
    true
  ),
(
    'seed_president_fdr',
    'Franklin D. Roosevelt',
    'president_fdr@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/fdr.jpg',
    '32nd president of the United States. Hosting from Springwood at Hyde Park on the Hudson. Fireside chats welcome. Naval prints in every room.',
    '+12025550111',
    true
  ),
(
    'seed_president_truman',
    'Harry S. Truman',
    'president_truman@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/truman.jpg',
    '33rd president of the United States. Hosting from the Wallace house in Independence, MO. The buck stops on the porch. Bourbon optional.',
    '+12025550112',
    true
  ),
(
    'seed_president_eisenhower',
    'Dwight D. Eisenhower',
    'president_eisenhower@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/eisenhower.jpg',
    '34th president of the United States. Hosting from the working farm at Gettysburg. Bring binoculars for the battlefield. Skeet on weekends.',
    '+12025550113',
    true
  ),
(
    'seed_president_jfk',
    'John F. Kennedy',
    'president_jfk@seed.1db',
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/jfk.jpg',
    '35th president of the United States. Hosting from the family birthplace in Brookline. Sailing recommendations in the entryway. Touch football out back.',
    '+12025550114',
    true
  );

-- 4. INSERT one listing per president (their historic home)
INSERT INTO listings (
  host_id, property_type, title, area_name, description,
  price_min, price_max, preview_visibility, full_visibility, amenities, is_active
)
VALUES
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_washington'),
    'house',
    'Mount Vernon — President''s House on the Potomac',
    'Mount Vernon, VA',
    'The President''s House along the Potomac. Eight bedrooms, original 18th-century Palladian sash, working farm grounds. Sunrise on the piazza is the whole reason to come.',
    380, 380,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'garden', 'river_view']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_j_adams'),
    'house',
    'Peacefield — Old House at the Adams Estate',
    'Quincy, MA',
    'The Old House at Peacefield. Federal-style with a stone library wing added by JQA. Long shaded lawn, herb garden, and a quiet study where four generations of Adamses worked.',
    240, 240,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'library', 'garden', 'fireplace']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jefferson'),
    'house',
    'Monticello — Mountaintop Estate',
    'Charlottesville, VA',
    'Mountaintop neoclassical home that took 40 years to build. Dome room, long galleries, terraced vegetable garden with a Palladian view of the Blue Ridge.',
    360, 360,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'garden', 'library', 'mountain_view']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_madison'),
    'house',
    'Montpelier — Federal-Style Plantation House',
    'Orange, VA',
    'Federal-style plantation house on 2,650 acres of rolling Virginia piedmont. Dolley''s drawing room, the original duplex floor plan, and miles of horse trails.',
    280, 280,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'garden', 'trails']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_monroe'),
    'house',
    'Highland — Working Plantation Near Monticello',
    'Charlottesville, VA',
    'Working farm next door to Monticello. Modest 1799 house with original outbuildings, a vineyard, and walking access to Mr. Jefferson''s place.',
    220, 220,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'garden', 'vineyard']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jackson'),
    'house',
    'The Hermitage — Greek Revival Mansion',
    'Nashville, TN',
    'Greek Revival mansion on 1,120 acres of Tennessee plantation. Iron gates, formal gardens, and the family tomb in the corner of the garden — Rachel''s resting place.',
    260, 260,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'garden', 'stables']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    'house',
    'Lincoln Home — Quiet Springfield Block',
    'Springfield, IL',
    'Quiet Greek Revival house on a tree-lined Springfield block, the only home Lincoln ever owned. Front parlor, back garden, and Mary''s kitchen — the whole family lived here for 17 years.',
    195, 195,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'garden', 'library']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_grant'),
    'house',
    'Grant Cottage — Adirondack Retreat',
    'Wilton, NY',
    'Modest mountainside cottage on Mt. McGregor. The screened porch where the Memoirs were finished. Pine forest, lake views, and the original Grant family furniture intact.',
    175, 175,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'porch', 'lake_access']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_t_roosevelt'),
    'house',
    'Sagamore Hill — Summer White House',
    'Oyster Bay, NY',
    'Queen Anne summer White House on Cove Neck, 23 rooms, North Room with elephant tusks and bison heads. Wraparound porch, orchards, and trails down to the bay.',
    320, 320,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'porch', 'bay_access', 'trails']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_taft'),
    'house',
    'Taft Birthplace — Greek Revival Family House',
    'Cincinnati, OH',
    'Greek Revival family house on Mount Auburn where Taft was born and raised. Restored 1850s parlor, walking distance to downtown Cincinnati, quiet garden in back.',
    200, 200,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'garden', 'library']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_wilson'),
    'house',
    'Woodrow Wilson House — Embassy Row Townhouse',
    'Washington, DC',
    '1915 Georgian Revival townhouse on Embassy Row, the only DC house any president retired to. Library, solarium, original Wilson furnishings, leafy back garden.',
    290, 290,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'library', 'solarium', 'garden']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    'house',
    'Springwood — Hyde Park Estate on the Hudson',
    'Hyde Park, NY',
    'The Roosevelt family estate on a bluff above the Hudson. 35 rooms, Dutch colonial revival, working stables, and the first presidential library — open to guests.',
    340, 340,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'library', 'river_view', 'stables']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_truman'),
    'house',
    'Truman Home — Victorian on North Delaware',
    'Independence, MO',
    'Late-Victorian on North Delaware Street where Harry and Bess lived for 53 years. The original kitchen, Bess''s piano, and the back porch where the morning walk started.',
    165, 165,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'porch', 'garden']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_eisenhower'),
    'house',
    'Eisenhower Farm — Working Cattle Spread',
    'Gettysburg, PA',
    '190-acre cattle farm next to the Gettysburg battlefield, the only home Ike and Mamie ever owned. Field-stone Pennsylvania farmhouse, putting green, and the glassed-in porch where heads of state took coffee.',
    250, 250,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'porch', 'garden', 'putting_green']::text[],
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jfk'),
    'house',
    'Kennedy Birthplace — Brookline Family Home',
    'Brookline, MA',
    'Modest three-story clapboard on Beals Street where JFK was born. Restored to its 1917 appearance by Rose Kennedy herself. Tea on the back porch, leafy Brookline block.',
    280, 280,
    'anyone', 'vouched',
    ARRAY['wifi', 'kitchen', 'fireplace', 'porch', 'garden']::text[],
    true
  );

-- 5. INSERT one cover photo per listing
INSERT INTO listing_photos (listing_id, public_url, is_preview, sort_order)
VALUES
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_president_washington') AND title = 'Mount Vernon — President''s House on the Potomac'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/washington-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_president_j_adams') AND title = 'Peacefield — Old House at the Adams Estate'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/j_adams-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_president_jefferson') AND title = 'Monticello — Mountaintop Estate'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/jefferson-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_president_madison') AND title = 'Montpelier — Federal-Style Plantation House'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/madison-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_president_monroe') AND title = 'Highland — Working Plantation Near Monticello'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/monroe-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_president_jackson') AND title = 'The Hermitage — Greek Revival Mansion'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/jackson-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln') AND title = 'Lincoln Home — Quiet Springfield Block'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/lincoln-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_president_grant') AND title = 'Grant Cottage — Adirondack Retreat'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/grant-home.jpeg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_president_t_roosevelt') AND title = 'Sagamore Hill — Summer White House'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/t_roosevelt-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_president_taft') AND title = 'Taft Birthplace — Greek Revival Family House'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/taft-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_president_wilson') AND title = 'Woodrow Wilson House — Embassy Row Townhouse'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/wilson-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_president_fdr') AND title = 'Springwood — Hyde Park Estate on the Hudson'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/fdr-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_president_truman') AND title = 'Truman Home — Victorian on North Delaware'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/truman-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_president_eisenhower') AND title = 'Eisenhower Farm — Working Cattle Spread'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/eisenhower-home.jpg',
    true,
    0
  ),
(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = 'seed_president_jfk') AND title = 'Kennedy Birthplace — Brookline Family Home'),
    'https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/jfk-home.jpg',
    true,
    0
  );

-- 6a. INSERT president↔president vouches (dense graph, era-themed)
INSERT INTO vouches (voucher_id, vouchee_id, vouch_type, years_known_bucket, reputation_stake_confirmed)
VALUES
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_washington'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_j_adams'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_j_adams'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_washington'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_washington'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jefferson'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jefferson'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_washington'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_j_adams'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jefferson'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jefferson'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_j_adams'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jefferson'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_madison'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_madison'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jefferson'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_madison'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_monroe'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_monroe'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_madison'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jefferson'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_monroe'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_monroe'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jefferson'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_washington'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_madison'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_madison'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_washington'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_grant'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_grant'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_t_roosevelt'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_taft'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_taft'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_t_roosevelt'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_wilson'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_wilson'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_truman'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_truman'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_truman'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_eisenhower'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_eisenhower'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_truman'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_eisenhower'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jfk'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jfk'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_eisenhower'),
    'inner_circle',
    '15plusyr',
    true
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jackson'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jackson'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jackson'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_grant'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_grant'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jackson'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_grant'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_t_roosevelt'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_t_roosevelt'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_grant'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_t_roosevelt'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_wilson'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_wilson'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_t_roosevelt'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_taft'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_wilson'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_wilson'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_taft'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_wilson'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_truman'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_truman'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_wilson'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_eisenhower'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_eisenhower'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jfk'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jfk'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jefferson'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jefferson'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_washington'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_washington'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_t_roosevelt'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_t_roosevelt'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jfk'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jfk'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_truman'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jackson'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jackson'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_truman'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_t_roosevelt'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jackson'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jackson'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_t_roosevelt'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_madison'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_j_adams'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_j_adams'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_madison'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_monroe'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_j_adams'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_j_adams'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_monroe'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_wilson'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jefferson'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jefferson'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_wilson'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jefferson'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jefferson'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_taft'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_taft'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_eisenhower'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_eisenhower'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_eisenhower'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_washington'),
    'standard',
    '15plusyr',
    false
  ),
(
    (SELECT id FROM users WHERE clerk_id = 'seed_president_washington'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_eisenhower'),
    'standard',
    '15plusyr',
    false
  );

-- 6b. Reciprocal Loren ↔ every president (gives Loren full visibility on
--     listings via the 'vouched' rule). If Loren's account is missing, these
--     rows are skipped by the WHERE clause on the SELECT subquery.
INSERT INTO vouches (voucher_id, vouchee_id, vouch_type, years_known_bucket, reputation_stake_confirmed)
SELECT v.voucher_id, v.vouchee_id, v.vouch_type::vouch_type_enum, v.years_known_bucket::years_known_bucket_enum, v.reputation_stake_confirmed
FROM (
  VALUES
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_washington'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_j_adams'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jefferson'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_madison'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_monroe'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jackson'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_grant'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_t_roosevelt'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_taft'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_wilson'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_truman'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_eisenhower'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    (SELECT id FROM users WHERE clerk_id = 'seed_president_jfk'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_washington'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_j_adams'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_jefferson'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_madison'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_monroe'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_jackson'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_lincoln'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_grant'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_t_roosevelt'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_taft'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_wilson'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_fdr'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_truman'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_eisenhower'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false),
    ((SELECT id FROM users WHERE clerk_id = 'seed_president_jfk'),
    (SELECT id FROM users WHERE clerk_id = 'user_3D00SQt8dNOVzlpKeAZ2Ux7KroV'),
    'standard', '4to7yr', false)
) AS v(voucher_id, vouchee_id, vouch_type, years_known_bucket, reputation_stake_confirmed)
WHERE v.voucher_id IS NOT NULL AND v.vouchee_id IS NOT NULL;

-- 7. Sanity check
DO $$
DECLARE
  pres_count int;
  list_count int;
  vouch_count int;
  real_count int;
BEGIN
  SELECT COUNT(*) INTO pres_count FROM users WHERE clerk_id LIKE 'seed_president_%';
  SELECT COUNT(*) INTO list_count FROM listings l JOIN users u ON l.host_id = u.id WHERE u.clerk_id LIKE 'seed_president_%';
  SELECT COUNT(*) INTO vouch_count FROM vouches v
    JOIN users a ON v.voucher_id = a.id
    JOIN users b ON v.vouchee_id = b.id
    WHERE a.clerk_id LIKE 'seed_president_%' OR b.clerk_id LIKE 'seed_president_%';
  SELECT COUNT(*) INTO real_count FROM users WHERE is_test_user = false;
  RAISE NOTICE 'B7 seed complete: presidents=%, listings=%, vouches=% (incl Loren), real_users=% (must equal pre-migration baseline)',
    pres_count, list_count, vouch_count, real_count;
END $$;

COMMIT;
