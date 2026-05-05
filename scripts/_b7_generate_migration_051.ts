/**
 * Migration 051: clean up cruft test users + add 15 famous people +
 * their listings + a denser vouching graph that covers presidents,
 * famous people, and Loren reciprocally.
 *
 * Cruft to remove: every test user that is NOT Loren and NOT a
 * president (i.e. Brightbase Agent + the 7 spawned_imp_* accounts).
 *
 * Reads:  scripts/_b7_famous_results.json
 * Writes: supabase/migrations/051_demo_famous_and_cleanup.sql
 *         appends to DEMO_SEED_SOURCES.md
 */
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";

type PhotoRow = {
  key: string;
  display: string;
  portraitWikiSlug: string;
  portraitSourceUrl: string;
  portraitPublicUrl: string;
  homeName: string;
  homeArea: string;
  homeWikiSlug: string;
  homeSourceUrl: string;
  homePublicUrl: string;
};

const photos: PhotoRow[] = JSON.parse(
  readFileSync(join(process.cwd(), "scripts", "_b7_famous_results.json"), "utf8")
);

// ── User-facing data per famous person ───────────────────────────────────

type Famous = PhotoRow & {
  bio: string;
  phone: string;
  priceMin: number;
  priceMax: number;
  description: string;
  amenities: string[];
};

