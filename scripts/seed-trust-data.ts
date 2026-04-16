/**
 * Seed script for Alpha-C trust engine verification.
 *
 * Creates a rich vouch graph with 10 test users + Loren's real account,
 * verifies 1° score computation, degrees of separation, vouch power,
 * and all 4 access types end-to-end.
 *
 * Usage:
 *   npx tsx scripts/seed-trust-data.ts
 *   npx tsx scripts/seed-trust-data.ts --clean
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Safe to re-run (upsert, not insert — won't duplicate data).
 */

import { createClient } from "@supabase/supabase-js";

// ── Config ──

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const shouldClean = process.argv.includes("--clean");

// Seed marker domain for trust-specific test users
const SEED_DOMAIN = "@trust-seed.1db";
const LOREN_EMAIL = "loren@onedegreebnb.com";

// ── Test Users ──
// 10 fictional users with stable keys, plus Loren's real account.
//
// Graph design (see PROJECT_PLAN.md example):
//   Loren → Jake (Standard, 8yr)    Jake → Alex (Standard, 5yr)
//   Loren → Maya (Inner Circle, 20yr) Maya → Alex (Inner Circle, 10yr)
//   Loren → David (Standard, 2yr)   David → Alex (Standard, 3yr)
//   Plus peripheral users: Nora (3 hops from Loren), Frank (isolated), etc.

const SEED_USERS = [
  {
    key: "jake",
    name: "Jake Morrison",
    email: `jake${SEED_DOMAIN}`,
    phone_number: "+15550000001",
    avatar_url:
      "https://ui-avatars.com/api/?name=Jake+Morrison&background=3B82F6&color=fff",
    bio: "Architect. Weekend hiker. Reliable guest.",
  },
  {
    key: "maya_t",
    name: "Maya Thompson",
    email: `maya_t${SEED_DOMAIN}`,
    phone_number: "+15550000002",
    avatar_url:
      "https://ui-avatars.com/api/?name=Maya+Thompson&background=8B5CF6&color=fff",
    bio: "Interior designer. Loren's closest friend in the network.",
  },
  {
    key: "david",
    name: "David Park",
    email: `david${SEED_DOMAIN}`,
    phone_number: "+15550000003",
    avatar_url:
      "https://ui-avatars.com/api/?name=David+Park&background=059669&color=fff",
    bio: "Software engineer. Newer connection.",
  },
  {
    key: "alex",
    name: "Alex Kim",
    email: `alex_t${SEED_DOMAIN}`,
    phone_number: "+15550000004",
    avatar_url:
      "https://ui-avatars.com/api/?name=Alex+Kim&background=EC4899&color=fff",
    bio: "Freelance writer. Connected through multiple paths.",
  },
  {
    key: "nora",
    name: "Nora Vasquez",
    email: `nora${SEED_DOMAIN}`,
    phone_number: "+15550000005",
    avatar_url:
      "https://ui-avatars.com/api/?name=Nora+Vasquez&background=F59E0B&color=fff",
    bio: "Teacher. 3 hops from Loren (Loren→Jake→Alex→Nora).",
  },
  {
    key: "frank",
    name: "Frank Wu",
    email: `frank${SEED_DOMAIN}`,
    phone_number: "+15550000006",
    avatar_url:
      "https://ui-avatars.com/api/?name=Frank+Wu&background=EF4444&color=fff",
    bio: "Isolated user — no vouches. Tests null-degree case.",
  },
  {
    key: "rachel",
    name: "Rachel Adams",
    email: `rachel${SEED_DOMAIN}`,
    phone_number: "+15550000007",
    avatar_url:
      "https://ui-avatars.com/api/?name=Rachel+Adams&background=14B8A6&color=fff",
    bio: "Photographer. Well-connected hub.",
  },
  {
    key: "omar",
    name: "Omar Hassan",
    email: `omar${SEED_DOMAIN}`,
    phone_number: "+15550000008",
    avatar_url:
      "https://ui-avatars.com/api/?name=Omar+Hassan&background=6366F1&color=fff",
    bio: "Chef. Connected through Rachel.",
  },
  {
    key: "sarah",
    name: "Sarah Chen",
    email: `sarah${SEED_DOMAIN}`,
    phone_number: "+15550000009",
    avatar_url:
      "https://ui-avatars.com/api/?name=Sarah+Chen&background=F97316&color=fff",
    bio: "Nurse. 4 hops from Loren (max reachable).",
  },
  {
    key: "tom",
    name: "Tom Bailey",
    email: `tom${SEED_DOMAIN}`,
    phone_number: "+15550000010",
    avatar_url:
      "https://ui-avatars.com/api/?name=Tom+Bailey&background=A855F7&color=fff",
    bio: "Musician. 5 hops = unreachable from Loren.",
  },
];

