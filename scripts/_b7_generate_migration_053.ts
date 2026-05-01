/**
 * Migration 053: profile-state variety
 *
 * Adds 6 demo users that exercise three distinct trust-badge states:
 *   - 4+°       : Lafayette + John Marshall (chained to founder cluster)
 *   - no conn   : Chopin + Andersen (vouched only with each other)
 *   - new member: Nightingale + Thoreau (zero vouches, recent created_at)
 *
 * Also backdates the existing demo users' created_at by 30 days so
 * the new-member pair stands out as actually-new in the UI.
 *
 * Reads:  scripts/_b7_variety_results.json
 * Writes: supabase/migrations/053_demo_variety.sql
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Row = {
  key: string; display: string;
  archetype: "far" | "no_conn" | "new_member";
  portraitWikiSlug?: string; portraitSlug?: string; portraitSourceUrl: string; portraitPublicUrl: string;
  homeName: string; homeArea: string;
  homeWikiSlug?: string; homeSlug?: string; homeSourceUrl: string; homePublicUrl: string;
};
const rows: Row[] = JSON.parse(
  readFileSync(join(process.cwd(), "scripts", "_b7_variety_results.json"), "utf8")
);

type User = Row & {
  bio: string;
  phone: string;
  priceMin: number;
  priceMax: number;
  description: string;
  amenities: string[];
};

const COPY: Record<string, Pick<User, "bio" | "priceMin" | "priceMax" | "description" | "amenities">> = {
  lafayette: {
    bio: "French general, friend of Washington, Lincoln-was-too-young-to-meet figure. Hosting from La Grange near Paris. Tricolor optional.",
    priceMin: 280, priceMax: 280,
    description:
      "Medieval moated château remodeled by Lafayette after he returned from the American Revolution. Tower library, walled gardens, and the long allée he planted with Washington seedlings.",
    amenities: ["wifi", "kitchen", "fireplace", "library", "garden", "moat"],
  },
  john_marshall: {
    bio: "4th Chief Justice of the United States. Hosting from Marshall Street in Richmond. Constitutional questions answered after coffee.",
    priceMin: 210, priceMax: 210,
    description:
      "Federal-era brick townhouse Marshall built in 1790. Chief Justice's study, original 18th-century furnishings, and a small kitchen garden out back.",
    amenities: ["wifi", "kitchen", "fireplace", "library", "garden"],
  },
  chopin: {
    bio: "Composer + pianist. Hosting from Żelazowa Wola, the Polish manor where I was born. Practicing piano in the parlor — knock first.",
    priceMin: 175, priceMax: 175,
    description:
      "Whitewashed manor on the Utrata river west of Warsaw. The piano room overlooking the park, willow-lined paths, and summer concerts on the lawn.",
    amenities: ["wifi", "kitchen", "piano", "garden", "river_view"],
  },
  andersen: {
    bio: "Storyteller. Hosting from the yellow cottage in Odense. Tin soldiers and paper-cuttings on the desk. Mind the duck pond.",
    priceMin: 140, priceMax: 140,
    description:
      "Tiny mustard-yellow cottage in the old quarter of Odense, where Andersen was born. Two rooms, a garret, and a courtyard the village children still visit.",
    amenities: ["wifi", "kitchen", "garret_bedroom", "courtyard"],
  },
  nightingale: {
    bio: "Statistician + nursing reformer. Just joined — Embley Park is where I grew up. Quiet evenings preferred. Pie charts on the wall.",
    priceMin: 220, priceMax: 220,
    description:
      "Hampshire country estate where Florence spent her childhood. Long gravel drive, walled rose garden, and a small wing converted into a reading library.",
    amenities: ["wifi", "kitchen", "fireplace", "library", "garden"],
  },
  thoreau: {
    bio: "Naturalist + essayist. New here. Hosting from a one-room cabin replica on the shore of Walden. Bring a notebook. Beans extra.",
    priceMin: 95, priceMax: 95,
    description:
      "Single-room cabin on Walden Pond, faithful replica of the 10x15 ft house Thoreau built himself in 1845. Bed, desk, three chairs (one for solitude, two for friendship). Pond swimming.",
    amenities: ["kitchen", "wood_stove", "pond_swimming", "trails"],
  },
};

const USERS: User[] = rows.map((r, i) => ({
  ...r,
  ...COPY[r.key],
  phone: `+12025550${300 + i}`, // 555-0300..0305
}));

const sqlStr = (s: string) => `'${s.replaceAll("'", "''")}'`;
const sqlArr = (arr: string[]) =>
  `ARRAY[${arr.map((a) => sqlStr(a)).join(", ")}]::text[]`;

function userInsert(u: User): string {
  // No-conn pair gets a non-zero vouch_score so the badge code does NOT
  // treat them as cold-start (they have a real vouch in the graph).
  // New-member pair stays at the default 0, so isColdStart returns true.
  // Far pair just behaves like a normal far-network user.
  const vouchScore = u.archetype === "no_conn" ? "2.5"
                    : u.archetype === "far"      ? "3.8"
                    : "0";
  return `(
    ${sqlStr(`seed_variety_${u.key}`)},
    ${sqlStr(u.display)},
    ${sqlStr(`variety_${u.key}@seed.1db`)},
    ${sqlStr(u.portraitPublicUrl)},
    ${sqlStr(u.bio)},
    ${sqlStr(u.phone)},
    true,
    ${vouchScore}
  )`;
}

function listingInsert(u: User): string {
  return `(
    (SELECT id FROM users WHERE clerk_id = ${sqlStr(`seed_variety_${u.key}`)}),
    'house',
    ${sqlStr(u.homeName)},
    ${sqlStr(u.homeArea)},
    ${sqlStr(u.description)},
    ${u.priceMin}, ${u.priceMax},
    'anyone', 'vouched',
    ${sqlArr(u.amenities)},
    true
  )`;
}

function listingPhotoInsert(u: User): string {
  return `(
    (SELECT id FROM listings
       WHERE host_id = (SELECT id FROM users WHERE clerk_id = ${sqlStr(`seed_variety_${u.key}`)})
         AND title = ${sqlStr(u.homeName)}),
    ${sqlStr(u.homePublicUrl)},
    true,
    0
  )`;
}

// ── Vouches ──────────────────────────────────────────────────────────────

type Vouch = { fromClerk: string; toClerk: string; type: "standard" | "inner_circle" };
const vouches: Vouch[] = [];
function add(a: string, b: string, t: Vouch["type"]) {
  vouches.push({ fromClerk: a, toClerk: b, type: t });
  vouches.push({ fromClerk: b, toClerk: a, type: t });
}

// 4+° pair: chain to founder cluster (Madison/Monroe/J.Adams = 3°)
// Lafayette ↔ John Marshall (mutual inner circle)
add("seed_variety_lafayette", "seed_variety_john_marshall", "inner_circle");
// Lafayette ↔ Madison + Monroe + Washington
add("seed_variety_lafayette", "seed_president_madison", "standard");
add("seed_variety_lafayette", "seed_president_monroe", "standard");
add("seed_variety_lafayette", "seed_president_washington", "standard");
// John Marshall ↔ J. Adams + Madison
add("seed_variety_john_marshall", "seed_president_j_adams", "standard");
add("seed_variety_john_marshall", "seed_president_madison", "standard");
// (Loren's 1° friends are: Lincoln, T.R., E.R., Twain, Einstein, Keller,
//  Churchill, Hemingway. Founders are 2°/3° via Lincoln. Adding hops here
//  pushes Lafayette + Marshall out to 4°.)

// No-conn pair: ONLY mutual with each other
add("seed_variety_chopin", "seed_variety_andersen", "standard");

// New-member pair: ZERO vouches (no add() calls)

function vouchInsert(v: Vouch): string {
  const stake = v.type === "inner_circle" ? "true" : "false";
  return `(
    (SELECT id FROM users WHERE clerk_id = ${sqlStr(v.fromClerk)}),
    (SELECT id FROM users WHERE clerk_id = ${sqlStr(v.toClerk)}),
    ${sqlStr(v.type)}, '15plusyr', ${stake}
  )`;
}

// ── Migration SQL ────────────────────────────────────────────────────────

const migration = `-- ============================================================
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
DELETE FROM users WHERE clerk_id LIKE 'seed\\_variety\\_%' ESCAPE '\\';

-- 1. INSERT the 6 variety users (vouch_score baked in per archetype)
INSERT INTO users (
  clerk_id, name, email, avatar_url, bio, phone_number, is_test_user, vouch_score
)
VALUES
${USERS.map(userInsert).join(",\n")};

-- 2. INSERT one listing per variety user (all preview_visibility='anyone')
INSERT INTO listings (
  host_id, property_type, title, area_name, description,
  price_min, price_max, preview_visibility, full_visibility, amenities, is_active
)
VALUES
${USERS.map(listingInsert).join(",\n")};

-- 3. INSERT cover photo per listing
INSERT INTO listing_photos (listing_id, public_url, is_preview, sort_order)
VALUES
${USERS.map(listingPhotoInsert).join(",\n")};

-- 4. INSERT vouches (4+° chain + no-conn pair only — new-member pair gets nothing)
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
`;

writeFileSync(
  join(process.cwd(), "supabase", "migrations", "053_demo_variety.sql"),
  migration
);
console.log("Wrote supabase/migrations/053_demo_variety.sql");