const FAMOUS: Famous[] = photos.map((p, i) => {
  const idx = String(200 + i); // 200..214 → +1 202 555 0200..0214
  const data: Record<string, Omit<Famous, keyof PhotoRow | "phone">> = {
    einstein: {
      bio: "Theoretical physicist. Hosting from the Mercer Street house in Princeton. Pipe smoke unavoidable. Long thinking walks recommended.",
      priceMin: 230, priceMax: 230,
      description:
        "Modest two-story clapboard at 112 Mercer Street, Einstein's home from 1935 until 1955. Wood-paneled study with the chalkboard, leafy front porch, walking distance to the Institute for Advanced Study.",
      amenities: ["wifi", "kitchen", "fireplace", "garden", "library"],
    },
    twain: {
      bio: "Author, riverboat pilot, opinion-haver. Hosting from the Hartford house. Writing room on the third floor. Cigars on the porch.",
      priceMin: 270, priceMax: 270,
      description:
        "High-Victorian Gothic on Farmington Avenue, designed by Edward Tuckerman Potter. Painted brick, sweeping conservatory, the billiard-room study where Tom Sawyer and Huck Finn were written.",
      amenities: ["wifi", "kitchen", "fireplace", "billiards", "library", "porch"],
    },
    curie: {
      bio: "Physicist + chemist, two Nobel Prizes (Physics 1903, Chemistry 1911). Hosting from the birthplace townhouse on Freta Street. Lead-lined storage for any souvenirs.",
      priceMin: 180, priceMax: 180,
      description:
        "18th-century townhouse in Warsaw's Old Town, where Maria Skłodowska was born. Restored period rooms, a small museum below, and a quiet courtyard garden.",
      amenities: ["wifi", "kitchen", "library", "museum", "courtyard"],
    },
    hemingway: {
      bio: "Novelist, fisherman, war correspondent. Hosting from Whitehead Street in Key West. Six-toed cats roam freely. Daiquiris at sunset.",
      priceMin: 290, priceMax: 290,
      description:
        "1851 Spanish Colonial on Whitehead Street, two stories of coral rock with wraparound verandas. Saltwater pool, gardens of palms and bougainvillea, the writing studio above the carriage house.",
      amenities: ["wifi", "kitchen", "pool", "garden", "porch", "library"],
    },
    van_gogh: {
      bio: "Post-Impressionist painter. Hosting from the room above the Auberge in Auvers — last home, briefly. Easels provided. Mustard-yellow walls.",
      priceMin: 160, priceMax: 160,
      description:
        "Tiny attic room at the Auberge Ravoux, where van Gogh lodged for the final 70 days of his life. Sloped ceiling, single window, the village square below. The auberge restaurant downstairs is still open.",
      amenities: ["wifi", "shared_kitchen", "garden", "village_square_view"],
    },
    earhart: {
      bio: "Aviator + record-breaker. Hosting from the Atchison birthplace on the bluff above the Missouri. Long views west. Goggles in the entryway.",
      priceMin: 175, priceMax: 175,
      description:
        "Gothic Revival cottage on a Missouri River bluff where Amelia spent her early childhood. Wraparound veranda, original family furnishings, sweeping views of the river.",
      amenities: ["wifi", "kitchen", "fireplace", "porch", "river_view"],
    },
    keller: {
      bio: "Author, lecturer, activist. Hosting from Ivy Green, the Tuscumbia farmstead. The water pump in the yard is the original. Quiet preferred.",
      priceMin: 170, priceMax: 170,
      description:
        "1820 white-clapboard family home on a 640-acre Alabama farmstead. The famous water pump still stands. Cook's cottage, magnolias, and a working herb garden.",
      amenities: ["wifi", "kitchen", "garden", "porch", "fireplace"],
    },
    e_roosevelt: {
      bio: "Diplomat, activist, longest-serving First Lady. Hosting from Val-Kill in Hyde Park. My own place, finally. Tea on the porch.",
      priceMin: 230, priceMax: 230,
      description:
        "Stone-and-stucco fieldstone cottage on Fall Kill creek — Eleanor's only fully owned home. Reading porch, swimming pond, and the rolling Hyde Park countryside.",
      amenities: ["wifi", "kitchen", "fireplace", "porch", "pond_swimming"],
    },
    churchill: {
      bio: "Prime Minister, painter, brick-layer. Hosting from Chartwell in the Weald of Kent. Cigars provided. Painting studio open to guests.",
      priceMin: 350, priceMax: 350,
      description:
        "Country house above the Weald with 80 acres of gardens, lakes, and walled vegetable plots. The painting studio in the orchard. Chartwell Mary's blue dining room.",
      amenities: ["wifi", "kitchen", "fireplace", "garden", "lake", "studio"],
    },
    poe: {
      bio: "Writer of strange tales. Hosting from the small brick row house on Amity Street. Ravens at dusk. Drafts in the desk drawer.",
      priceMin: 145, priceMax: 145,
      description:
        "Tiny 1830s brick row house in Baltimore where Poe lived in the 1830s. Three small rooms, narrow staircase, and a back garret bedroom under the eaves.",
      amenities: ["wifi", "kitchen", "fireplace", "garret_bedroom"],
    },
    potter: {
      bio: "Author, illustrator, conservationist. Hosting from Hill Top in the Lake District. Sheep welcome on the lower fields. Tea in the parlor.",
      priceMin: 210, priceMax: 210,
      description:
        "17th-century Lake District farmhouse on 34 acres of fells and gardens. The slate-roofed kitchen, oak settles, and the cottage garden of Peter Rabbit fame.",
      amenities: ["wifi", "kitchen", "fireplace", "garden", "fells_walking"],
    },
    darwin: {
      bio: "Naturalist, geologist, biologist. Hosting from Down House in Kent. Long walks on the sandwalk. Pigeons in the dovecote.",
      priceMin: 260, priceMax: 260,
      description:
        "Georgian country house in Downe village with 18 acres of meadow, gardens, and the famous Sandwalk where Darwin paced out his thinking. The study still holds his notebooks.",
      amenities: ["wifi", "kitchen", "fireplace", "garden", "trails", "library"],
    },
    whitman: {
      bio: "Poet, printer, government clerk. Hosting from the Mickle Street row house in Camden. Verses in every drawer. Loud singing tolerated.",
      priceMin: 140, priceMax: 140,
      description:
        "Two-story wood frame on Mickle Street, the only house Walt ever owned. Small parlor, the upstairs bedroom-study, and the back garden where he kept his caged birds.",
      amenities: ["wifi", "kitchen", "fireplace", "garden"],
    },
    fitzgerald: {
      bio: "Novelist of the Jazz Age. Hosting from the Summit Avenue brownstone in Saint Paul. Gin discreetly stocked. Wear something nice.",
      priceMin: 195, priceMax: 195,
      description:
        "1889 Romanesque brownstone row house on Summit Avenue, where Fitzgerald wrote and revised 'This Side of Paradise.' Stained glass, dark woodwork, and a small reading parlor.",
      amenities: ["wifi", "kitchen", "fireplace", "library"],
    },
    anthony: {
      bio: "Suffragist + reformer. Hosting from the Madison Street brick house in Rochester. Speeches available on request. No vouching for anyone who won't extend the franchise.",
      priceMin: 160, priceMax: 160,
      description:
        "Two-story brick Italianate where Anthony was arrested in 1872 for voting. The front parlor, the desk, and the upstairs bedroom where she died. Quiet residential block.",
      amenities: ["wifi", "kitchen", "fireplace", "library", "garden"],
    },
  };
  return {
    ...p,
    ...data[p.key],
    phone: `+12025550${idx}`,
  };
});

