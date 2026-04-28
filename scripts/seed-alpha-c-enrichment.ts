/**
 * Alpha-C enrichment (CC-Dev1 follow-up).
 *
 * Layered on top of seed-host-graph.ts. Run AFTER that script.
 * Purpose: make the alpha-c database feel like a realistic platform
 * so impersonation testing has something to walk through.
 *
 * Adds:
 *   1. Listings for 3 of the connector-only users → dual host+guest roles.
 *   2. 2 listings for Loren so his hosting dashboard has real inventory.
 *   3. Completed stay_confirmations with ratings on every listing → populates
 *      listing_review_count / avg_listing_rating and gives hosts a
 *      host_rating. Mixed cross-cluster so every guest has stayed somewhere
 *      and every host has hosted someone.
 *   4. Upcoming + completed reservations for Loren in both roles
 *      (guest + host) so the trips and hosting sections are non-empty.
 *   5. 2 bridge vouches so previously-cold hosts (bjorn, mei) have a path
 *      into the main graph — no cold islands.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-alpha-c-enrichment.ts
 *
 * Idempotent: keys every insert by a stable natural key (email, title,
 * date range) and upserts / skips duplicates. Safe to re-run.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const LOREN_EMAIL = "lorenpolster@gmail.com";

// ── Helpers ────────────────────────────────────────────────────

async function getUserByEmail(email: string): Promise<string | null> {
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  return (data?.id as string) ?? null;
}

async function getHostGraphUserId(key: string): Promise<string | null> {
  return await getUserByEmail(`${key}@hostgraph-seed.1db`);
}

async function ensureListing(
  hostId: string,
  spec: {
    title: string;
    area_name: string;
    property_type: "apartment" | "house" | "room";
    price: number;
    description: string;
    lat: number;
    lng: number;
    min_trust_gate: number;
    visibility_mode: "public" | "preview_gated";
    photos: string[];
    amenities?: string[];
  }
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("listings")
    .select("id")
    .eq("host_id", hostId)
    .eq("title", spec.title)
    .maybeSingle();
  if (existing?.id) {
    return existing.id as string;
  }

  const meta = {
    meta: {
      propertyLabel:
        spec.property_type === "apartment"
          ? "Apartment"
          : spec.property_type === "house"
            ? "House"
            : "Room",
      guests: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
    },
  };
  const description = `<!--meta:${JSON.stringify(meta)}-->\n\n${spec.description}`;

  const { data: inserted, error } = await supabase
    .from("listings")
    .insert({
      id: crypto.randomUUID(),
      host_id: hostId,
      title: spec.title,
      area_name: spec.area_name,
      property_type: spec.property_type,
      description,
      price_min: spec.price,
      price_max: spec.price,
      is_active: true,
      amenities: spec.amenities ?? [
        "Wifi",
        "Kitchen",
        "Heating",
        "Workspace",
        "TV",
      ],
      visibility_mode: spec.visibility_mode,
      min_trust_gate: spec.min_trust_gate,
      access_settings: {
        see_preview: { type: "anyone" },
        full_listing_contact: {
          type: "min_score",
          threshold: spec.min_trust_gate,
        },
        allow_intro_requests: true,
        preview_content: {
          show_title: true,
          show_price_range: true,
          show_description: true,
          show_host_first_name: true,
          show_profile_photo: true,
          show_neighborhood: true,
          show_map_area: true,
          show_rating: true,
          show_amenities: true,
          show_bed_counts: true,
          show_house_rules: true,
          use_preview_specific_description: false,
        },
      },
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.warn(`  ✗ listing "${spec.title}": ${error?.message}`);
    return null;
  }

  // Photos — clear + reinsert.
  const slug = `enrich-${hostId.slice(0, 6)}-${spec.title
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()
    .slice(0, 40)}`;
  await supabase
    .from("listing_photos")
    .delete()
    .eq("listing_id", inserted.id as string);
  const photoRows = spec.photos.map((url, i) => ({
    listing_id: inserted.id as string,
    public_url: url,
    storage_path: `seed-enrich/${slug}-${i}.jpg`,
    is_cover: i === 0,
    is_preview: true,
    sort_order: i,
  }));
  await supabase.from("listing_photos").insert(photoRows);

  return inserted.id as string;
}

async function ensureVouch(
  voucherId: string,
  voucheeId: string,
  vouchType: "standard" | "inner_circle",
  yearsBucket: "lt1" | "1to3" | "3to5" | "5to10" | "10plus"
): Promise<void> {
  await supabase.from("vouches").upsert(
    {
      voucher_id: voucherId,
      vouchee_id: voucheeId,
      vouch_type: vouchType,
      years_known_bucket: yearsBucket,
    },
    { onConflict: "voucher_id,vouchee_id" }
  );
}

/**
 * Create (or no-op) a completed stay: both the backing
 * contact_request (status='accepted', responded in past) AND the
 * stay_confirmation with ratings. The app derives completed stays
 * from contact_requests joined to stay_confirmations via
 * contact_request_id — orphan stay_confirmations don't surface on
 * the trips / hosting tabs. Keys on (listing_id, guest_id, check_in)
 * so re-runs idempotently no-op.
 */