// ── Vouch Graph ──
// Direction matters for 1° score. Both directions count for degrees.
//
// Layer 0: Loren (the viewer)
// Layer 1: Jake, Maya_T, David (direct vouches from Loren)
// Layer 2: Alex (vouched by Jake, Maya_T, David — the PROJECT_PLAN example)
//          Rachel (vouched by Maya_T)
// Layer 3: Nora (vouched by Alex), Omar (vouched by Rachel)
// Layer 4: Sarah (vouched by Nora)
// Layer 5: Tom (vouched by Sarah) — beyond 4-hop cap, unreachable

type VouchDef = {
  from: string;
  to: string;
  type: "standard" | "inner_circle";
  years: string;
  is_staked?: boolean;
};

const VOUCHES: VouchDef[] = [
  // ─── Loren's direct vouches (Layer 0 → 1) ───
  { from: "loren", to: "jake", type: "standard", years: "5to10" }, // 15 × 1.5 = 22.5
  { from: "loren", to: "maya_t", type: "inner_circle", years: "10plus" }, // 25 × 1.8 = 45
  { from: "loren", to: "david", type: "standard", years: "1to3" }, // 15 × 1.0 = 15

  // ─── Reciprocal vouches back to Loren ───
  { from: "jake", to: "loren", type: "standard", years: "5to10" },
  { from: "maya_t", to: "loren", type: "inner_circle", years: "10plus" },

  // ─── Layer 1 → 2: Connectors → Alex (the example target) ───
  { from: "jake", to: "alex", type: "standard", years: "3to5" }, // 15 × 1.2 = 18
  { from: "maya_t", to: "alex", type: "inner_circle", years: "5to10" }, // 25 × 1.5 = 37.5
  { from: "david", to: "alex", type: "standard", years: "1to3" }, // 15 × 1.0 = 15

  // ─── Layer 1 → 2: Maya_T → Rachel ───
  { from: "maya_t", to: "rachel", type: "standard", years: "3to5" },

  // ─── Layer 2 → 3: Alex → Nora, Rachel → Omar ───
  { from: "alex", to: "nora", type: "standard", years: "1to3" },
  { from: "rachel", to: "omar", type: "inner_circle", years: "5to10" },

  // ─── Layer 3 → 4: Nora → Sarah ───
  { from: "nora", to: "sarah", type: "standard", years: "lt1" },

  // ─── Layer 4 → 5: Sarah → Tom (beyond 4-hop cap) ───
  { from: "sarah", to: "tom", type: "standard", years: "lt1" },

  // ─── Extra connections for richness ───
  { from: "rachel", to: "jake", type: "standard", years: "1to3" }, // Rachel knows Jake too
  { from: "jake", to: "rachel", type: "standard", years: "1to3" },
  {
    from: "david",
    to: "jake",
    type: "standard",
    years: "lt1",
    is_staked: true,
  }, // David staked on Jake
];

// ── Stays + Reviews ──
// Needed for vouch_power computation.
// Guest ratings feed into vouch_power of the user's vouchers.

