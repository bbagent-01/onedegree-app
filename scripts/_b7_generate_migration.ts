/**
 * Reads scripts/_b7_photo_results.json and writes:
 *   - DEMO_SEED_SOURCES.md          (provenance for every photo)
 *   - supabase/migrations/050_demo_presidents.sql  (the migration)
 *
 * Migration shape (transactional):
 *   1. DELETE all FK rows that block user delete
 *      (contact_requests, stay_confirmations, invites.claimed_by,
 *       pending_vouches.claimed_by, etc — only for `clerk_id LIKE 'seed\_%'`)
 *   2. DELETE FROM users WHERE clerk_id LIKE 'seed\_%'
 *      (cascades vouches, listings, etc.)
 *   3. INSERT 15 president users (deterministic UUIDs via gen_random_uuid())
 *   4. INSERT 15 listings (one per president, their historic home)
 *   5. INSERT 15 listing_photos (one per listing)
 *   6. INSERT vouches (dense graph + reciprocal with Loren)
 */
import { readFileSync, writeFileSync } from "node:fs";
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
  readFileSync(join(process.cwd(), "scripts", "_b7_photo_results.json"), "utf8")
);

// ── User-facing data per president ────────────────────────────────────────

type Pres = PhotoRow & {
  bio: string;
  phone: string;            // 555-01XX so they cannot collide with real signups
  priceMin: number;
  priceMax: number;
  description: string;
  amenities: string[];
};