async function ensureCompletedStay(spec: {
  listingId: string;
  hostId: string;
  guestId: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  guestRating: number; // 1-5
  hostRating: number;
  listingRating: number;
  guestReview: string;
  hostReview: string;
  listingReview: string;
}): Promise<void> {
  // 1. Find or create the contact_request.
  let requestId: string | null = null;
  const { data: existingReq } = await supabase
    .from("contact_requests")
    .select("id, status")
    .eq("listing_id", spec.listingId)
    .eq("guest_id", spec.guestId)
    .eq("check_in", spec.checkIn)
    .maybeSingle();
  if (existingReq?.id) {
    requestId = existingReq.id as string;
    // If it was pending, bump to accepted so the derived tabs show
    // "completed" for past dates.
    if (existingReq.status !== "accepted") {
      await supabase
        .from("contact_requests")
        .update({
          status: "accepted",
          responded_at: new Date(spec.checkIn).toISOString(),
        })
        .eq("id", requestId);
    }
  } else {
    const { data: inserted, error: reqErr } = await supabase
      .from("contact_requests")
      .insert({
        listing_id: spec.listingId,
        guest_id: spec.guestId,
        host_id: spec.hostId,
        message: "Hi! Booking via seed.",
        check_in: spec.checkIn,
        check_out: spec.checkOut,
        guest_count: 2,
        status: "accepted",
        responded_at: new Date(spec.checkIn).toISOString(),
      })
      .select("id")
      .single();
    if (reqErr || !inserted) {
      console.warn(
        `  ✗ req ${spec.checkIn} listing=${spec.listingId.slice(0, 8)}: ${reqErr?.message}`
      );
      return;
    }
    requestId = inserted.id as string;
  }

  // 2. Find or create the stay_confirmation linked to that request.
  const { data: existingStay } = await supabase
    .from("stay_confirmations")
    .select("id")
    .eq("listing_id", spec.listingId)
    .eq("guest_id", spec.guestId)
    .eq("check_in", spec.checkIn)
    .maybeSingle();
  if (existingStay?.id) {
    // Ensure linkage is set (older seed rows wrote orphans).
    await supabase
      .from("stay_confirmations")
      .update({ contact_request_id: requestId })
      .eq("id", existingStay.id as string)
      .is("contact_request_id", null);
    return;
  }

  const { error } = await supabase.from("stay_confirmations").insert({
    listing_id: spec.listingId,
    host_id: spec.hostId,
    guest_id: spec.guestId,
    contact_request_id: requestId,
    check_in: spec.checkIn,
    check_out: spec.checkOut,
    host_confirmed: true,
    guest_confirmed: true,
    guest_rating: spec.guestRating,
    host_rating: spec.hostRating,
    listing_rating: spec.listingRating,
    guest_review_text: spec.guestReview,
    host_review_text: spec.hostReview,
    listing_review_text: spec.listingReview,
  });
  if (error) {
    console.warn(
      `  ✗ stay ${spec.checkIn} listing=${spec.listingId.slice(0, 8)}: ${error.message}`
    );
  }
}