// ── SQL helpers ──────────────────────────────────────────────────────────

const sqlStr = (s: string) => `'${s.replaceAll("'", "''")}'`;
const sqlArrText = (arr: string[]) =>
  `ARRAY[${arr.map((a) => sqlStr(a)).join(", ")}]::text[]`;

function userInsert(p: Famous): string {
  return `(
    ${sqlStr(`seed_famous_${p.key}`)},
    ${sqlStr(p.display)},
    ${sqlStr(`famous_${p.key}@seed.1db`)},
    ${sqlStr(p.portraitPublicUrl)},
    ${sqlStr(p.bio)},
    ${sqlStr(p.phone)},
    true
  )`;
}

function listingInsert(p: Famous): string {
  return `(
    (SELECT id FROM users WHERE clerk_id = ${sqlStr(`seed_famous_${p.key}`)}),
    'house',
    ${sqlStr(p.homeName)},
    ${sqlStr(p.homeArea)},
    ${sqlStr(p.description)},
    ${p.priceMin}, ${p.priceMax},
    'anyone', 'vouched',
    ${sqlArrText(p.amenities)},
    true
  )`;
}

function listingPhotoInsert(p: Famous): string {
  return `(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = ${sqlStr(`seed_famous_${p.key}`)}) AND title = ${sqlStr(p.homeName)}),
    ${sqlStr(p.homePublicUrl)},
    true,
    0
  )`;
}

// ── Vouching graph ───────────────────────────────────────────────────────

const FAMOUS_KEYS = FAMOUS.map((f) => f.key);
const PRES_KEYS = [
  "washington","j_adams","jefferson","madison","monroe","jackson","lincoln",
  "grant","t_roosevelt","taft","wilson","fdr","truman","eisenhower","jfk",
];

type Vouch = { fromClerk: string; toClerk: string; type: "standard" | "inner_circle" };

const vouches: Vouch[] = [];
const seen = new Set<string>();
function add(a: string, b: string, t: Vouch["type"]) {
  if (a === b) return;
  const k = `${a}->${b}`;
  if (seen.has(k)) return;
  seen.add(k);
  vouches.push({ fromClerk: a, toClerk: b, type: t });
}

// Famous ↔ Famous: era / discipline clusters as inner_circle, plus a sweep
// of standard vouches across the whole set so the graph feels populated.
const FAMOUS_INNER: [string, string][] = [
  // Scientific Revolution & 19th-c. science
  ["darwin", "einstein"],
  ["curie", "einstein"],
  ["darwin", "curie"],
  // Lost Generation writers
  ["hemingway", "fitzgerald"],
  ["twain", "whitman"],
  ["twain", "fitzgerald"],
  // Suffrage / civil rights
  ["anthony", "keller"],
  ["anthony", "e_roosevelt"],
  ["keller", "e_roosevelt"],
  // British literary / pastoral
  ["potter", "darwin"],
  // Painters
  // (van_gogh has no immediate inner circle — keep him eccentric)
  // Diplomatic / wartime
  ["churchill", "e_roosevelt"],
];
for (const [a, b] of FAMOUS_INNER) {
  add(`seed_famous_${a}`, `seed_famous_${b}`, "inner_circle");
  add(`seed_famous_${b}`, `seed_famous_${a}`, "inner_circle");
}

