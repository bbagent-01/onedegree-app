/**
 * Expanded trust + listing graph for Alpha-C C4.
 *
 * Purpose: give the flipped (host→guest) trust model rich data to
 * render. Creates a second cohort of 20+ users plus 8+ listings, and
 * wires vouches so Loren sees a spread of scores — Weak, Modest,
 * Strong, Very strong, plus some "Not connected" hosts.
 *
 * Direction of vouching is REVERSED from seed-trust-data.ts — here
 * the hosts (and their network) vouch DOWN to mutuals who vouched
 * FOR Loren. That's what creates host→connector→loren paths.
 *
 *   Usage:
 *     npx tsx --env-file=.env.local scripts/seed-host-graph.ts
 *
 *   Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *
 * Idempotent: upserts by email. Re-runs are safe.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const DOMAIN = "@hostgraph-seed.1db";
const LOREN_EMAIL = "loren@onedegreebnb.com";
const PHONE_PREFIX = "+15551110";

function pravatar(id: string): string {
  return `https://i.pravatar.cc/300?u=${encodeURIComponent(id)}`;
}

// ── New user cohort ───────────────────────────────────────────────
// Roles in the graph (all for the host→guest direction):
//   - connector: vouched by a host AND has vouched for Loren
//   - close:     very strong path to Loren (inner circle both ways)
//   - loose:     weak path to Loren (standard + short years)
//   - host:      owns listings; vouches for connectors
//   - cold:      host with no path to Loren (demonstrates "Not connected")
//   - peripheral: reachable via 2 hops but not 1 (for future multi-hop)

interface UserDef {
  key: string;
  name: string;
  role: "connector" | "host" | "cold_host" | "peripheral";
  guest_rating?: number; // 1–5, feeds vouch_power
  host_rating?: number;
  bio?: string;
  location?: string;
}

const USERS: UserDef[] = [
  // ── Strong connectors (Loren vouches & reciprocal) ──
  { key: "elena", name: "Elena Ruiz", role: "connector", guest_rating: 4.8, bio: "Urban planner, 10-year friend of Loren." },
  { key: "marco", name: "Marco Fiore", role: "connector", guest_rating: 4.9, bio: "Photographer. Knows Loren through design circles." },
  { key: "nadia", name: "Nadia Abadi", role: "connector", guest_rating: 4.7, bio: "Veterinarian, well-vouched in the network." },
  { key: "theo", name: "Theo Bergman", role: "connector", guest_rating: 4.2, bio: "Product designer. Solid vouch record." },
  { key: "yuki", name: "Yuki Tanaka", role: "connector", guest_rating: 4.5, bio: "Chef + restaurateur." },
  // ── Loose connectors (weaker paths) ──
  { key: "felix", name: "Felix Brandt", role: "connector", guest_rating: 3.2, bio: "Freelance videographer. Newer to the network." },
  { key: "ivy", name: "Ivy Okonkwo", role: "connector", guest_rating: 3.6, bio: "Researcher. Knows a few hosts via conferences." },
  { key: "cassidy", name: "Cassidy Miles", role: "connector", guest_rating: 3.0, bio: "Music producer." },
  // ── Peripheral (2-hop only — prep for multi-hop) ──
  { key: "amira", name: "Amira Nasser", role: "peripheral", guest_rating: 4.4, bio: "Illustrator, known by Elena." },
  { key: "luka", name: "Luka Ivanov", role: "peripheral", guest_rating: 4.1, bio: "Composer, friend of Marco's." },
  { key: "jules", name: "Jules Fontaine", role: "peripheral", guest_rating: 3.8, bio: "Stylist, in Nadia's circle." },

  // ── Hosts (with listings) reachable via the connectors ──
  { key: "rosa", name: "Rosa Delgado", role: "host", host_rating: 4.9, bio: "Lifelong host in Mexico City.", location: "Mexico City" },
  { key: "kai", name: "Kai Stephens", role: "host", host_rating: 4.8, bio: "Beach cottage host.", location: "Santa Cruz, CA" },
  { key: "priya_h", name: "Priya Reddy", role: "host", host_rating: 4.5, bio: "Mountain cabin host.", location: "Asheville, NC" },
  { key: "omar_h", name: "Omar Chowdhury", role: "host", host_rating: 4.3, bio: "Downtown loft host.", location: "Chicago, IL" },
  { key: "sophie", name: "Sophie Laurent", role: "host", host_rating: 4.6, bio: "Paris apartment host.", location: "Paris, France" },
  { key: "hana", name: "Hana Yoon", role: "host", host_rating: 4.7, bio: "Seoul guesthouse.", location: "Seoul, South Korea" },
  { key: "diego", name: "Diego Ferrer", role: "host", host_rating: 4.1, bio: "Barcelona flat.", location: "Barcelona, Spain" },
  { key: "zara", name: "Zara Malik", role: "host", host_rating: 4.4, bio: "Marrakech riad.", location: "Marrakech, Morocco" },

  // ── Cold hosts (no path to Loren) ──
  { key: "bjorn", name: "Björn Eriksson", role: "cold_host", host_rating: 4.9, bio: "Stockholm studio.", location: "Stockholm, Sweden" },
  { key: "mei", name: "Mei Chang", role: "cold_host", host_rating: 4.5, bio: "Taipei skyline view.", location: "Taipei, Taiwan" },
];

type VouchDef = {
  from: string; // key or "loren"
  to: string;
  type: "standard" | "inner_circle";
  years: "lt1" | "1to3" | "3to5" | "5to10" | "10plus";
};

// ── Vouch graph (reverse-direction oriented) ─────────────────────
// To produce host→connector→loren paths we need:
//   1. connector → loren (connector has vouched for Loren)
//   2. host → connector (host has vouched for the connector)
//
// We also seed some connector↔connector links for richness.
const VOUCHES: VouchDef[] = [
  // ── Connectors → Loren (these make paths TO Loren) ──
  { from: "elena", to: "loren", type: "inner_circle", years: "10plus" },
  { from: "marco", to: "loren", type: "inner_circle", years: "5to10" },
  { from: "nadia", to: "loren", type: "standard", years: "5to10" },
  { from: "theo", to: "loren", type: "standard", years: "3to5" },
  { from: "yuki", to: "loren", type: "standard", years: "3to5" },
  { from: "felix", to: "loren", type: "standard", years: "1to3" },
  { from: "ivy", to: "loren", type: "standard", years: "lt1" },
  { from: "cassidy", to: "loren", type: "standard", years: "lt1" },

  // ── Loren → connectors (reciprocal so popovers show both) ──
  { from: "loren", to: "elena", type: "inner_circle", years: "10plus" },
  { from: "loren", to: "marco", type: "inner_circle", years: "5to10" },
  { from: "loren", to: "nadia", type: "standard", years: "5to10" },
  { from: "loren", to: "theo", type: "standard", years: "3to5" },
  { from: "loren", to: "yuki", type: "standard", years: "3to5" },
  { from: "loren", to: "felix", type: "standard", years: "1to3" },
  { from: "loren", to: "ivy", type: "standard", years: "lt1" },
  { from: "loren", to: "cassidy", type: "standard", years: "lt1" },

  // ── Hosts → connectors (this is the other half of the path) ──
  // rosa — very strong network (4 strong connectors → Very strong 50+ score)
  { from: "rosa", to: "elena", type: "inner_circle", years: "10plus" },
  { from: "rosa", to: "marco", type: "inner_circle", years: "5to10" },
  { from: "rosa", to: "nadia", type: "standard", years: "5to10" },
  { from: "rosa", to: "yuki", type: "standard", years: "3to5" },

  // kai — strong but fewer connectors
  { from: "kai", to: "marco", type: "standard", years: "5to10" },
  { from: "kai", to: "theo", type: "standard", years: "3to5" },
  { from: "kai", to: "nadia", type: "standard", years: "1to3" },

  // priya_h — modest reach
  { from: "priya_h", to: "theo", type: "standard", years: "3to5" },
  { from: "priya_h", to: "yuki", type: "standard", years: "1to3" },
  { from: "priya_h", to: "felix", type: "standard", years: "1to3" },

  // omar_h — single strong connector
  { from: "omar_h", to: "elena", type: "inner_circle", years: "5to10" },

  // sophie — two weak connectors → Modest
  { from: "sophie", to: "felix", type: "standard", years: "1to3" },
  { from: "sophie", to: "cassidy", type: "standard", years: "lt1" },

  // hana — one weak connector → Weak
  { from: "hana", to: "cassidy", type: "standard", years: "lt1" },

  // diego — one medium connector → Strong
  { from: "diego", to: "nadia", type: "standard", years: "5to10" },

  // zara — direct vouch of Loren (top-tier)
  { from: "zara", to: "loren", type: "inner_circle", years: "10plus" },

  // cold hosts: no vouches toward Loren or her connectors
  // (bjorn, mei stay isolated to demonstrate "Not connected")

  // ── Peripheral users (reachable through connectors, but connectors
  // have vouched for Loren — so these are really 2-hop connectors too) ──
  { from: "elena", to: "amira", type: "standard", years: "3to5" },
  { from: "marco", to: "luka", type: "inner_circle", years: "5to10" },
  { from: "nadia", to: "jules", type: "standard", years: "1to3" },

  // ── Connector cross-links (for richness, no direct effect on Loren path) ──
  { from: "elena", to: "marco", type: "standard", years: "5to10" },
  { from: "marco", to: "yuki", type: "standard", years: "3to5" },
  { from: "theo", to: "elena", type: "standard", years: "1to3" },
];

// ── Curated Unsplash photo pools per property type ───────────────
// Each URL is a stable Unsplash CDN link. We insert 4 per listing
// so both the preview 2×2 grid and the full detail gallery fill out.
const PHOTO_POOLS: Record<"apartment" | "house" | "room", string[]> = {
  apartment: [
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1501183638710-841dd1904471?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1200&h=800&fit=crop",
  ],
  house: [
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1449844908441-8829872d2607?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=800&fit=crop",
  ],
  room: [
    "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1616627547584-bf28cee262db?w=1200&h=800&fit=crop",
  ],
};

/** Deterministic photo selection per listing — same seed input
 *  produces the same 4 photos across re-runs. */
