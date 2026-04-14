/**
 * Seeds 30 varied listings for Track B filter + map testing.
 *
 * Usage:
 *   npx tsx scripts/seed-b3c-listings.ts
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Idempotent — checks by title before inserting.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Unsplash photo URLs that are stable and public (8 per category).
const PHOTO_POOLS = {
  apartment: [
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&h=800&fit=crop",
  ],
  house: [
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1449844908441-8829872d2607?w=1200&h=800&fit=crop",
  ],
  room: [
    "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1200&h=800&fit=crop",
  ],
  other: [
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1521782462922-9318be1cfaa4?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1464146072230-91cabc968266?w=1200&h=800&fit=crop",
  ],
};

const LISTINGS: Array<{
  title: string;
  area_name: string;
  property_type: "apartment" | "house" | "room" | "other";
  description: string;
  price_min: number;
  price_max: number;
  amenities: string[];
  house_rules?: string;
}> = [
  // — Budget ($40–90) —
  {
    title: "Cozy Studio Nook in Bushwick",
    area_name: "Bushwick, Brooklyn",
    property_type: "apartment",
    description: "Tiny but thoughtfully laid out. Great light, good Wi-Fi, close to the L.",
    price_min: 55,
    price_max: 70,
    amenities: ["Wifi", "Kitchen", "Heating", "Workspace"],
  },
  {
    title: "Spare Room Near Greenpoint",
    area_name: "Greenpoint, Brooklyn",
    property_type: "room",
    description: "Private bedroom in a shared 2BR loft. Quiet block, friendly roommates.",
    price_min: 45,
    price_max: 60,
    amenities: ["Wifi", "Kitchen", "Heating"],
  },
  {
    title: "Artist Loft Corner",
    area_name: "Bedford-Stuyvesant, Brooklyn",
    property_type: "room",
    description: "Private corner of a huge loft. Hosts are working artists.",
    price_min: 60,
    price_max: 75,
    amenities: ["Wifi", "Kitchen", "Workspace", "Iron"],
  },
  {
    title: "Budget-Friendly Harlem Stay",
    area_name: "Harlem, Manhattan",
    property_type: "apartment",
    description: "Simple 1BR near the subway. Clean, bright, and affordable.",
    price_min: 75,
    price_max: 90,
    amenities: ["Wifi", "Heating", "Kitchen", "Air conditioning"],
  },

  // — Mid ($100–180) —
  {
    title: "Bright Williamsburg Walkup",
    area_name: "Williamsburg, Brooklyn",
    property_type: "apartment",
    description: "Top-floor walkup with exposed brick and tons of light.",
    price_min: 125,
    price_max: 160,
    amenities: ["Wifi", "Kitchen", "Washer", "Air conditioning", "Workspace"],
  },
  {
    title: "East Village One Bedroom",
    area_name: "East Village, Manhattan",
    property_type: "apartment",
    description: "Classic NYC 1BR surrounded by restaurants and bars.",
    price_min: 155,
    price_max: 185,
    amenities: ["Wifi", "Kitchen", "Air conditioning", "TV", "Iron"],
  },
  {
    title: "DUMBO Waterfront Studio",
    area_name: "DUMBO, Brooklyn",
    property_type: "apartment",
    description: "Studio with direct views of the Brooklyn Bridge.",
    price_min: 170,
    price_max: 200,
    amenities: ["Wifi", "Kitchen", "Air conditioning", "TV", "Gym"],
  },
  {
    title: "Silver Lake Bungalow Hideaway",
    area_name: "Silver Lake, Los Angeles",
    property_type: "house",
    description: "Detached bungalow with a tiny garden and outdoor shower.",
    price_min: 140,
    price_max: 180,
    amenities: ["Wifi", "Kitchen", "Washer", "Free parking", "BBQ grill"],
  },
  {
    title: "Venice Beach Surfer Studio",
    area_name: "Venice, Los Angeles",
    property_type: "apartment",
    description: "Steps from the sand. Board storage included.",
    price_min: 150,
    price_max: 180,
    amenities: ["Wifi", "Kitchen", "Air conditioning", "Free parking"],
  },
  {
    title: "Mission District Flat",
    area_name: "Mission, San Francisco",
    property_type: "apartment",
    description: "Sunny 1BR above a bakery. The smell of fresh bread every morning.",
    price_min: 165,
    price_max: 195,
    amenities: ["Wifi", "Kitchen", "Heating", "Workspace", "Washer"],
  },

  // — Upper Mid ($200–320) —
  {
    title: "Park Slope Garden Duplex",
    area_name: "Park Slope, Brooklyn",
    property_type: "apartment",
    description: "Duplex with private garden. Two full bedrooms, two baths.",
    price_min: 220,
    price_max: 280,
    amenities: ["Wifi", "Kitchen", "Washer", "Dryer", "Air conditioning", "BBQ grill"],
  },
  {
    title: "SoHo Design Loft",
    area_name: "SoHo, Manhattan",
    property_type: "apartment",
    description: "Designer-owned loft. Cast-iron building, huge windows.",
    price_min: 260,
    price_max: 310,
    amenities: ["Wifi", "Kitchen", "Air conditioning", "TV", "Workspace", "Gym"],
  },
  {
    title: "Chelsea Sky Apartment",
    area_name: "Chelsea, Manhattan",
    property_type: "apartment",
    description: "High-floor 2BR with terrace and Empire State view.",
    price_min: 275,
    price_max: 325,
    amenities: ["Wifi", "Kitchen", "Washer", "Air conditioning", "TV", "Gym"],
  },
  {
    title: "Austin Hill Country Cottage",
    area_name: "Austin",
    property_type: "house",
    description: "Quiet 2BR cottage 15 minutes from downtown. Star-gazing deck.",
    price_min: 200,
    price_max: 250,
    amenities: ["Wifi", "Kitchen", "Free parking", "Washer", "BBQ grill", "Fireplace"],
  },
  {
    title: "Miami Art Deco One Bedroom",
    area_name: "Miami",
    property_type: "apartment",
    description: "Classic art deco building blocks from the beach.",
    price_min: 210,
    price_max: 260,
    amenities: ["Wifi", "Kitchen", "Air conditioning", "Pool", "TV"],
  },
  {
    title: "Chicago Loop Condo",
    area_name: "Chicago",
    property_type: "apartment",
    description: "Modern condo in the heart of the Loop. River views.",
    price_min: 190,
    price_max: 240,
    amenities: ["Wifi", "Kitchen", "Washer", "Gym", "Air conditioning", "TV"],
  },

  // — Upper ($330–550) —
  {
    title: "Upper East Side Townhouse Floor",
    area_name: "Upper East Side, Manhattan",
    property_type: "apartment",
    description: "Entire floor of a classic townhouse. Fireplace and library.",
    price_min: 380,
    price_max: 450,
    amenities: ["Wifi", "Kitchen", "Washer", "Fireplace", "Air conditioning", "Iron", "Hair dryer"],
  },
  {
    title: "Brooklyn Heights Brownstone",
    area_name: "Brooklyn",
    property_type: "house",
    description: "Entire brownstone. Backyard, rooftop, three bedrooms.",
    price_min: 420,
    price_max: 520,
    amenities: ["Wifi", "Kitchen", "Washer", "Dryer", "BBQ grill", "Workspace", "Free parking"],
  },
  {
    title: "West Village Carriage House",
    area_name: "West Village, Manhattan",
    property_type: "house",
    description: "Rare private carriage house on a cobblestone street.",
    price_min: 500,
    price_max: 600,
    amenities: ["Wifi", "Kitchen", "Washer", "Fireplace", "Air conditioning", "TV", "Workspace"],
  },
  {
    title: "LA Hillside Modern",
    area_name: "Los Angeles",
    property_type: "house",
    description: "Contemporary 3BR with infinity pool and city views.",
    price_min: 475,
    price_max: 575,
    amenities: ["Wifi", "Kitchen", "Pool", "Hot tub", "Free parking", "BBQ grill", "TV", "Gym"],
  },

  // — Premium ($600–1200) —
  {
    title: "Upper West Side Penthouse",
    area_name: "Upper West Side, Manhattan",
    property_type: "apartment",
    description: "Full-floor penthouse with 360° views and private elevator.",
    price_min: 850,
    price_max: 1000,
    amenities: ["Wifi", "Kitchen", "Washer", "Dryer", "Gym", "Hot tub", "TV", "Air conditioning"],
  },
  {
    title: "Hudson Valley Estate",
    area_name: "Cold Spring, Hudson Valley",
    property_type: "house",
    description: "5BR estate on 8 acres. Sauna, pool, and pond.",
    price_min: 750,
    price_max: 900,
    amenities: ["Wifi", "Kitchen", "Washer", "Dryer", "Pool", "Hot tub", "Fireplace", "BBQ grill", "Free parking"],
  },
  {
    title: "Miami Beachfront Villa",
    area_name: "Miami",
    property_type: "house",
    description: "Private beach access, 4BR, outdoor kitchen.",
    price_min: 900,
    price_max: 1100,
    amenities: ["Wifi", "Kitchen", "Pool", "Hot tub", "Air conditioning", "BBQ grill", "TV", "Gym", "Free parking"],
  },
  {
    title: "San Francisco Victorian",
    area_name: "San Francisco",
    property_type: "house",
    description: "Restored Victorian with all the original woodwork. 4BR.",
    price_min: 650,
    price_max: 780,
    amenities: ["Wifi", "Kitchen", "Washer", "Dryer", "Fireplace", "Workspace", "TV"],
  },

  // — Pet-friendly / Unusual / Edge cases —
  {
    title: "Pet-Friendly Bungalow",
    area_name: "Austin",
    property_type: "house",
    description: "Big fenced yard. Dogs welcome.",
    price_min: 145,
    price_max: 175,
    amenities: ["Wifi", "Kitchen", "Washer", "Pets allowed", "Free parking", "BBQ grill"],
  },
  {
    title: "Workspace-First Studio",
    area_name: "Chicago",
    property_type: "apartment",
    description: "Built for remote workers. Standing desk, dual monitors, herman miller chair.",
    price_min: 110,
    price_max: 140,
    amenities: ["Wifi", "Kitchen", "Workspace", "Air conditioning", "TV"],
  },
  {
    title: "Minimalist Greenpoint Studio",
    area_name: "Greenpoint, Brooklyn",
    property_type: "apartment",
    description: "Everything you need, nothing you don't. Japanese-inspired.",
    price_min: 95,
    price_max: 125,
    amenities: ["Wifi", "Kitchen", "Heating", "Workspace"],
  },
  {
    title: "Hudson Valley Cabin",
    area_name: "Cold Spring, Hudson Valley",
    property_type: "other",
    description: "Off-grid-style cabin with wood stove. No TV, no Wi-Fi. Intentional.",
    price_min: 130,
    price_max: 160,
    amenities: ["Kitchen", "Fireplace", "Free parking", "BBQ grill"],
  },
  {
    title: "Converted Airstream",
    area_name: "Austin",
    property_type: "other",
    description: "Fully restored vintage Airstream on a quiet lot.",
    price_min: 95,
    price_max: 120,
    amenities: ["Wifi", "Kitchen", "Air conditioning", "Free parking"],
  },
  {
    title: "Rooftop Cabana Guesthouse",
    area_name: "Venice, Los Angeles",
    property_type: "other",
    description: "Tiny rooftop guesthouse with panoramic views.",
    price_min: 165,
    price_max: 200,
    amenities: ["Wifi", "Kitchen", "Air conditioning", "Hot tub", "Free parking"],
  },
];

async function main() {
  console.log("🌱 Seeding 30 varied listings for Track B (B3c)…\n");

  // Find any seed host to assign listings to. Prefer existing seed users.
  const { data: hosts, error: hostErr } = await supabase
    .from("users")
    .select("id, email, name")
    .like("email", "%@seed.1db");

  if (hostErr || !hosts || hosts.length === 0) {
    console.error(
      "❌ No seed users found. Run `npx tsx scripts/seed.ts --loren-email you@example.com` first."
    );
    process.exit(1);
  }

  console.log(`Found ${hosts.length} seed hosts`);

  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < LISTINGS.length; i++) {
    const l = LISTINGS[i];
    const host = hosts[i % hosts.length];

    // Idempotent check — skip if title already exists.
    const { data: existing } = await supabase
      .from("listings")
      .select("id")
      .eq("title", l.title)
      .maybeSingle();

    if (existing) {
      console.log(`  ⏭️  ${l.title} (exists)`);
      skipped++;
      continue;
    }

    const { data: listing, error } = await supabase
      .from("listings")
      .insert({
        host_id: host.id,
        property_type: l.property_type,
        title: l.title,
        area_name: l.area_name,
        description: l.description,
        price_min: l.price_min,
        price_max: l.price_max,
        availability_flexible: true,
        amenities: l.amenities,
        house_rules: l.house_rules ?? null,
        preview_visibility: "anyone",
        full_visibility: "anyone",
        min_trust_score: 0,
        is_active: true,
      })
      .select("id")
      .single();

    if (error || !listing) {
      console.error(`  ❌ ${l.title}: ${error?.message}`);
      continue;
    }

    // Photos — pick 3 from the appropriate pool, rotating by index.
    const pool = PHOTO_POOLS[l.property_type];
    const photos = [0, 1, 2].map((offset) => pool[(i + offset) % pool.length]);

    const photoRows = photos.map((url, idx) => ({
      listing_id: listing.id,
      public_url: url,
      is_preview: idx === 0,
      sort_order: idx,
    }));

    const { error: photoErr } = await supabase
      .from("listing_photos")
      .insert(photoRows);

    if (photoErr) {
      console.error(`    ⚠️  photo insert failed for ${l.title}: ${photoErr.message}`);
    }

    console.log(`  ✓ ${l.title}`);
    inserted++;
  }

  console.log(`\n✅ Done. Inserted ${inserted}, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