// Sweep: every famous person vouches for ~5 others (standard)
const PARTNERS: Record<string, string[]> = {
  einstein:    ["curie", "darwin", "twain", "churchill", "e_roosevelt"],
  twain:       ["fitzgerald", "whitman", "hemingway", "einstein", "keller"],
  curie:       ["einstein", "darwin", "anthony", "keller", "potter"],
  hemingway:   ["fitzgerald", "twain", "churchill", "van_gogh", "poe"],
  van_gogh:    ["potter", "twain", "hemingway", "whitman", "poe"],
  earhart:     ["e_roosevelt", "anthony", "keller", "churchill", "twain"],
  keller:      ["anthony", "e_roosevelt", "twain", "earhart", "darwin"],
  e_roosevelt: ["anthony", "keller", "churchill", "earhart", "einstein"],
  churchill:   ["einstein", "e_roosevelt", "hemingway", "twain", "fitzgerald"],
  poe:         ["whitman", "twain", "hemingway", "van_gogh", "potter"],
  potter:      ["darwin", "van_gogh", "twain", "anthony", "keller"],
  darwin:      ["einstein", "curie", "potter", "twain", "whitman"],
  whitman:     ["twain", "poe", "fitzgerald", "darwin", "van_gogh"],
  fitzgerald:  ["hemingway", "twain", "whitman", "churchill", "poe"],
  anthony:     ["keller", "e_roosevelt", "earhart", "curie", "twain"],
};
for (const [a, partners] of Object.entries(PARTNERS)) {
  for (const b of partners) {
    add(`seed_famous_${a}`, `seed_famous_${b}`, "standard");
    add(`seed_famous_${b}`, `seed_famous_${a}`, "standard");
  }
}

// Famous ↔ Presidents: thematic cross-vouches
const FAMOUS_PRES: [string, string][] = [
  // Eleanor obviously vouches with FDR + Truman + Wilson
  ["e_roosevelt", "fdr"],
  ["e_roosevelt", "truman"],
  ["e_roosevelt", "wilson"],
  ["e_roosevelt", "lincoln"],
  // Einstein corresponded with FDR
  ["einstein", "fdr"],
  ["einstein", "wilson"],
  ["einstein", "lincoln"],
  // Twain knew Grant (wrote his memoirs)
  ["twain", "grant"],
  ["twain", "lincoln"],
  ["twain", "t_roosevelt"],
  // Churchill ↔ FDR + Truman + Eisenhower
  ["churchill", "fdr"],
  ["churchill", "truman"],
  ["churchill", "eisenhower"],
  ["churchill", "jfk"],
  // Anthony / Keller in the political sphere
  ["anthony", "lincoln"],
  ["anthony", "grant"],
  ["keller", "wilson"],
  ["keller", "fdr"],
  // Hemingway, Fitzgerald in JFK era
  ["hemingway", "jfk"],
  ["hemingway", "fdr"],
  ["fitzgerald", "fdr"],
  ["fitzgerald", "wilson"],
  // Darwin, Curie ↔ Wilson / Roosevelt era
  ["darwin", "lincoln"],
  ["curie", "wilson"],
  // Potter, Whitman, Van Gogh ↔ Lincoln era
  ["whitman", "lincoln"],
  ["whitman", "grant"],
  ["van_gogh", "t_roosevelt"],
  ["potter", "t_roosevelt"],
  // Earhart ↔ Hoover/FDR era
  ["earhart", "fdr"],
  ["earhart", "t_roosevelt"],
  ["earhart", "truman"],
  // Poe ↔ early 19th c.
  ["poe", "jackson"],
  ["poe", "j_adams"],
];
for (const [f, p] of FAMOUS_PRES) {
  add(`seed_famous_${f}`, `seed_president_${p}`, "standard");
  add(`seed_president_${p}`, `seed_famous_${f}`, "standard");
}