function pickPhotos(
  propertyType: "apartment" | "house" | "room",
  seedKey: string,
  count = 4
): string[] {
  const pool = PHOTO_POOLS[propertyType];
  let hash = 0;
  for (let i = 0; i < seedKey.length; i++) {
    hash = (hash * 31 + seedKey.charCodeAt(i)) >>> 0;
  }
  const picks: string[] = [];
  for (let i = 0; i < count; i++) {
    picks.push(pool[(hash + i * 7) % pool.length]);
  }
  return picks;
}

// ── Listings for each host ───────────────────────────────────────
interface ListingDef {
  host: string; // user key
  title: string;
  area_name: string;
  property_type: "apartment" | "house" | "room";
  price: number;
  description: string;
  visibility_mode: "public" | "preview_gated";
  min_trust_gate: number;
}

const LISTINGS: ListingDef[] = [
  {
    host: "rosa",
    title: "Bright Coyoacán Loft",
    area_name: "Coyoacán, Mexico City",
    property_type: "apartment",
    price: 110,
    description: "Artist loft in a quiet colonial street.",
    visibility_mode: "preview_gated",
    min_trust_gate: 30,
  },
  {
    host: "kai",
    title: "Cliffside Beach Cottage",
    area_name: "Santa Cruz, CA",
    property_type: "house",
    price: 240,
    description: "Two-bedroom cottage steps from the Pacific.",
    visibility_mode: "preview_gated",
    min_trust_gate: 20,
  },
  {
    host: "priya_h",
    title: "Mountain Cabin with Hot Tub",
    area_name: "Asheville, NC",
    property_type: "house",
    price: 180,
    description: "Rustic cabin, forest views, wood stove.",
    visibility_mode: "preview_gated",
    min_trust_gate: 15,
  },
  {
    host: "omar_h",
    title: "Downtown Loft on the Loop",
    area_name: "Chicago, IL",
    property_type: "apartment",
    price: 165,
    description: "Industrial loft with skyline views.",
    visibility_mode: "preview_gated",
    min_trust_gate: 15,
  },
  {
    host: "sophie",
    title: "Parisian Pied-à-Terre",
    area_name: "Paris, France",
    property_type: "apartment",
    price: 200,
    description: "Charming studio in the Marais.",
    visibility_mode: "preview_gated",
    min_trust_gate: 10,
  },
  {
    host: "hana",
    title: "Seoul Hanok Guesthouse",
    area_name: "Seoul, South Korea",
    property_type: "house",
    price: 130,
    description: "Traditional hanok in Bukchon.",
    visibility_mode: "preview_gated",
    min_trust_gate: 5,
  },
  {
    host: "diego",
    title: "Gothic Quarter Flat",
    area_name: "Barcelona, Spain",
    property_type: "apartment",
    price: 150,
    description: "Renovated flat with balcony.",
    visibility_mode: "preview_gated",
    min_trust_gate: 15,
  },
  {
    host: "zara",
    title: "Riad in the Medina",
    area_name: "Marrakech, Morocco",
    property_type: "house",
    price: 145,
    description: "Traditional riad with rooftop terrace.",
    visibility_mode: "preview_gated",
    min_trust_gate: 10,
  },
  {
    host: "bjorn",
    title: "Minimalist Stockholm Studio",
    area_name: "Stockholm, Sweden",
    property_type: "apartment",
    price: 175,
    description: "Scandinavian design, canal views.",
    visibility_mode: "preview_gated",
    min_trust_gate: 25,
  },
  {
    host: "mei",
    title: "Taipei Skyline Apartment",
    area_name: "Taipei, Taiwan",
    property_type: "apartment",
    price: 135,
    description: "Top-floor apartment with 101 view.",
    visibility_mode: "preview_gated",
    min_trust_gate: 20,
  },
];

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding expanded host + trust graph\n");

  // Loren.
  const { data: lorenRow } = await supabase
    .from("users")
    .select("id")
    .eq("email", LOREN_EMAIL)
    .maybeSingle();
  if (!lorenRow?.id) {
    console.error(`Loren not found (${LOREN_EMAIL}). Create account first.`);
    process.exit(1);
  }
  const lorenId = lorenRow.id as string;
  console.log(`Loren: ${lorenId}\n`);

  // Users.
  const userIdByKey = new Map<string, string>([["loren", lorenId]]);
  console.log("Upserting users…");
  for (const u of USERS) {
    const email = `${u.key}${DOMAIN}`;
    const { data: upserted, error } = await supabase
      .from("users")
      .upsert(
        {
          clerk_id: `seed_hostgraph_${u.key}`,
          email,
          name: u.name,
          phone_number: `${PHONE_PREFIX}${String(USERS.indexOf(u)).padStart(3, "0")}`,
          bio: u.bio ?? null,
          location: u.location ?? null,
          guest_rating: u.guest_rating ?? null,
          host_rating: u.host_rating ?? null,
        },
        { onConflict: "email" }
      )
      .select("id")
      .single();
    if (error || !upserted) {
      console.warn(`  ✗ ${u.name}: ${error?.message}`);
      continue;
    }
    userIdByKey.set(u.key, upserted.id);

    // Pravatar portrait (idempotent update).
    await supabase
      .from("users")
      .update({ avatar_url: pravatar(upserted.id) })
      .eq("id", upserted.id);

    console.log(`  ✓ ${u.name}`);
  }

  // Vouches.
  console.log("\nUpserting vouches…");
  let vouchOk = 0;
  for (const v of VOUCHES) {
    const fromId = userIdByKey.get(v.from);
    const toId = userIdByKey.get(v.to);
    if (!fromId || !toId) {
      console.warn(`  ✗ ${v.from} → ${v.to}: missing user`);
      continue;
    }
    const { error } = await supabase.from("vouches").upsert(
      {
        voucher_id: fromId,
        vouchee_id: toId,
        vouch_type: v.type,
        years_known_bucket: v.years,
      },
      { onConflict: "voucher_id,vouchee_id" }
    );
    if (error) {
      console.warn(`  ✗ ${v.from} → ${v.to}: ${error.message}`);
      continue;
    }
    vouchOk++;
  }
  console.log(`  ${vouchOk}/${VOUCHES.length} vouches upserted`);

  // Trigger vouch_power recompute.
  console.log("\nRecomputing vouch_power…");
  for (const [key, id] of userIdByKey) {
    if (key === "loren") continue;
    try {
      await supabase.rpc("calculate_vouch_power", { p_user_id: id });
    } catch {
      // Non-fatal — trigger will eventually fire.
    }
  }

  // Listings.
  console.log("\nUpserting listings…");
  let listingOk = 0;
  for (const l of LISTINGS) {
    const hostId = userIdByKey.get(l.host);
    if (!hostId) continue;
    const slug = `hostgraph-${l.host}`;
    const { data: existing } = await supabase
      .from("listings")
      .select("id")
      .eq("host_id", hostId)
      .eq("title", l.title)
      .maybeSingle();
    // Listing meta (bedrooms/beds/bathrooms/amenities) lives inside
    // `description` via the meta-encoding helper — the listings table
    // itself only has the top-level columns.
    const meta = {
      meta: {
        propertyLabel:
          l.property_type === "apartment"
            ? "Apartment"
            : l.property_type === "house"
              ? "House"
              : "Room",
        guests: 2,
        bedrooms: 1,
        beds: 1,
        bathrooms: 1,
      },
    };
    const encodedDescription = `${l.description}<!--meta:${JSON.stringify(meta)}-->`;
    const body = {
      host_id: hostId,
      title: l.title,
      area_name: l.area_name,
      property_type: l.property_type,
      description: encodedDescription,
      price_min: l.price,
      price_max: l.price,
      is_active: true,
      amenities: ["Wifi", "Kitchen"],
      visibility_mode: l.visibility_mode,
      min_trust_gate: l.min_trust_gate,
      access_settings: {
        see_preview: { type: "anyone" },
        full_listing_contact: {
          type: "min_score",
          threshold: l.min_trust_gate,
        },
        allow_intro_requests: true,
        // Standard preset: all preview toggles ON. Matches the default
        // a host sees in the visibility wizard so seeded listings read
        // like freshly created ones instead of fully-hidden previews.
        preview_content: {
          show_title: true,
          show_price_range: true,
          show_description: true,
          show_host_first_name: true,
          show_neighborhood: true,
          show_map_area: true,
          show_rating: true,
          show_amenities: true,
          show_bed_counts: true,
          show_house_rules: true,
          use_preview_specific_description: false,
        },
      },
    };
    const row = existing
      ? await supabase.from("listings").update(body).eq("id", existing.id).select("id").single()
      : await supabase
          .from("listings")
          .insert({ ...body, id: crypto.randomUUID() })
          .select("id")
          .single();
    if (row.error || !row.data) {
      console.warn(`  ✗ ${l.title}: ${row.error?.message}`);
      continue;
    }
    // Photos — delete any prior seed photos for this listing, then
    // insert a fresh 4-photo set. Idempotent across re-runs and
    // sidesteps the missing (listing_id,storage_path) unique index.
    await supabase
      .from("listing_photos")
      .delete()
      .eq("listing_id", row.data.id)
      .like("storage_path", "seed/%");

    const photoUrls = pickPhotos(l.property_type, slug, 4);
    const photoRows = photoUrls.map((url, i) => ({
      listing_id: row.data.id,
      public_url: url,
      storage_path: `seed/${slug}-${i}.jpg`,
      is_cover: i === 0,
      is_preview: true,
      sort_order: i,
    }));
    const photoInsert = await supabase.from("listing_photos").insert(photoRows);
    if (photoInsert.error) {
      console.warn(`  ✗ ${l.title} photos: ${photoInsert.error.message}`);
    }
    listingOk++;
    console.log(`  ✓ ${l.title}`);
  }
  console.log(`  ${listingOk}/${LISTINGS.length} listings upserted`);

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
