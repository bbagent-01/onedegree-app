/**
 * Seed script for Trustead
 *
 * Usage:
 *   npx tsx scripts/seed.ts --loren-email loren@example.com
 *   npx tsx scripts/seed.ts --clean --loren-email loren@example.com
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
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

// Parse CLI flags
const args = process.argv.slice(2);
const shouldClean = args.includes("--clean");
const lorenEmailIdx = args.indexOf("--loren-email");
const lorenEmail =
  lorenEmailIdx !== -1 && args[lorenEmailIdx + 1]
    ? args[lorenEmailIdx + 1]
    : null;

// Seed marker — all seed users have emails ending with @seed.1db
const SEED_DOMAIN = "@seed.1db";

// ── Fictional Users ──

const SEED_USERS = [
  {
    key: "maya",
    name: "Maya Chen",
    email: "maya@seed.1db",
    avatar_url: "https://ui-avatars.com/api/?name=Maya+Chen&background=8B5CF6&color=fff",
    bio: "Travel enthusiast. Always looking for unique spaces.",
  },
  {
    key: "james",
    name: "James Rivera",
    email: "james@seed.1db",
    avatar_url: "https://ui-avatars.com/api/?name=James+Rivera&background=059669&color=fff",
    bio: "Freelance photographer. Love exploring new neighborhoods.",
  },
  {
    key: "priya",
    name: "Priya Nair",
    email: "priya@seed.1db",
    avatar_url: "https://ui-avatars.com/api/?name=Priya+Nair&background=F59E0B&color=fff",
    bio: "Product designer. Weekend traveler.",
  },
  {
    key: "sam",
    name: "Sam Okafor",
    email: "sam@seed.1db",
    avatar_url: "https://ui-avatars.com/api/?name=Sam+Okafor&background=EF4444&color=fff",
    bio: null,
  },
  {
    key: "dana",
    name: "Dana Kowalski",
    email: "dana@seed.1db",
    avatar_url: "https://ui-avatars.com/api/?name=Dana+Kowalski&background=6366F1&color=fff",
    bio: "New here! Excited to join the community.",
  },
  {
    key: "alex",
    name: "Alex Torres",
    email: "alex@seed.1db",
    avatar_url: "https://ui-avatars.com/api/?name=Alex+Torres&background=EC4899&color=fff",
    bio: null,
  },
  {
    key: "chloe",
    name: "Chloe Martens",
    email: "chloe@seed.1db",
    avatar_url: "https://ui-avatars.com/api/?name=Chloe+Martens&background=14B8A6&color=fff",
    bio: "Host in Park Slope. Interior design is my passion.",
  },
  {
    key: "ben",
    name: "Ben Shapira",
    email: "ben@seed.1db",
    avatar_url: "https://ui-avatars.com/api/?name=Ben+Shapira&background=F97316&color=fff",
    bio: "West Village local. Part-time host, full-time foodie.",
  },
];

// ── Main ──

async function main() {
  console.log("🌱 Trustead — Seed Script\n");

  if (shouldClean) {
    await clean();
  }

  // Step 1: Find or skip Loren
  let lorenId: string | null = null;
  if (lorenEmail) {
    const { data: lorenUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", lorenEmail)
      .single();

    if (lorenUser) {
      lorenId = lorenUser.id;
      console.log(`✅ Found Loren (${lorenEmail}) → ${lorenId}`);
    } else {
      console.log(
        `⚠️  Loren not found by email "${lorenEmail}". Continuing without Loren.`
      );
    }
  } else {
    console.log("ℹ️  No --loren-email provided. Loren excluded from seed.\n");
  }

  // Step 2: Upsert fictional users
  const userMap: Record<string, string> = {};
  if (lorenId) userMap["loren"] = lorenId;

  for (const u of SEED_USERS) {
    const { data, error } = await supabase
      .from("users")
      .upsert(
        {
          clerk_id: `seed_${u.key}`,
          name: u.name,
          email: u.email,
          avatar_url: u.avatar_url,
          bio: u.bio,
        },
        { onConflict: "email" }
      )
      .select("id")
      .single();

    if (error) {
      console.error(`  ❌ Failed to upsert ${u.name}: ${error.message}`);
      continue;
    }
    userMap[u.key] = data.id;
    console.log(`  👤 ${u.name} → ${data.id}`);
  }

  console.log("");

  // Step 3: Create vouches
  const vouches: {
    from: string;
    to: string;
    type: "standard" | "inner_circle";
    years: string;
  }[] = [];

  if (lorenId) {
    vouches.push(
      {
        from: "loren",
        to: "maya",
        type: "inner_circle",
        years: "8to15yr",
      },
      {
        from: "loren",
        to: "james",
        type: "inner_circle",
        years: "4to7yr",
      },
      { from: "loren", to: "priya", type: "standard", years: "1to3yr" },
      { from: "loren", to: "dana", type: "standard", years: "lt1yr" },
      // Reciprocal vouches so Loren can see full listings (passes "vouched" visibility)
      { from: "maya", to: "loren", type: "inner_circle", years: "8to15yr" },
      { from: "james", to: "loren", type: "inner_circle", years: "4to7yr" }
    );
  }

  vouches.push(
    { from: "maya", to: "sam", type: "standard", years: "4to7yr" },
    { from: "maya", to: "priya", type: "standard", years: "1to3yr" },
    { from: "james", to: "priya", type: "inner_circle", years: "8to15yr" },
    { from: "priya", to: "sam", type: "standard", years: "1to3yr" },
    { from: "ben", to: "dana", type: "standard", years: "lt1yr" }
  );

  for (const v of vouches) {
    if (!userMap[v.from] || !userMap[v.to]) continue;
    const { error } = await supabase.from("vouches").upsert(
      {
        voucher_id: userMap[v.from],
        vouchee_id: userMap[v.to],
        vouch_type: v.type,
        years_known_bucket: v.years,
        reputation_stake_confirmed: true,
      },
      { onConflict: "voucher_id,vouchee_id" }
    );
    if (error) {
      console.error(
        `  ❌ Vouch ${v.from} → ${v.to}: ${error.message}`
      );
    } else {
      console.log(
        `  🤝 ${v.from} → ${v.to} (${v.type}, ${v.years})`
      );
    }
  }

  console.log("");

  // Step 4: Create listings
  const listings = [
    {
      key: "parkslope",
      host: "chloe",
      title: "Sunny Park Slope Apartment",
      area_name: "Park Slope, Brooklyn",
      property_type: "apartment",
      description:
        "Beautiful 2BR apartment in the heart of Park Slope. Steps from Prospect Park. Natural light all day. Fully equipped kitchen.",
      price_min: 150,
      price_max: 200,
      availability_flexible: true,
      amenities: ["wifi", "kitchen", "washer_dryer", "ac"],
      house_rules: "No smoking. Quiet hours after 10pm. No parties.",
      preview_visibility: "anyone",
      full_visibility: "vouched",
      min_trust_score: 0,
    },
    {
      key: "westvillage",
      host: "ben",
      title: "Cozy West Village Studio",
      area_name: "West Village, Manhattan",
      property_type: "apartment",
      description:
        "Charming studio on a tree-lined West Village street. Walking distance to great restaurants and the Hudson River Park.",
      price_min: 200,
      price_max: 250,
      availability_start: "2026-05-01",
      availability_end: "2026-09-30",
      amenities: ["wifi", "ac", "kitchen"],
      house_rules: "No pets. No smoking.",
      preview_visibility: "vouched",
      full_visibility: "trusted",
      min_trust_score: 20,
    },
    {
      key: "hudsonvalley",
      host: lorenId ? "loren" : "maya",
      title: "Hudson Valley Retreat",
      area_name: "Cold Spring, Hudson Valley",
      property_type: "house",
      description:
        "Spacious 3BR house on 2 acres. Perfect for a weekend getaway. Hot tub, fire pit, hiking trails nearby.",
      price_min: 275,
      price_max: 325,
      availability_flexible: true,
      amenities: ["wifi", "kitchen", "parking", "hot_tub", "backyard"],
      house_rules: "Respect the neighbors. Clean up after yourself.",
      preview_visibility: "anyone",
      full_visibility: "vouched",
      min_trust_score: 0,
    },
    {
      key: "williamsburg",
      host: "maya",
      title: "Bright Williamsburg Room",
      area_name: "Williamsburg, Brooklyn",
      property_type: "room",
      description:
        "Private room in a shared 3BR loft. Amazing rooftop views. Steps from the L train.",
      price_min: 100,
      price_max: 140,
      availability_flexible: true,
      amenities: ["wifi", "kitchen", "washer_dryer"],
      house_rules: "Shared space — be considerate. No overnight guests.",
      preview_visibility: "anyone",
      full_visibility: "vouched",
      min_trust_score: 0,
    },
    {
      key: "uws",
      host: "james",
      title: "Upper West Side Classic",
      area_name: "Upper West Side, Manhattan",
      property_type: "apartment",
      description:
        "Pre-war 1BR with original details. Central Park in 5 minutes. Perfect for a peaceful NYC visit.",
      price_min: 180,
      price_max: 220,
      availability_start: "2026-06-01",
      availability_end: "2026-12-31",
      amenities: ["wifi", "ac", "kitchen", "gym"],
      house_rules: "Doorman building — follow building rules.",
      preview_visibility: "inner_circle",
      full_visibility: "inner_circle",
      min_trust_score: 0,
    },
  ];

  const listingMap: Record<string, string> = {};

  for (const l of listings) {
    const hostId = userMap[l.host];
    if (!hostId) {
      console.log(`  ⏭️  Skipping ${l.title} (host "${l.host}" not found)`);
      continue;
    }

    // Check if listing already exists
    const { data: existing } = await supabase
      .from("listings")
      .select("id")
      .eq("host_id", hostId)
      .eq("title", l.title)
      .maybeSingle();

    let listingId: string;
    if (existing) {
      listingId = existing.id;
      console.log(`  🏠 ${l.title} (exists) → ${listingId}`);
    } else {
      const { data, error } = await supabase
        .from("listings")
        .insert({
          host_id: hostId,
          title: l.title,
          area_name: l.area_name,
          property_type: l.property_type,
          description: l.description,
          price_min: l.price_min,
          price_max: l.price_max,
          availability_start: l.availability_start ?? null,
          availability_end: l.availability_end ?? null,
          availability_flexible: l.availability_flexible ?? false,
          amenities: l.amenities,
          house_rules: l.house_rules ?? null,
          preview_visibility: l.preview_visibility,
          full_visibility: l.full_visibility,
          min_trust_score: l.min_trust_score,
        })
        .select("id")
        .single();

      if (error) {
        console.error(`  ❌ Listing ${l.title}: ${error.message}`);
        continue;
      }
      listingId = data.id;
      console.log(`  🏠 ${l.title} → ${listingId}`);
    }

    listingMap[l.key] = listingId;

    // Add photos (use Unsplash source URLs)
    const photoQuery = l.property_type === "house" ? "house,cottage" : "apartment,interior";
    const photos = [
      {
        public_url: `https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop`,
        is_preview: true,
        sort_order: 0,
      },
      {
        public_url: `https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop`,
        is_preview: false,
        sort_order: 1,
      },
    ];

    // Only insert if no photos exist yet
    const { count: photoCount } = await supabase
      .from("listing_photos")
      .select("*", { count: "exact", head: true })
      .eq("listing_id", listingId);

    if ((photoCount ?? 0) === 0) {
      for (const p of photos) {
        await supabase.from("listing_photos").insert({
          listing_id: listingId,
          public_url: p.public_url,
          is_preview: p.is_preview,
          sort_order: p.sort_order,
        });
      }
      console.log(`    📸 Added ${photos.length} photos`);
    }
  }

  console.log("");

  // Step 5: Create stay confirmations with reviews
  const stays = [
    {
      guest: "maya",
      listing: "parkslope",
      host: "chloe",
      guest_rating: 5,
      host_rating: 5,
      listing_rating: 5,
      review_text: "Incredible space! Chloe was the perfect host.",
    },
    {
      guest: "priya",
      listing: "parkslope",
      host: "chloe",
      guest_rating: 4,
      host_rating: 4,
      listing_rating: 4,
      review_text: "Great apartment, well located. Would stay again.",
    },
    {
      guest: "sam",
      listing: "westvillage",
      host: "ben",
      guest_rating: 4,
      host_rating: 4,
      listing_rating: 4,
      review_text: "Lovely studio. Ben was responsive and helpful.",
    },
  ];

  for (const s of stays) {
    const guestId = userMap[s.guest];
    const hostId = userMap[s.host];
    const listingId = listingMap[s.listing];
    if (!guestId || !hostId || !listingId) {
      console.log(
        `  ⏭️  Skipping stay ${s.guest} @ ${s.listing} (missing IDs)`
      );
      continue;
    }

    // Check if stay exists
    const { data: existing } = await supabase
      .from("stay_confirmations")
      .select("id")
      .eq("guest_id", guestId)
      .eq("listing_id", listingId)
      .maybeSingle();

    if (existing) {
      console.log(
        `  🛏️  Stay ${s.guest} @ ${s.listing} (exists)`
      );
      continue;
    }

    const { error } = await supabase.from("stay_confirmations").insert({
      guest_id: guestId,
      host_id: hostId,
      listing_id: listingId,
      guest_confirmed: true,
      host_confirmed: true,
      guest_rating: s.guest_rating,
      host_rating: s.host_rating,
      listing_rating: s.listing_rating,
      review_text: s.review_text,
    });

    if (error) {
      console.error(`  ❌ Stay ${s.guest} @ ${s.listing}: ${error.message}`);
    } else {
      console.log(`  🛏️  ${s.guest} @ ${s.listing} ✓`);
    }
  }

  console.log("");

  // Step 6: Update guest ratings
  console.log("Updating ratings...");

  // Maya: 1 stay, guest_rating 5
  if (userMap["maya"]) {
    await supabase
      .from("users")
      .update({ guest_rating: 5.0, guest_review_count: 1 })
      .eq("id", userMap["maya"]);
    console.log("  👤 Maya: guest_rating=5.0, count=1");
  }

  // Priya: 1 stay, guest_rating 4
  if (userMap["priya"]) {
    await supabase
      .from("users")
      .update({ guest_rating: 4.0, guest_review_count: 1 })
      .eq("id", userMap["priya"]);
    console.log("  👤 Priya: guest_rating=4.0, count=1");
  }

  // Sam: 1 stay, guest_rating 4
  if (userMap["sam"]) {
    await supabase
      .from("users")
      .update({ guest_rating: 4.0, guest_review_count: 1 })
      .eq("id", userMap["sam"]);
    console.log("  👤 Sam: guest_rating=4.0, count=1");
  }

  // Chloe: 2 stays as host, avg host_rating = (5+4)/2 = 4.5
  if (userMap["chloe"]) {
    await supabase
      .from("users")
      .update({ host_rating: 4.5, host_review_count: 2 })
      .eq("id", userMap["chloe"]);
    console.log("  👤 Chloe: host_rating=4.5, count=2");
  }

  // Ben: 1 stay as host, host_rating = 4
  if (userMap["ben"]) {
    await supabase
      .from("users")
      .update({ host_rating: 4.0, host_review_count: 1 })
      .eq("id", userMap["ben"]);
    console.log("  👤 Ben: host_rating=4.0, count=1");
  }

  console.log("");

  // Step 7: Recalculate vouch_power for all vouchers
  console.log("Recalculating vouch_power...");

  // All users who have given vouches
  const vouchers = new Set(vouches.map((v) => v.from));
  for (const key of vouchers) {
    const id = userMap[key];
    if (!id) continue;
    const { data } = await supabase.rpc("calculate_vouch_power", {
      p_user_id: id,
    });
    console.log(`  ��� ${key}: vouch_power = ${data}`);
  }

  console.log("\n✅ Seed complete!");

  // Summary
  console.log("\n── Summary ──");
  console.log(`Users: ${Object.keys(userMap).length}`);
  console.log(`Vouches: ${vouches.filter((v) => userMap[v.from] && userMap[v.to]).length}`);
  console.log(`Listings: ${Object.keys(listingMap).length}`);
  console.log(`Stays: ${stays.length}`);
}

async function clean() {
  console.log("🧹 Cleaning seed data...\n");

  // Get all seed user IDs
  const { data: seedUsers } = await supabase
    .from("users")
    .select("id")
    .like("email", `%${SEED_DOMAIN}`);

  const seedIds = (seedUsers || []).map((u) => u.id);

  if (seedIds.length === 0) {
    console.log("  No seed data found.\n");
    return;
  }

  // Delete in order: stay_confirmations, listing_photos, listings, vouches, users
  // (respecting FK constraints)

  // Stay confirmations involving seed users
  await supabase
    .from("stay_confirmations")
    .delete()
    .in("guest_id", seedIds);
  await supabase
    .from("stay_confirmations")
    .delete()
    .in("host_id", seedIds);
  console.log("  ✓ Cleaned stay_confirmations");

  // Contact requests
  await supabase.from("contact_requests").delete().in("guest_id", seedIds);

  // Listing photos for seed user listings
  const { data: seedListings } = await supabase
    .from("listings")
    .select("id")
    .in("host_id", seedIds);
  const seedListingIds = (seedListings || []).map((l) => l.id);
  if (seedListingIds.length > 0) {
    await supabase
      .from("listing_photos")
      .delete()
      .in("listing_id", seedListingIds);
  }
  console.log("  ✓ Cleaned listing_photos");

  // Listings
  await supabase.from("listings").delete().in("host_id", seedIds);
  console.log("  ✓ Cleaned listings");

  // Vouches involving seed users (as voucher OR vouchee)
  await supabase.from("vouches").delete().in("voucher_id", seedIds);
  await supabase.from("vouches").delete().in("vouchee_id", seedIds);
  console.log("  ✓ Cleaned vouches");

  // Users
  await supabase.from("users").delete().like("email", `%${SEED_DOMAIN}`);
  console.log("  ✓ Cleaned seed users\n");
}

main().catch(console.error);