// Loren ↔ every famous person (and vice versa)
const lorenClerk = "user_3D00SQt8dNOVzlpKeAZ2Ux7KroV";
for (const k of FAMOUS_KEYS) {
  add(lorenClerk, `seed_famous_${k}`, "standard");
  add(`seed_famous_${k}`, lorenClerk, "standard");
}

function vouchInsert(v: Vouch): string {
  // years_known: '15plusyr' for famous↔famous & famous↔presidents
  // (they're all "long-time" in the demo fiction); '4to7yr' for
  // anything involving Loren.
  const years = (v.fromClerk === lorenClerk || v.toClerk === lorenClerk)
    ? "'4to7yr'"
    : "'15plusyr'";
  const stake = v.type === "inner_circle" ? "true" : "false";
  return `(
    (SELECT id FROM users WHERE clerk_id = ${sqlStr(v.fromClerk)}),
    (SELECT id FROM users WHERE clerk_id = ${sqlStr(v.toClerk)}),
    ${sqlStr(v.type)}, ${years}, ${stake}
  )`;
}

// ── Migration SQL ────────────────────────────────────────────────────────

const migration = `-- ============================================================
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
-- by his stable Clerk ID (the only \`is_test_user=true\` admin we
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
DELETE FROM users WHERE clerk_id LIKE 'seed\\_famous\\_%' ESCAPE '\\';

-- 3. INSERT the 15 famous people
INSERT INTO users (clerk_id, name, email, avatar_url, bio, phone_number, is_test_user)
VALUES
${FAMOUS.map(userInsert).join(",\n")};

-- 4. INSERT one listing per famous person
INSERT INTO listings (
  host_id, property_type, title, area_name, description,
  price_min, price_max, preview_visibility, full_visibility, amenities, is_active
)
VALUES
${FAMOUS.map(listingInsert).join(",\n")};

-- 5. INSERT cover photo per listing
INSERT INTO listing_photos (listing_id, public_url, is_preview, sort_order)
VALUES
${FAMOUS.map(listingPhotoInsert).join(",\n")};

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
${vouches.map((v) => `    ${vouchInsert(v).replace(/^\(\s*/, "(").replace(/\s*\)$/, ")")}`).join(",\n")}
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
`;

writeFileSync(
  join(process.cwd(), "supabase", "migrations", "051_demo_famous_and_cleanup.sql"),
  migration
);
console.log("Wrote supabase/migrations/051_demo_famous_and_cleanup.sql");

// ── Append to SOURCES.md ─────────────────────────────────────────────────

const sources = `

# DEMO_SEED_SOURCES.md (B7-051 expansion)

15 additional famous historical figures, all died pre-1980 (broad
public-domain coverage). Same sourcing model as the presidents:
Wikipedia REST summary endpoint → Wikimedia Commons original file →
mirrored to Supabase storage.

${photos
  .map(
    (p) => `### ${p.display}
- **Portrait** — \`${p.portraitPublicUrl}\`
  - Wikipedia article: https://en.wikipedia.org/wiki/${p.portraitWikiSlug}
  - Source file: ${p.portraitSourceUrl}
- **Historic home** — \`${p.homePublicUrl}\`
  - Wikipedia article: https://en.wikipedia.org/wiki/${p.homeWikiSlug}
  - Source file: ${p.homeSourceUrl}`
  )
  .join("\n\n")}
`;

appendFileSync(join(process.cwd(), "DEMO_SEED_SOURCES.md"), sources);
console.log("Appended famous-people block to DEMO_SEED_SOURCES.md");