/**
 * Ensure a message_thread exists for the (listing, guest) pair and
 * seed the guest's request message (+ optional host response) as
 * actual message rows. Without this the inbox renders "No messages
 * yet. Say hello!" on seeded reservations even though the message
 * text exists on the contact_request itself. Called by both the
 * pending and accepted helpers below.
 *
 * Idempotent — keys on (thread, sender, content) so re-runs never
 * double-insert the same seed lines.
 */
async function ensureThreadMessages(spec: {
  listingId: string;
  hostId: string;
  guestId: string;
  contactRequestId: string;
  guestMessage: string;
  hostResponse: string | null;
  createdAt: string;
  respondedAt: string | null;
}): Promise<void> {
  const { data: existingThread } = await supabase
    .from("message_threads")
    .select("id, contact_request_id")
    .eq("listing_id", spec.listingId)
    .eq("guest_id", spec.guestId)
    .maybeSingle();

  let threadId: string;
  if (existingThread?.id) {
    threadId = existingThread.id as string;
    if (!existingThread.contact_request_id) {
      await supabase
        .from("message_threads")
        .update({ contact_request_id: spec.contactRequestId })
        .eq("id", threadId);
    }
  } else {
    const { data: inserted, error } = await supabase
      .from("message_threads")
      .insert({
        listing_id: spec.listingId,
        guest_id: spec.guestId,
        host_id: spec.hostId,
        contact_request_id: spec.contactRequestId,
        last_message_at: spec.createdAt,
      })
      .select("id")
      .single();
    if (error || !inserted) return;
    threadId = inserted.id as string;
  }

  // Guest intro
  if (spec.guestMessage.trim()) {
    const { data: existingGuest } = await supabase
      .from("messages")
      .select("id")
      .eq("thread_id", threadId)
      .eq("sender_id", spec.guestId)
      .eq("content", spec.guestMessage)
      .limit(1)
      .maybeSingle();
    if (!existingGuest) {
      await supabase.from("messages").insert({
        thread_id: threadId,
        sender_id: spec.guestId,
        content: spec.guestMessage,
        is_system: false,
        created_at: spec.createdAt,
      });
    }
  }

  // Host response
  if (spec.hostResponse?.trim()) {
    const { data: existingHost } = await supabase
      .from("messages")
      .select("id")
      .eq("thread_id", threadId)
      .eq("sender_id", spec.hostId)
      .eq("content", spec.hostResponse)
      .limit(1)
      .maybeSingle();
    if (!existingHost) {
      await supabase.from("messages").insert({
        thread_id: threadId,
        sender_id: spec.hostId,
        content: spec.hostResponse,
        is_system: false,
        created_at: spec.respondedAt ?? spec.createdAt,
      });
    }
  }

  const newestAt = spec.hostResponse && spec.respondedAt
    ? spec.respondedAt
    : spec.createdAt;
  const preview = (spec.hostResponse || spec.guestMessage).slice(0, 160);
  await supabase
    .from("message_threads")
    .update({ last_message_at: newestAt, last_message_preview: preview })
    .eq("id", threadId);
}

/**
 * Pending contact_request — shows up in the host's dashboard as an
 * action item. Keyed by (listing_id, guest_id, check_in).
 */
async function ensurePendingRequest(spec: {
  listingId: string;
  hostId: string;
  guestId: string;
  checkIn: string;
  checkOut: string;
  message: string;
}): Promise<void> {
  const { data: existing } = await supabase
    .from("contact_requests")
    .select("id, created_at")
    .eq("listing_id", spec.listingId)
    .eq("guest_id", spec.guestId)
    .eq("check_in", spec.checkIn)
    .maybeSingle();

  let requestId: string;
  let createdAt: string;
  if (existing?.id) {
    requestId = existing.id as string;
    createdAt = (existing.created_at as string) ?? new Date().toISOString();
  } else {
    const { data: inserted, error } = await supabase
      .from("contact_requests")
      .insert({
        listing_id: spec.listingId,
        guest_id: spec.guestId,
        host_id: spec.hostId,
        message: spec.message,
        check_in: spec.checkIn,
        check_out: spec.checkOut,
        guest_count: 2,
        status: "pending",
      })
      .select("id, created_at")
      .single();
    if (error || !inserted) return;
    requestId = inserted.id as string;
    createdAt = (inserted.created_at as string) ?? new Date().toISOString();
  }

  await ensureThreadMessages({
    listingId: spec.listingId,
    hostId: spec.hostId,
    guestId: spec.guestId,
    contactRequestId: requestId,
    guestMessage: spec.message,
    hostResponse: null,
    createdAt,
    respondedAt: null,
  });
}