// E.164 +1 (202) 555-01XX — DC area code + the NANP fictional 555-01XX
// block. Guaranteed never to collide with a real signup.
const PRESIDENTS: Pres[] = photos.map((p, i) => {
  const idx = String(100 + i); // 100..114, three digits → 555-0100..555-0114
  const data: Record<string, Omit<Pres, keyof PhotoRow | "phone">> = {
    washington: {
      bio: "1st president of the United States. Hosting from the Mansion House Farm at Mount Vernon. Quiet retreats, river views, no whiskey provided (any longer).",
      priceMin: 380, priceMax: 380,
      description:
        "The President's House along the Potomac. Eight bedrooms, original 18th-century Palladian sash, working farm grounds. Sunrise on the piazza is the whole reason to come.",
      amenities: ["wifi", "kitchen", "fireplace", "garden", "river_view"],
    },
    j_adams: {
      bio: "2nd president of the United States. Hosting from Peacefield in Quincy. Bring books. The library has more than the country had at founding.",
      priceMin: 240, priceMax: 240,
      description:
        "The Old House at Peacefield. Federal-style with a stone library wing added by JQA. Long shaded lawn, herb garden, and a quiet study where four generations of Adamses worked.",
      amenities: ["wifi", "kitchen", "library", "garden", "fireplace"],
    },
    jefferson: {
      bio: "3rd president. Hosting from Monticello. Architecture nerds welcome. Strong opinions about wine, weather instruments, and dome construction.",
      priceMin: 360, priceMax: 360,
      description:
        "Mountaintop neoclassical home that took 40 years to build. Dome room, long galleries, terraced vegetable garden with a Palladian view of the Blue Ridge.",
      amenities: ["wifi", "kitchen", "garden", "library", "mountain_view"],
    },
    madison: {
      bio: "4th president. Hosting from Montpelier in Orange. Library quiet hours strictly observed. Constitution drafts available on request.",
      priceMin: 280, priceMax: 280,
      description:
        "Federal-style plantation house on 2,650 acres of rolling Virginia piedmont. Dolley's drawing room, the original duplex floor plan, and miles of horse trails.",
      amenities: ["wifi", "kitchen", "fireplace", "garden", "trails"],
    },
    monroe: {
      bio: "5th president. Hosting from Highland near Charlottesville. Era of Good Feelings, etc. Borders friendly. Doctrine flexible.",
      priceMin: 220, priceMax: 220,
      description:
        "Working farm next door to Monticello. Modest 1799 house with original outbuildings, a vineyard, and walking access to Mr. Jefferson's place.",
      amenities: ["wifi", "kitchen", "fireplace", "garden", "vineyard"],
    },
    jackson: {
      bio: "7th president. Hosting from The Hermitage outside Nashville. Strong-willed. Strong coffee. Don't bring a national bank.",
      priceMin: 260, priceMax: 260,
      description:
        "Greek Revival mansion on 1,120 acres of Tennessee plantation. Iron gates, formal gardens, and the family tomb in the corner of the garden — Rachel's resting place.",
      amenities: ["wifi", "kitchen", "fireplace", "garden", "stables"],
    },
    lincoln: {
      bio: "16th president of the United States. Hosting from Springfield, IL. Tall ceilings (and tall host). Honest pricing only.",
      priceMin: 195, priceMax: 195,
      description:
        "Quiet Greek Revival house on a tree-lined Springfield block, the only home Lincoln ever owned. Front parlor, back garden, and Mary's kitchen — the whole family lived here for 17 years.",
      amenities: ["wifi", "kitchen", "fireplace", "garden", "library"],
    },
    grant: {
      bio: "18th president of the United States. Hosting from a small Adirondack cottage near Saratoga. Cigars not provided. Memoirs in the bedside drawer.",
      priceMin: 175, priceMax: 175,
      description:
        "Modest mountainside cottage on Mt. McGregor. The screened porch where the Memoirs were finished. Pine forest, lake views, and the original Grant family furniture intact.",
      amenities: ["wifi", "kitchen", "fireplace", "porch", "lake_access"],
    },
    t_roosevelt: {
      bio: "26th president of the United States. Hosting from Sagamore Hill on Long Island. Bring boots. Bully welcome. Hot baths after long hikes.",
      priceMin: 320, priceMax: 320,
      description:
        "Queen Anne summer White House on Cove Neck, 23 rooms, North Room with elephant tusks and bison heads. Wraparound porch, orchards, and trails down to the bay.",
      amenities: ["wifi", "kitchen", "fireplace", "porch", "bay_access", "trails"],
    },
    taft: {
      bio: "27th president, then Chief Justice. Hosting from the family home in Cincinnati. Civil discourse expected. Robes provided.",
      priceMin: 200, priceMax: 200,
      description:
        "Greek Revival family house on Mount Auburn where Taft was born and raised. Restored 1850s parlor, walking distance to downtown Cincinnati, quiet garden in back.",
      amenities: ["wifi", "kitchen", "fireplace", "garden", "library"],
    },
    wilson: {
      bio: "28th president of the United States. Hosting from a Georgian Revival on S Street in DC. Embassy Row neighbors. League of Nations brochures in the foyer.",
      priceMin: 290, priceMax: 290,
      description:
        "1915 Georgian Revival townhouse on Embassy Row, the only DC house any president retired to. Library, solarium, original Wilson furnishings, leafy back garden.",
      amenities: ["wifi", "kitchen", "library", "solarium", "garden"],
    },
    fdr: {
      bio: "32nd president of the United States. Hosting from Springwood at Hyde Park on the Hudson. Fireside chats welcome. Naval prints in every room.",
      priceMin: 340, priceMax: 340,
      description:
        "The Roosevelt family estate on a bluff above the Hudson. 35 rooms, Dutch colonial revival, working stables, and the first presidential library — open to guests.",
      amenities: ["wifi", "kitchen", "fireplace", "library", "river_view", "stables"],
    },
    truman: {
      bio: "33rd president of the United States. Hosting from the Wallace house in Independence, MO. The buck stops on the porch. Bourbon optional.",
      priceMin: 165, priceMax: 165,
      description:
        "Late-Victorian on North Delaware Street where Harry and Bess lived for 53 years. The original kitchen, Bess's piano, and the back porch where the morning walk started.",
      amenities: ["wifi", "kitchen", "fireplace", "porch", "garden"],
    },
    eisenhower: {
      bio: "34th president of the United States. Hosting from the working farm at Gettysburg. Bring binoculars for the battlefield. Skeet on weekends.",
      priceMin: 250, priceMax: 250,
      description:
        "190-acre cattle farm next to the Gettysburg battlefield, the only home Ike and Mamie ever owned. Field-stone Pennsylvania farmhouse, putting green, and the glassed-in porch where heads of state took coffee.",
      amenities: ["wifi", "kitchen", "fireplace", "porch", "garden", "putting_green"],
    },
    jfk: {
      bio: "35th president of the United States. Hosting from the family birthplace in Brookline. Sailing recommendations in the entryway. Touch football out back.",
      priceMin: 280, priceMax: 280,
      description:
        "Modest three-story clapboard on Beals Street where JFK was born. Restored to its 1917 appearance by Rose Kennedy herself. Tea on the back porch, leafy Brookline block.",
      amenities: ["wifi", "kitchen", "fireplace", "porch", "garden"],
    },
  };
  return {
    ...p,
    ...data[p.key],
    phone: `+12025550${idx}`, // +1 202 555 0XXX, e.g. +12025550100
  };
});

// ── SQL generation ───────────────────────────────────────────────────────

const sqlStr = (s: string) => `'${s.replaceAll("'", "''")}'`;
const sqlArrText = (arr: string[]) =>
  `ARRAY[${arr.map((a) => sqlStr(a)).join(", ")}]::text[]`;