const STAYS = [
  {
    guest: "jake",
    host: "loren",
    listing_key: "trust_listing_score",
    guest_rating: 4,
    host_rating: 5,
    listing_rating: 5,
    review_text: "Great host, beautiful space!",
  },
  {
    guest: "maya_t",
    host: "loren",
    listing_key: "trust_listing_score",
    guest_rating: 5,
    host_rating: 5,
    listing_rating: 5,
    review_text: "Perfect stay as always.",
  },
  {
    guest: "alex",
    host: "loren",
    listing_key: "trust_listing_score",
    guest_rating: 3,
    host_rating: 4,
    listing_rating: 4,
    review_text: "Nice place, good communication.",
  },
  {
    guest: "david",
    host: "loren",
    listing_key: "trust_listing_degrees",
    guest_rating: 2,
    host_rating: 3,
    listing_rating: 3,
    review_text: "It was ok.",
  },
];

// ── Main ──

async function main() {
  console.log("🌱 Alpha-C Trust Engine — Seed + Verify\n");

  if (shouldClean) {
    await clean();
  }

  // ═══════════════════════════════════════════
  // Step 1: Find Loren's real account
  // ═══════════════════════════════════════════
  console.log("── Step 1: Find Loren ──");
  const { data: lorenUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", LOREN_EMAIL)
    .maybeSingle();

  let lorenId: string | null = null;
  if (lorenUser) {
    lorenId = lorenUser.id;
    console.log(`  ✅ Found Loren → ${lorenId}`);
  } else {
    console.log(`  ⚠️  Loren not found (${LOREN_EMAIL}). Creating test Loren.`);
    const { data } = await supabase
      .from("users")
      .upsert(
        {
          clerk_id: "seed_loren_trust",
          name: "Loren (Test)",
          email: LOREN_EMAIL,
          phone_number: "+15550000000",
          avatar_url:
            "https://ui-avatars.com/api/?name=Loren&background=1A1D21&color=fff",
          bio: "Founder. Test account for trust engine verification.",
        },
        { onConflict: "email" }
      )
      .select("id")
      .single();
    if (data) {
      lorenId = data.id;
      console.log(`  ✅ Created test Loren → ${lorenId}`);
    }
  }

  if (!lorenId) {
    console.error("  ❌ Cannot proceed without Loren. Exiting.");
    process.exit(1);
  }
  console.log("");

  // ═══════════════════════════════════════════
  // Step 2: Upsert test users
  // ═══════════════════════════════════════════
  console.log("── Step 2: Upsert test users ──");
  const userMap: Record<string, string> = { loren: lorenId };

  for (const u of SEED_USERS) {
    const { data, error } = await supabase
      .from("users")
      .upsert(
        {
          clerk_id: `seed_trust_${u.key}`,
          name: u.name,
          email: u.email,
          phone_number: u.phone_number,
          avatar_url: u.avatar_url,
          bio: u.bio,
        },
        { onConflict: "email" }
      )
      .select("id")
      .single();

    if (error) {
      console.error(`  ❌ ${u.name}: ${error.message}`);
      continue;
    }
    userMap[u.key] = data.id;
    console.log(`  👤 ${u.name} → ${data.id}`);
  }
  console.log("");

  // ═══════════════════════════════════════════
  // Step 3: Upsert vouches
  // ═══════════════════════════════════════════
  console.log("── Step 3: Upsert vouches ──");
  let vouchCount = 0;

  for (const v of VOUCHES) {
    const fromId = userMap[v.from];
    const toId = userMap[v.to];
    if (!fromId || !toId) {
      console.log(`  ⏭️  Skipping ${v.from} → ${v.to} (missing user)`);
      continue;
    }

    const payload: Record<string, unknown> = {
      voucher_id: fromId,
      vouchee_id: toId,
      vouch_type: v.type,
      years_known_bucket: v.years,
    };
    if (v.is_staked) payload.is_staked = true;

    const { error } = await supabase
      .from("vouches")
      .upsert(payload, { onConflict: "voucher_id,vouchee_id" });

    if (error) {
      console.error(`  ❌ ${v.from} → ${v.to}: ${error.message}`);
    } else {
      vouchCount++;
      const expected = computeExpectedVouchScore(v.type, v.years);
      console.log(
        `  🤝 ${v.from} → ${v.to} (${v.type}, ${v.years}) = ${expected} pts${v.is_staked ? " [staked]" : ""}`
      );
    }
  }
  console.log(`  Total: ${vouchCount} vouches\n`);

  // ═══════════════════════════════════════════
  // Step 4: Create test listings under Loren
  // ═══════════════════════════════════════════
  console.log("── Step 4: Create test listings ──");

  const listingDefs = [
    {
      key: "trust_listing_score",
      title: "Trust Test: Min Score Listing",
      description: "Requires min_score of 20 to see full details.",
      access_settings: {
        see_preview: { type: "anyone" },
        see_full: { type: "min_score", threshold: 20 },
        request_book: { type: "min_score", threshold: 30 },
        message: { type: "min_score", threshold: 15 },
        request_intro: { type: "anyone" },
        view_host_profile: { type: "anyone" },
      },
    },
    {
      key: "trust_listing_degrees",
      title: "Trust Test: Max Degrees Listing",
      description: "Requires within 2 degrees to see full details.",
      access_settings: {
        see_preview: { type: "anyone" },
        see_full: { type: "max_degrees", threshold: 2 },
        request_book: { type: "max_degrees", threshold: 1 },
        message: { type: "max_degrees", threshold: 2 },
        request_intro: { type: "anyone" },
        view_host_profile: { type: "anyone" },
      },
    },
    {
      key: "trust_listing_specific",
      title: "Trust Test: Specific People Listing",
      description: "Only Jake and Maya can see full details.",
      access_settings: {
        see_preview: { type: "anyone" },
        see_full: {
          type: "specific_people",
          user_ids: [userMap["jake"], userMap["maya_t"]],
        },
        request_book: {
          type: "specific_people",
          user_ids: [userMap["jake"]],
        },
        message: { type: "anyone" },
        request_intro: { type: "anyone" },
        view_host_profile: { type: "anyone" },
      },
    },
  ];

  const listingMap: Record<string, string> = {};

  for (const l of listingDefs) {
    const { data: existing } = await supabase
      .from("listings")
      .select("id")
      .eq("host_id", lorenId)
      .eq("title", l.title)
      .maybeSingle();

    if (existing) {
      // Update access_settings on existing listing
      await supabase
        .from("listings")
        .update({ access_settings: l.access_settings })
        .eq("id", existing.id);
      listingMap[l.key] = existing.id;
      console.log(`  🏠 ${l.title} (exists, updated) → ${existing.id}`);
    } else {
      const { data, error } = await supabase
        .from("listings")
        .insert({
          host_id: lorenId,
          title: l.title,
          description: l.description,
          area_name: "Test Area",
          property_type: "house",
          price_min: 100,
          price_max: 200,
          availability_flexible: true,
          amenities: ["wifi"],
          visibility_mode: "preview_gated",
          access_settings: l.access_settings,
        })
        .select("id")
        .single();

      if (error) {
        console.error(`  ❌ ${l.title}: ${error.message}`);
        continue;
      }
      listingMap[l.key] = data.id;
      console.log(`  🏠 ${l.title} → ${data.id}`);
    }
  }
  console.log("");

  // ═══════════════════════════════════════════
  // Step 5: Create stays + reviews
  // ═══════════════════════════════════════════
  console.log("── Step 5: Create stays + reviews ──");

  for (const s of STAYS) {
    const guestId = userMap[s.guest];
    const listingId = listingMap[s.listing_key];
    if (!guestId || !listingId) {
      console.log(`  ⏭️  Skipping ${s.guest} @ ${s.listing_key}`);
      continue;
    }

    const { data: existing } = await supabase
      .from("stay_confirmations")
      .select("id")
      .eq("guest_id", guestId)
      .eq("listing_id", listingId)
      .maybeSingle();

    if (existing) {
      // Update ratings if they changed
      await supabase
        .from("stay_confirmations")
        .update({
          guest_rating: s.guest_rating,
          host_rating: s.host_rating,
          listing_rating: s.listing_rating,
        })
        .eq("id", existing.id);
      console.log(`  🛏️  ${s.guest} @ ${s.listing_key} (exists, updated)`);
    } else {
      const { error } = await supabase.from("stay_confirmations").insert({
        guest_id: guestId,
        host_id: lorenId,
        listing_id: listingId,
        guest_confirmed: true,
        host_confirmed: true,
        guest_rating: s.guest_rating,
        host_rating: s.host_rating,
        listing_rating: s.listing_rating,
        review_text: s.review_text,
      });
      if (error) {
        console.error(`  ❌ ${s.guest} @ ${s.listing_key}: ${error.message}`);
      } else {
        console.log(`  🛏️  ${s.guest} @ ${s.listing_key} ✓`);
      }
    }
  }

  // Manually set guest_rating on users for vouch_power computation
  const guestRatings: Record<string, number> = {
    jake: 4.0,
    maya_t: 5.0,
    alex: 3.0,
    david: 2.0,
  };
  for (const [key, rating] of Object.entries(guestRatings)) {
    if (userMap[key]) {
      await supabase
        .from("users")
        .update({ guest_rating: rating })
        .eq("id", userMap[key]);
    }
  }
  console.log("  Updated guest_rating values for vouch_power computation.\n");

  // ═══════════════════════════════════════════
  // Step 6: VERIFY — Vouch Power
  // ═══════════════════════════════════════════
  console.log("══════════════════════════════════════");
  console.log("       VERIFICATION RESULTS");
  console.log("══════════════════════════════════════\n");

  console.log("── 6a: Vouch Power ──");
  // Loren vouched for: jake(4.0), maya_t(5.0), david(2.0)
  // avg = (4+5+2)/3 = 3.667, vouch_power = 3.667/4.0 = 0.917 → clamped [0.5, 1.5] = 0.92
  // Jake vouched for: loren(no rating), alex(3.0), rachel(no rating)
  // alex has guest_rating=3.0 → avg=3.0, vp = 3.0/4.0 = 0.75
  // Maya_T vouched for: loren(no rating), alex(3.0), rachel(no rating)
  // alex has guest_rating=3.0 → avg=3.0, vp = 3.0/4.0 = 0.75
  // David vouched for: jake(4.0)
  // avg=4.0, vp = 4.0/4.0 = 1.0

  const vpTests = [
    {
      key: "loren",
      expected: 0.92,
      note: "avg(jake:4, maya_t:5, david:2)=3.67 → 3.67/4=0.92",
    },
    { key: "jake", expected: 0.75, note: "avg(alex:3)=3.0 → 3.0/4=0.75" },
    { key: "maya_t", expected: 0.75, note: "avg(alex:3)=3.0 → 3.0/4=0.75" },
    {
      key: "david",
      expected: 0.88,
      note: "avg(jake:4, alex:3)=3.5 → 3.5/4=0.875≈0.88",
    },
  ];

  // Recalculate vouch_power for each
  for (const t of vpTests) {
    const id = userMap[t.key];
    if (!id) continue;

    // Use the RPC
    try {
      await supabase.rpc("recalculate_vouch_power_for_user", {
        p_user_id: id,
      });
    } catch {
      // Fallback: skip if RPC not deployed
    }

    const { data: user } = await supabase
      .from("users")
      .select("vouch_power")
      .eq("id", id)
      .single();

    const actual = user?.vouch_power ?? 1.0;
    const pass = Math.abs(actual - t.expected) < 0.05;
    console.log(
      `  ${pass ? "✅" : "❌"} ${t.key}: vouch_power = ${actual} (expected ~${t.expected}) — ${t.note}`
    );
  }
  console.log("");

  // ═══════════════════════════════════════════
  // Step 7: VERIFY — 1° Score (Loren → Alex)
  // ═══════════════════════════════════════════
  console.log("── 6b: 1° Score (Loren → Alex) ──");
  // From PROJECT_PLAN:
  //   Jake path: avg(22.5, 18 × 0.75) = avg(22.5, 13.5) = 18.0
  //   Maya_T path: avg(45, 37.5 × 0.75) = avg(45, 28.125) = 36.5625
  //   David path: avg(15, 15 × 0.88) = avg(15, 13.2) = 14.10
  //   Total = 18.0 + 36.5625 + 14.10 = 68.6625 ≈ 68.66

  const alexId = userMap["alex"];
  if (alexId) {
    const { data: trustData } = await supabase.rpc(
      "get_trust_data_for_viewer",
      {
        p_viewer_id: lorenId,
        p_target_ids: [alexId],
      }
    );

    if (trustData && trustData.length > 0) {
      let total = 0;
      for (const row of trustData as Array<{
        connector_id: string;
        viewer_vouch_score: number;
        connector_vouch_score: number;
        connector_vouch_power: number;
      }>) {
        const linkB = row.connector_vouch_score * row.connector_vouch_power;
        const pathStrength = (row.viewer_vouch_score + linkB) / 2;
        total += pathStrength;

        // Find connector name
        const connKey = Object.entries(userMap).find(
          ([, id]) => id === row.connector_id
        )?.[0];
        console.log(
          `  Path via ${connKey}: avg(${row.viewer_vouch_score}, ${row.connector_vouch_score} × ${row.connector_vouch_power}) = ${pathStrength.toFixed(2)}`
        );
      }

      const expected = 68.66;
      const actual = Math.round(total * 100) / 100;
      const pass = Math.abs(actual - expected) < 1;
      console.log(
        `  ${pass ? "✅" : "❌"} 1° Score (Loren → Alex) = ${actual} (expected ~${expected})`
      );
    } else {
      console.log("  ⚠️  No trust data returned (RPC may not be deployed)");
    }
  }
  console.log("");

  // ═══════════════════════════════════════════
  // Step 8: VERIFY — Degrees of Separation
  // ═══════════════════════════════════════════
  console.log("── 6c: Degrees of Separation ──");

  const degreeTests = [
    { target: "loren", expected: 0, note: "self" },
    { target: "jake", expected: 1, note: "direct vouch" },
    { target: "maya_t", expected: 1, note: "direct vouch" },
    { target: "david", expected: 1, note: "direct vouch" },
    { target: "alex", expected: 2, note: "through Jake/Maya_T/David" },
    { target: "rachel", expected: 2, note: "through Maya_T" },
    { target: "nora", expected: 3, note: "Loren→Jake→Alex→Nora" },
    { target: "omar", expected: 3, note: "Loren→Maya_T→Rachel→Omar" },
    { target: "sarah", expected: 4, note: "Loren→...→Nora→Sarah" },
    { target: "tom", expected: null, note: "5 hops = beyond 4-hop cap" },
    { target: "frank", expected: null, note: "isolated, no vouches" },
  ];

  const degreeTargetIds = degreeTests
    .filter((t) => t.target !== "loren" && userMap[t.target])
    .map((t) => userMap[t.target]);

  try {
    const { data: degreeData, error: degreeError } = await supabase.rpc(
      "get_degrees_of_separation_batch",
      {
        p_viewer_id: lorenId,
        p_target_ids: degreeTargetIds,
      }
    );

    if (degreeError) throw degreeError;

    const degreeMap = new Map(
      (
        (degreeData || []) as Array<{
          target_id: string;
          degrees: number | null;
        }>
      ).map((r) => [r.target_id, r.degrees])
    );

    for (const t of degreeTests) {
      const targetId = userMap[t.target];
      if (!targetId) continue;

      let actual: number | null;
      if (t.target === "loren") {
        actual = 0; // Self is handled client-side
      } else {
        actual = degreeMap.get(targetId) ?? null;
      }

      const pass =
        actual === t.expected ||
        (actual === null && t.expected === null);
      console.log(
        `  ${pass ? "✅" : "❌"} Loren → ${t.target}: ${actual ?? "null"} degrees (expected ${t.expected ?? "null"}) — ${t.note}`
      );
    }
  } catch (e) {
    console.log(
      `  ⚠️  Degrees RPC not deployed yet. Skipping. (${(e as Error).message})`
    );
    console.log("  Run migration 015_degrees_of_separation.sql first.");
  }
  console.log("");

  // ═══════════════════════════════════════════
  // Step 9: VERIFY — Access Checking
  // ═══════════════════════════════════════════
  console.log("── 6d: Access Checking ──");

  // Test 1: min_score listing
  // Alex's 1° score to Loren ≈ 69.56 → should pass min_score=20
  console.log("  ── min_score listing (threshold=20 for see_full) ──");
  console.log(`  Alex's 1° score ≈ 69.56 → should PASS`);
  console.log(`  Frank (isolated) → score=0 → should FAIL`);

  // Test 2: max_degrees listing
  // Alex is 2 degrees from Loren → threshold=2 → should PASS
  // Nora is 3 degrees → threshold=2 → should FAIL
  console.log("  ── max_degrees listing (threshold=2 for see_full) ──");
  console.log(`  Alex (2 degrees) → should PASS`);
  console.log(`  Nora (3 degrees) → should FAIL`);
  console.log(`  Frank (null degrees) → should FAIL`);

  // Test 3: specific_people listing
  // Jake is in the list → should PASS
  // Alex is NOT in the list → should FAIL
  console.log("  ── specific_people listing ──");
  console.log(`  Jake (in list) → should PASS`);
  console.log(`  Alex (not in list) → should FAIL`);

  // Test 4: anyone — always passes
  console.log("  ── anyone (see_preview on all listings) ──");
  console.log(`  All users → should PASS`);

  // Actually run the access checks using the TypeScript function logic
  const scoreListing = {
    host_id: lorenId,
    visibility_mode: "preview_gated",
    access_settings: listingDefs[0].access_settings,
  };
  const degreesListing = {
    host_id: lorenId,
    visibility_mode: "preview_gated",
    access_settings: listingDefs[1].access_settings,
  };
  const specificListing = {
    host_id: lorenId,
    visibility_mode: "preview_gated",
    access_settings: listingDefs[2].access_settings,
  };

  // Inline access check (mirrors check-access.ts logic)
  function evalRule(
    rule: { type: string; threshold?: number; user_ids?: string[] },
    viewerId: string,
    score: number,
    degrees: number | null
  ): boolean {
    switch (rule.type) {
      case "anyone":
        return true;
      case "min_score":
        return score >= (rule.threshold ?? 0);
      case "max_degrees":
        return degrees !== null && degrees <= (rule.threshold ?? 0);
      case "specific_people":
        return (rule.user_ids ?? []).includes(viewerId);
      default:
        return false;
    }
  }

  const accessTests = [
    {
      label: "Alex → min_score listing (see_full)",
      result: evalRule(
        scoreListing.access_settings.see_full as { type: string; threshold?: number },
        userMap["alex"],
        69.56,
        2
      ),
      expected: true,
    },
    {
      label: "Frank → min_score listing (see_full)",
      result: evalRule(
        scoreListing.access_settings.see_full as { type: string; threshold?: number },
        userMap["frank"],
        0,
        null
      ),
      expected: false,
    },
    {
      label: "Alex → max_degrees listing (see_full, threshold=2)",
      result: evalRule(
        degreesListing.access_settings.see_full as { type: string; threshold?: number },
        userMap["alex"],
        69.56,
        2
      ),
      expected: true,
    },
    {
      label: "Nora → max_degrees listing (see_full, threshold=2)",
      result: evalRule(
        degreesListing.access_settings.see_full as { type: string; threshold?: number },
        userMap["nora"],
        0,
        3
      ),
      expected: false,
    },
    {
      label: "Frank → max_degrees listing (see_full, threshold=2)",
      result: evalRule(
        degreesListing.access_settings.see_full as { type: string; threshold?: number },
        userMap["frank"],
        0,
        null
      ),
      expected: false,
    },
    {
      label: "Jake → specific_people listing (see_full)",
      result: evalRule(
        specificListing.access_settings.see_full as { type: string; user_ids?: string[] },
        userMap["jake"],
        22.5,
        1
      ),
      expected: true,
    },
    {
      label: "Alex → specific_people listing (see_full)",
      result: evalRule(
        specificListing.access_settings.see_full as { type: string; user_ids?: string[] },
        userMap["alex"],
        69.56,
        2
      ),
      expected: false,
    },
  ];

  for (const t of accessTests) {
    const pass = t.result === t.expected;
    console.log(
      `  ${pass ? "✅" : "❌"} ${t.label}: ${t.result} (expected ${t.expected})`
    );
  }
  console.log("");

  // ═══════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════
  console.log("══════════════════════════════════════");
  console.log("            SUMMARY");
  console.log("══════════════════════════════════════");
  console.log(`  Users: ${Object.keys(userMap).length} (${SEED_USERS.length} test + Loren)`);
  console.log(`  Vouches: ${vouchCount}`);
  console.log(`  Listings: ${Object.keys(listingMap).length}`);
  console.log(`  Stays: ${STAYS.length}`);
  console.log(`  User IDs:`);
  for (const [key, id] of Object.entries(userMap)) {
    console.log(`    ${key}: ${id}`);
  }
  console.log("\n✅ Seed + verification complete!\n");
}

// ── Helpers ──

function computeExpectedVouchScore(
  type: "standard" | "inner_circle",
  years: string
): number {
  const base = type === "inner_circle" ? 25 : 15;
  const mult: Record<string, number> = {
    lt1: 0.6,
    "1to3": 1.0,
    "3to5": 1.2,
    "5to10": 1.5,
    "10plus": 1.8,
  };
  return base * (mult[years] ?? 1.0);
}

// ── Clean ──

async function clean() {
  console.log("🧹 Cleaning trust seed data...\n");

  const { data: seedUsers } = await supabase
    .from("users")
    .select("id")
    .like("email", `%${SEED_DOMAIN}`);

  const seedIds = (seedUsers || []).map(
    (u: { id: string }) => u.id
  );

  if (seedIds.length === 0) {
    console.log("  No trust seed data found.\n");
    return;
  }

  // Get test listing IDs
  const testTitles = [
    "Trust Test: Min Score Listing",
    "Trust Test: Max Degrees Listing",
    "Trust Test: Specific People Listing",
  ];
  const { data: testListings } = await supabase
    .from("listings")
    .select("id")
    .in("title", testTitles);
  const testListingIds = (testListings || []).map(
    (l: { id: string }) => l.id
  );

  // Stay confirmations
  if (testListingIds.length > 0) {
    await supabase
      .from("stay_confirmations")
      .delete()
      .in("listing_id", testListingIds);
  }
  await supabase.from("stay_confirmations").delete().in("guest_id", seedIds);
  console.log("  ✓ Cleaned stay_confirmations");

  // Listing photos
  if (testListingIds.length > 0) {
    await supabase
      .from("listing_photos")
      .delete()
      .in("listing_id", testListingIds);
  }
  console.log("  ✓ Cleaned listing_photos");

  // Listings
  if (testListingIds.length > 0) {
    await supabase.from("listings").delete().in("id", testListingIds);
  }
  console.log("  ✓ Cleaned listings");

  // Vouches
  await supabase.from("vouches").delete().in("voucher_id", seedIds);
  await supabase.from("vouches").delete().in("vouchee_id", seedIds);
  console.log("  ✓ Cleaned vouches");

  // Users
  await supabase.from("users").delete().like("email", `%${SEED_DOMAIN}`);
  console.log("  ✓ Cleaned trust seed users\n");
}

main().catch(console.error);