/** Accepted contact_request → use for upcoming confirmed trips. */
async function ensureAcceptedRequest(spec: {
  listingId: string;
  hostId: string;
  guestId: string;
  checkIn: string;
  checkOut: string;
  message: string;
}): Promise<void> {
  const { data: existing } = await supabase
    .from("contact_requests")
    .select("id, created_at, responded_at, host_response_message")
    .eq("listing_id", spec.listingId)
    .eq("guest_id", spec.guestId)
    .eq("check_in", spec.checkIn)
    .maybeSingle();

  const hostResponse = "Can't wait to have you — I'll send the door code.";
  let requestId: string;
  let createdAt: string;
  let respondedAt: string;

  if (existing?.id) {
    requestId = existing.id as string;
    createdAt = (existing.created_at as string) ?? new Date().toISOString();
    respondedAt =
      (existing.responded_at as string) ?? new Date().toISOString();
  } else {
    const now = new Date().toISOString();
    const { data: inserted, error } = await supabase
      .from("contact_requests")
      .insert({
        listing_id: spec.listingId,
        guest_id: spec.guestId,
        host_id: spec.hostId,
        message: spec.message,
        check_in: spec.checkIn,
        check_out: spec.checkOut,
        guest_count: 2,
        status: "accepted",
        host_response_message: hostResponse,
        responded_at: now,
      })
      .select("id, created_at, responded_at")
      .single();
    if (error || !inserted) return;
    requestId = inserted.id as string;
    createdAt = (inserted.created_at as string) ?? now;
    respondedAt = (inserted.responded_at as string) ?? now;
  }

  await ensureThreadMessages({
    listingId: spec.listingId,
    hostId: spec.hostId,
    guestId: spec.guestId,
    contactRequestId: requestId,
    guestMessage: spec.message,
    hostResponse,
    createdAt,
    respondedAt,
  });
}

function pastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

// Stable photo pools reused here — Unsplash URLs same as seed-host-graph.
const APT_PHOTOS = [
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=800&fit=crop",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=800&fit=crop",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&h=800&fit=crop",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&h=800&fit=crop",
];
const HOUSE_PHOTOS = [
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=800&fit=crop",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&h=800&fit=crop",
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=800&fit=crop",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&h=800&fit=crop",
];
const ROOM_PHOTOS = [
  "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&h=800&fit=crop",
  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&h=800&fit=crop",
  "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200&h=800&fit=crop",
  "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1200&h=800&fit=crop",
];