function userInsert(p: Pres): string {
  return `(
    ${sqlStr(`seed_president_${p.key}`)},
    ${sqlStr(p.display)},
    ${sqlStr(`president_${p.key}@seed.1db`)},
    ${sqlStr(p.portraitPublicUrl)},
    ${sqlStr(p.bio)},
    ${sqlStr(p.phone)},
    true
  )`;
}

function listingInsert(p: Pres): string {
  return `(
    (SELECT id FROM users WHERE clerk_id = ${sqlStr(`seed_president_${p.key}`)}),
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

function listingPhotoInsert(p: Pres): string {
  return `(
    (SELECT id FROM listings WHERE host_id = (SELECT id FROM users WHERE clerk_id = ${sqlStr(`seed_president_${p.key}`)}) AND title = ${sqlStr(p.homeName)}),
    ${sqlStr(p.homePublicUrl)},
    true,
    0
  )`;
}

// ── Vouch graph ──────────────────────────────────────────────────────────
// Design: dense, era-themed, plus reciprocal Loren↔every president.
// Asymmetric pairs are fine; bidirectional pairs render as "trusted".

type Vouch = { from: string; to: string; type: "standard" | "inner_circle"; stake?: boolean };

const presKeys = PRESIDENTS.map((p) => p.key);

// Era clusters — inner_circle (close peers) + standard (era-mates)
const ERA_INNER_CIRCLE: [string, string][] = [
  // Founding Fathers
  ["washington", "j_adams"],
  ["washington", "jefferson"],
  ["j_adams", "jefferson"],
  ["jefferson", "madison"],
  ["madison", "monroe"],
  ["jefferson", "monroe"],
  ["washington", "madison"],
  // Civil War / 19th c.
  ["lincoln", "grant"],
  // 20th-c. clusters
  ["t_roosevelt", "taft"],
  ["wilson", "fdr"],
  ["fdr", "truman"],
  ["truman", "eisenhower"],
  ["eisenhower", "jfk"],
];

const ERA_STANDARD: [string, string][] = [
  ["jackson", "lincoln"],
  ["jackson", "grant"],
  ["grant", "t_roosevelt"],
  ["t_roosevelt", "wilson"],
  ["taft", "wilson"],
  ["wilson", "truman"],
  ["fdr", "eisenhower"],
  ["fdr", "jfk"],
  // Cross-era admiration
  ["jefferson", "lincoln"],
  ["lincoln", "fdr"],
  ["washington", "lincoln"],
  ["t_roosevelt", "lincoln"],
  ["jfk", "lincoln"],
  ["jfk", "fdr"],
  ["truman", "jackson"],
  ["t_roosevelt", "jackson"],
  ["madison", "j_adams"],
  ["monroe", "j_adams"],
  ["wilson", "jefferson"],
  ["fdr", "jefferson"],
  ["taft", "lincoln"],
  ["eisenhower", "lincoln"],
  ["eisenhower", "washington"],
];

const presVouches: Vouch[] = [];
for (const [a, b] of ERA_INNER_CIRCLE) {
  presVouches.push({ from: a, to: b, type: "inner_circle", stake: true });
  presVouches.push({ from: b, to: a, type: "inner_circle", stake: true });
}
for (const [a, b] of ERA_STANDARD) {
  presVouches.push({ from: a, to: b, type: "standard" });
  // make most reciprocal too — populated feel
  presVouches.push({ from: b, to: a, type: "standard" });
}

// Reciprocal Loren ↔ every president (standard, gives Loren visibility on
// listings since `full_visibility = 'vouched'` requires either party).
const lorenClerk = "user_3D00SQt8dNOVzlpKeAZ2Ux7KroV";

function vouchInsert(v: Vouch): string {
  return `(
    (SELECT id FROM users WHERE clerk_id = ${sqlStr(`seed_president_${v.from}`)}),
    (SELECT id FROM users WHERE clerk_id = ${sqlStr(`seed_president_${v.to}`)}),
    ${sqlStr(v.type)},
    '15plusyr',
    ${v.stake ? "true" : "false"}
  )`;
}

function lorenVouchOut(presKey: string): string {
  return `(
    (SELECT id FROM users WHERE clerk_id = ${sqlStr(lorenClerk)}),
    (SELECT id FROM users WHERE clerk_id = ${sqlStr(`seed_president_${presKey}`)}),
    'standard', '4to7yr', false
  )`;
}

function lorenVouchIn(presKey: string): string {
  return `(
    (SELECT id FROM users WHERE clerk_id = ${sqlStr(`seed_president_${presKey}`)}),
    (SELECT id FROM users WHERE clerk_id = ${sqlStr(lorenClerk)}),
    'standard', '4to7yr', false
  )`;
}

// Dedup pres↔pres vouches in case ERA_STANDARD includes a reverse already
// covered by INNER_CIRCLE
const seen = new Set<string>();
const presVouchesUnique = presVouches.filter((v) => {
  const k = `${v.from}->${v.to}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

const lorenVouchesOut = presKeys.map(lorenVouchOut);
const lorenVouchesIn = presKeys.map(lorenVouchIn);

// ── Assemble migration SQL ───────────────────────────────────────────────

const migration = `-- ============================================================
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
  SELECT ARRAY(SELECT id FROM users WHERE clerk_id LIKE 'seed\\_%' ESCAPE '\\')
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
DELETE FROM users WHERE clerk_id LIKE 'seed\\_%' ESCAPE '\\';

-- 3. INSERT the 15 presidents
INSERT INTO users (clerk_id, name, email, avatar_url, bio, phone_number, is_test_user)
VALUES
${PRESIDENTS.map(userInsert).join(",\n")};

-- 4. INSERT one listing per president (their historic home)
INSERT INTO listings (
  host_id, property_type, title, area_name, description,
  price_min, price_max, preview_visibility, full_visibility, amenities, is_active
)
VALUES
${PRESIDENTS.map(listingInsert).join(",\n")};

-- 5. INSERT one cover photo per listing
INSERT INTO listing_photos (listing_id, public_url, is_preview, sort_order)
VALUES
${PRESIDENTS.map(listingPhotoInsert).join(",\n")};

-- 6a. INSERT president↔president vouches (dense graph, era-themed)
INSERT INTO vouches (voucher_id, vouchee_id, vouch_type, years_known_bucket, reputation_stake_confirmed)
VALUES
${presVouchesUnique.map(vouchInsert).join(",\n")};

-- 6b. Reciprocal Loren ↔ every president (gives Loren full visibility on
--     listings via the 'vouched' rule). If Loren's account is missing, these
--     rows are skipped by the WHERE clause on the SELECT subquery.
INSERT INTO vouches (voucher_id, vouchee_id, vouch_type, years_known_bucket, reputation_stake_confirmed)
SELECT v.voucher_id, v.vouchee_id, v.vouch_type::vouch_type_enum, v.years_known_bucket::years_known_bucket_enum, v.reputation_stake_confirmed
FROM (
  VALUES
${[...lorenVouchesOut, ...lorenVouchesIn].map((v) => `    ${v.replace(/^\(\s*/, "(").replace(/\s*\)$/, ")")}`).join(",\n")}
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
`;

writeFileSync(
  join(process.cwd(), "supabase", "migrations", "050_demo_presidents.sql"),
  migration
);
console.log("Wrote supabase/migrations/050_demo_presidents.sql");

// ── SOURCES.md ───────────────────────────────────────────────────────────

const sources = `# DEMO_SEED_SOURCES.md — B7 photo provenance

All photos sourced from **Wikimedia Commons** via the Wikipedia REST summary
endpoint, then mirrored to Supabase storage. Each linked Commons file page
documents author, date, and license; the categories listed here are the
operative ones for our purposes.

## License posture

Every president's portrait is one of:
- A pre-1929 painting (US public domain — copyright expired)
- A US federal-government photograph (public domain — 17 U.S.C. § 105)
- A pre-1929 photograph (US public domain)

Every historic-home photograph is either a US federal photograph (NPS, HABS)
or a contributor-released CC-BY / CC-BY-SA / public-domain image on Wikimedia
Commons. None are scraped from paywalled or commercial sources.

## Per-president sources

${photos
  .map(
    (p) => `### ${p.display}
- **Portrait** — \`${p.portraitPublicUrl}\`
  - Wikipedia article: https://en.wikipedia.org/wiki/${p.portraitWikiSlug}
  - Source file: ${p.portraitSourceUrl}
  - License basis: pre-1929 portrait or US federal-government photograph (PD)
- **Historic home** — \`${p.homePublicUrl}\`
  - Wikipedia article: https://en.wikipedia.org/wiki/${p.homeWikiSlug}
  - Source file: ${p.homeSourceUrl}
  - License basis: NPS / HABS federal photo OR Wikimedia contributor PD/CC release`
  )
  .join("\n\n")}

## Storage paths

- \`profile-photos/presidents/<key>.<ext>\` — public bucket created in B7
- \`listing-photos/presidents/<key>-home.<ext>\` — existing public bucket

## Replay

If we ever need to re-fetch and re-upload, run:

\`\`\`bash
npx tsx --env-file=.env.local scripts/_b7_fetch_photos.ts
\`\`\`

The script is idempotent (uploads use \`upsert: true\`), and
\`scripts/_b7_photo_results.json\` is the single source of truth for the
URLs used in migration 050.
`;

writeFileSync(join(process.cwd(), "DEMO_SEED_SOURCES.md"), sources);
console.log("Wrote DEMO_SEED_SOURCES.md");