// ── Main ───────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Alpha-C enrichment\n");

  // Loren (required).
  const lorenId = await getUserByEmail(LOREN_EMAIL);
  if (!lorenId) {
    console.error(`Loren not found (${LOREN_EMAIL}). Run seed-host-graph first.`);
    process.exit(1);
  }
  console.log(`Loren: ${lorenId}\n`);

  // Resolve host-graph keys → DB ids.
  const keys = [
    "elena",
    "marco",
    "nadia",
    "theo",
    "yuki",
    "felix",
    "ivy",
    "cassidy",
    "amira",
    "luka",
    "jules",
    "pavel",
    "ines",
    "rosa",
    "kai",
    "priya_h",
    "omar_h",
    "sophie",
    "hana",
    "diego",
    "zara",
    "bjorn",
    "mei",
  ];
  const ids = new Map<string, string>();
  for (const k of keys) {
    const id = await getHostGraphUserId(k);
    if (id) ids.set(k, id);
  }
  console.log(`Resolved ${ids.size}/${keys.length} host-graph users\n`);

  // ── 1. Bridge vouches so bjorn + mei aren't cold islands ─────
  console.log("Bridging cold hosts…");
  const bjorn = ids.get("bjorn");
  const mei = ids.get("mei");
  const elena = ids.get("elena");
  const marco = ids.get("marco");
  if (bjorn && elena) {
    // Loose mutual link — bjorn knows elena weakly, gives viewers a 3-4°
    // path into the Stockholm listing instead of "Not connected".
    await ensureVouch(bjorn, elena, "standard", "lt1");
    await ensureVouch(elena, bjorn, "standard", "lt1");
  }
  if (mei && marco) {
    await ensureVouch(mei, marco, "standard", "lt1");
    await ensureVouch(marco, mei, "standard", "lt1");
  }
  console.log("  ✓ bjorn↔elena, mei↔marco");

  // ── 2. Give 3 connectors dual roles (add listings) ────────────
  console.log("\nAdding listings to dual-role connectors…");
  const elenaListing = elena
    ? await ensureListing(elena, {
        title: "Brooklyn Brownstone Garden Flat",
        area_name: "Brooklyn, NY",
        property_type: "apartment",
        price: 175,
        description:
          "Garden-level flat in a classic Park Slope brownstone. Private entrance, leafy backyard, steps from Prospect Park.",
        lat: 40.6702,
        lng: -73.9774,
        min_trust_gate: 20,
        visibility_mode: "preview_gated",
        photos: APT_PHOTOS,
      })
    : null;
  const yuki = ids.get("yuki");
  const yukiListing = yuki
    ? await ensureListing(yuki, {
        title: "Pop-up Chef's Loft",
        area_name: "Portland, OR",
        property_type: "apartment",
        price: 165,
        description:
          "Open-plan loft above Yuki's restaurant. Full chef's kitchen, cast-iron window bar, Dutch bike to borrow.",
        lat: 45.5152,
        lng: -122.6784,
        min_trust_gate: 20,
        visibility_mode: "preview_gated",
        photos: APT_PHOTOS,
      })
    : null;
  const theo = ids.get("theo");
  const theoListing = theo
    ? await ensureListing(theo, {
        title: "Design Studio Guest Room",
        area_name: "Copenhagen, Denmark",
        property_type: "room",
        price: 95,
        description:
          "Private guest room in a Nørrebro design studio. Shared kitchen, great coffee, bikes at the door.",
        lat: 55.6928,
        lng: 12.5498,
        min_trust_gate: 10,
        visibility_mode: "preview_gated",
        photos: ROOM_PHOTOS,
      })
    : null;
  console.log(
    `  ✓ elena / yuki / theo listings: ${[elenaListing, yukiListing, theoListing].filter(Boolean).length}/3`
  );

  // ── 3. Give Loren two listings ───────────────────────────────
  console.log("\nAdding Loren's hosting inventory…");
  const lorenListingA = await ensureListing(lorenId, {
    title: "Hudson Valley Cabin Getaway",
    area_name: "Kingston, NY",
    property_type: "house",
    price: 220,
    description:
      "Stone-and-timber cabin on 8 wooded acres. Wood stove, outdoor soaking tub, trailhead out the back door. Quiet weekends only — no large groups.",
    lat: 41.9270,
    lng: -73.9974,
    min_trust_gate: 15,
    visibility_mode: "preview_gated",
    photos: HOUSE_PHOTOS,
  });
  const lorenListingB = await ensureListing(lorenId, {
    title: "West Village Studio",
    area_name: "New York, NY",
    property_type: "apartment",
    price: 195,
    description:
      "Fifth-floor walk-up studio on Jane Street. Big windows, small but well-used kitchen, excellent coffee spots within a block.",
    lat: 40.7369,
    lng: -74.0068,
    min_trust_gate: 25,
    visibility_mode: "preview_gated",
    photos: APT_PHOTOS,
  });
  console.log(
    `  ✓ Loren listings: ${[lorenListingA, lorenListingB].filter(Boolean).length}/2`
  );

  // ── 4. Completed stays → populates listing + host ratings ────
  console.log("\nSeeding completed stays (reviews)…");
  // Target: every host's listings get 1–3 completed stays.
  // We cycle a pool of guest candidates from across clusters so no
  // one guest hits the same host twice.
  const guestPool = [
    "nadia",
    "theo",
    "felix",
    "ivy",
    "cassidy",
    "jules",
    "pavel",
    "luka",
    "amira",
    "ines",
    "elena",
    "marco",
    "yuki",
  ]
    .map((k) => ids.get(k))
    .filter((v): v is string => !!v);

  let guestIdx = 0;
  const pickGuest = (hostId: string): string | null => {
    for (let i = 0; i < guestPool.length; i++) {
      const g = guestPool[(guestIdx + i) % guestPool.length];
      if (g !== hostId) {
        guestIdx = (guestIdx + i + 1) % guestPool.length;
        return g;
      }
    }
    return null;
  };

  // Every listing that currently exists gets 1-3 reviews.
  const { data: allListings } = await supabase
    .from("listings")
    .select("id, host_id, title")
    .eq("is_active", true);
  console.log(`  → ${allListings?.length ?? 0} listings total`);

  let stayCount = 0;
  for (const l of allListings ?? []) {
    const count = 1 + (stayCount % 3); // 1, 2, 3, 1, 2, 3…
    for (let i = 0; i < count; i++) {
      const guestId = pickGuest(l.host_id as string);
      if (!guestId) continue;
      // Check for cross-contamination: both host and guest must share
      // is_test_user = true; they do (all seed users flagged), but
      // skip if either is the real Loren (lorenId) when the other
      // isn't a test user. Here all candidates are test users or
      // Loren himself; Loren stays are handled below separately.
      if ((l.host_id as string) === lorenId) continue;
      if (guestId === lorenId) continue;

      const daysAgo = 30 + i * 20 + stayCount * 7;
      const checkIn = pastDate(daysAgo + 4);
      const checkOut = pastDate(daysAgo);
      const rating = 3 + ((stayCount + i) % 3); // 3, 4, 5 rotation
      const ratingListing = Math.min(5, rating + ((i + stayCount) % 2));

      await ensureCompletedStay({
        listingId: l.id as string,
        hostId: l.host_id as string,
        guestId,
        checkIn,
        checkOut,
        guestRating: rating,
        hostRating: ratingListing,
        listingRating: ratingListing,
        guestReview: "Lovely guest, great communication.",
        hostReview: "Wonderful host, would stay again.",
        listingReview:
          "Photos matched exactly. Location and vibe were as described.",
      });
      stayCount++;
    }
  }
  console.log(`  ✓ ${stayCount} completed stays inserted / upserted`);

  // ── 5. Loren-specific reservations ───────────────────────────
  console.log("\nSeeding Loren's trips + hosted stays…");

  // 5a. Two completed trips (Loren as guest)
  const kaiListing = await supabase
    .from("listings")
    .select("id, host_id")
    .eq("host_id", ids.get("kai")!)
    .maybeSingle();
  if (kaiListing.data) {
    await ensureCompletedStay({
      listingId: kaiListing.data.id as string,
      hostId: kaiListing.data.host_id as string,
      guestId: lorenId,
      checkIn: pastDate(95),
      checkOut: pastDate(90),
      guestRating: 5,
      hostRating: 5,
      listingRating: 5,
      guestReview: "Loren was an ideal guest — thoughtful and tidy.",
      hostReview: "Kai's place is exactly as advertised. Felt like home.",
      listingReview: "Cliffside view is unreal at sunset. Would return.",
    });
  }
  const rosaListing = await supabase
    .from("listings")
    .select("id, host_id")
    .eq("host_id", ids.get("rosa")!)
    .maybeSingle();
  if (rosaListing.data) {
    await ensureCompletedStay({
      listingId: rosaListing.data.id as string,
      hostId: rosaListing.data.host_id as string,
      guestId: lorenId,
      checkIn: pastDate(140),
      checkOut: pastDate(133),
      guestRating: 5,
      hostRating: 5,
      listingRating: 4,
      guestReview: "Loren was lovely. Friendly, low-touch.",
      hostReview: "Rosa went above and beyond with dinner recs.",
      listingReview:
        "Quiet colonial street, high ceilings, solid wifi. Neighborhood felt real, not touristy.",
    });
  }

  // 5b. Upcoming trip (Loren as guest) — accepted contact_request
  const zaraListing = await supabase
    .from("listings")
    .select("id, host_id")
    .eq("host_id", ids.get("zara")!)
    .maybeSingle();
  if (zaraListing.data) {
    await ensureAcceptedRequest({
      listingId: zaraListing.data.id as string,
      hostId: zaraListing.data.host_id as string,
      guestId: lorenId,
      checkIn: futureDate(21),
      checkOut: futureDate(27),
      message:
        "Would love to stay end of next month — traveling with one other person.",
    });
  }

  // 5c. Two completed stays hosted BY Loren
  if (lorenListingA) {
    const nadia = ids.get("nadia");
    const marcoGuest = ids.get("marco");
    if (nadia) {
      await ensureCompletedStay({
        listingId: lorenListingA,
        hostId: lorenId,
        guestId: nadia,
        checkIn: pastDate(60),
        checkOut: pastDate(55),
        guestRating: 5,
        hostRating: 5,
        listingRating: 5,
        guestReview: "Nadia was a dream guest — communicative and respectful.",
        hostReview:
          "Loren's cabin is a reset button. Already planning the next trip.",
        listingReview:
          "Wood stove + outdoor tub was the entire point. Did not disappoint.",
      });
    }
    if (marcoGuest) {
      await ensureCompletedStay({
        listingId: lorenListingA,
        hostId: lorenId,
        guestId: marcoGuest,
        checkIn: pastDate(30),
        checkOut: pastDate(26),
        guestRating: 4,
        hostRating: 5,
        listingRating: 4,
        guestReview: "Marco was easy — left the place in great shape.",
        hostReview: "Everything handled smoothly, Loren made it effortless.",
        listingReview:
          "Beautiful spot. One note: the trailhead signage could be clearer.",
      });
    }
  }

  // 5d. Upcoming hosted stay (Loren as host, confirmed)
  if (lorenListingA) {
    const yukiGuest = ids.get("yuki");
    if (yukiGuest) {
      await ensureAcceptedRequest({
        listingId: lorenListingA,
        hostId: lorenId,
        guestId: yukiGuest,
        checkIn: futureDate(14),
        checkOut: futureDate(18),
        message:
          "Looking for a working retreat for a few days. Solo, no events.",
      });
    }
  }

  // 5e. Pending request on Loren's listing → shows in dashboard
  if (lorenListingB) {
    const eleanor = ids.get("elena"); // connector, strong relationship
    if (eleanor) {
      await ensurePendingRequest({
        listingId: lorenListingB,
        hostId: lorenId,
        guestId: eleanor,
        checkIn: futureDate(40),
        checkOut: futureDate(44),
        message:
          "Hosting a friend from out of town — would West Village work for 4 nights?",
      });
    }
  }

  // 5f. Currently-in-progress trip (Loren as guest). check_in past,
  // check_out future → shows as an active stay. No stay_confirmation
  // yet, so review flow hasn't started.
  const hanaListingRow = await supabase
    .from("listings")
    .select("id, host_id")
    .eq("host_id", ids.get("hana")!)
    .maybeSingle();
  if (hanaListingRow.data) {
    await ensureAcceptedRequest({
      listingId: hanaListingRow.data.id as string,
      hostId: hanaListingRow.data.host_id as string,
      guestId: lorenId,
      checkIn: pastDate(2),
      checkOut: futureDate(3),
      message:
        "Quick research trip. Solo, quiet days. Thanks for the flexibility on check-in.",
    });
  }

  // 5g. Currently-in-progress hosted stay (Loren as host). Guest
  // checked in yesterday, checks out in 2 days. Drives the "during
  // the stay" UI path for hosts.
  if (lorenListingA) {
    const theoGuest = ids.get("theo");
    if (theoGuest) {
      await ensureAcceptedRequest({
        listingId: lorenListingA,
        hostId: lorenId,
        guestId: theoGuest,
        checkIn: pastDate(1),
        checkOut: futureDate(2),
        message:
          "Writing weekend — plan to keep to myself, no events. Thanks again!",
      });
    }
  }

  // 5h. Just-ended trips (Loren as guest), NO stay_confirmation
  // yet. Surfaces the "leave a review" prompt. Two different hosts
  // so we can test the review flow twice.
  const sophieListingRow = await supabase
    .from("listings")
    .select("id, host_id")
    .eq("host_id", ids.get("sophie")!)
    .maybeSingle();
  if (sophieListingRow.data) {
    await ensureAcceptedRequest({
      listingId: sophieListingRow.data.id as string,
      hostId: sophieListingRow.data.host_id as string,
      guestId: lorenId,
      checkIn: pastDate(10),
      checkOut: pastDate(5),
      message: "Longer city trip. Traveling with one other person.",
    });
  }
  const diegoListingRow = await supabase
    .from("listings")
    .select("id, host_id")
    .eq("host_id", ids.get("diego")!)
    .maybeSingle();
  if (diegoListingRow.data) {
    await ensureAcceptedRequest({
      listingId: diegoListingRow.data.id as string,
      hostId: diegoListingRow.data.host_id as string,
      guestId: lorenId,
      checkIn: pastDate(20),
      checkOut: pastDate(17),
      message: "Quick visit. Solo traveller. Thanks!",
    });
  }

  // 5i. Just-ended hosted stays (Loren as host), no stay_confirmation
  // yet. Drives the host-side "leave a review" prompt.
  if (lorenListingA) {
    const ivyGuest = ids.get("ivy");
    if (ivyGuest) {
      await ensureAcceptedRequest({
        listingId: lorenListingA,
        hostId: lorenId,
        guestId: ivyGuest,
        checkIn: pastDate(8),
        checkOut: pastDate(3),
        message: "Heads-down research week. Solo.",
      });
    }
  }
  if (lorenListingB) {
    const cassidyGuest = ids.get("cassidy");
    if (cassidyGuest) {
      await ensureAcceptedRequest({
        listingId: lorenListingB,
        hostId: lorenId,
        guestId: cassidyGuest,
        checkIn: pastDate(14),
        checkOut: pastDate(10),
        message: "In town for a few days of studio sessions.",
      });
    }
  }

  // 5j. Additional pending requests on Loren's listings to exercise
  // the accept/decline UI. Mix of trust levels so the host cards
  // show a range of badges.
  if (lorenListingA) {
    const pavelGuest = ids.get("pavel"); // peripheral / weak
    if (pavelGuest) {
      await ensurePendingRequest({
        listingId: lorenListingA,
        hostId: lorenId,
        guestId: pavelGuest,
        checkIn: futureDate(60),
        checkOut: futureDate(66),
        message:
          "Hi! I saw your place through a mutual friend. Wondering if it's available early in the summer.",
      });
    }
  }
  if (lorenListingB) {
    const felixGuest = ids.get("felix");
    if (felixGuest) {
      await ensurePendingRequest({
        listingId: lorenListingB,
        hostId: lorenId,
        guestId: felixGuest,
        checkIn: futureDate(32),
        checkOut: futureDate(36),
        message:
          "Coming to NY for a shoot — would your place work for 4 nights mid-next-month?",
      });
    }
  }

  console.log(
    "  ✓ Loren trips / hosted stays / pending + in-progress + just-ended"
  );

  // ── 6. Recompute vouch power for everyone ────────────────────
  console.log("\nRecomputing vouch_power…");
  for (const id of ids.values()) {
    try {
      await supabase.rpc("calculate_vouch_power", { p_user_id: id });
    } catch {
      /* non-fatal */
    }
  }

  // Listing avg rating + review count are maintained by existing DB
  // triggers on stay_confirmations inserts. No manual recompute.

  console.log("\nDone.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
