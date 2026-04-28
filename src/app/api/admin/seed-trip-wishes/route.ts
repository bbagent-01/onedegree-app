export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { searchUnsplash } from "@/lib/unsplash";

/**
 * POST /api/admin/seed-trip-wishes
 *
 * CRON_SECRET-gated reseed for the alpha-c demo data set. Wipes every
 * existing trip_wish proposal, then inserts a curated set of 10 fresh
 * Trip Wishes — each populated with a real Unsplash photo + full
 * photographer attribution (production-tier compliant).
 *
 * This route exists so we can refresh the demo set without exposing
 * the Unsplash API key on a developer's laptop. The actual search +
 * cache hits go through the same `searchUnsplash` lib that the
 * /proposals/new ThumbnailPicker uses, so cache rows accrue normally.
 *
 * Curl:
 *   curl -sX POST https://alpha-c.onedegreebnb.com/api/admin/seed-trip-wishes \
 *     -H "x-cron-secret: $CRON_SECRET" | jq
 */

interface SeedSpec {
  authorKey: keyof typeof AUTHORS;
  title: string;
  description: string;
  destinations: string[];
  /** Search query handed to Unsplash. Picked separately from
   *  destinations so we can bias toward better visual matches
   *  (e.g. "Bali rice fields" instead of just "Bali"). */
  unsplashQuery: string;
  start_date?: string;
  end_date?: string;
  flexible_month?: string;
  guest_count: number;
}

const AUTHORS = {
  felix: "8da9ea54-ef83-4553-acf1-1f0f3899f1a7",
  ines: "4fe2ed7e-2a08-4a29-bb8e-d8b4d6eeb6ef",
  pavel: "8823e755-7fd3-4cbf-a69b-24522e199d1b",
  mei: "ea150c05-527d-4614-bece-86e45a4eeba4",
  bjorn: "58b45592-4e03-4e09-97d8-7ae35cc3ee4a",
  zara: "9d120808-f110-4b02-afa2-8b9e257ba8fe",
  loren: "d75cfbe8-0d0c-4014-bc19-af5c4e0621b1",
} as const;

const SEEDS: SeedSpec[] = [
  {
    authorKey: "ines",
    title: "Long weekend in Lisbon — late spring, two friends",
    description:
      "Looking for a calm neighborhood place with a kitchen and good morning light. Plan to walk a lot, drink a lot of coffee, and find one perfect tasca per day. Open to Alfama, Graça, or Príncipe Real.",
    destinations: ["Lisbon"],
    unsplashQuery: "lisbon portugal",
    start_date: "2026-05-08",
    end_date: "2026-05-12",
    guest_count: 2,
  },
  {
    authorKey: "felix",
    title: "Tokyo in November — solo writing trip",
    description:
      "Writing a short novel and want a quiet base in Tokyo for two weeks. Suburban or low-key neighborhoods preferred — Kichijoji, Shimokitazawa, anything with a long walking river. Light cooking, mostly out for meals.",
    destinations: ["Tokyo", "Kichijoji", "Shimokitazawa"],
    unsplashQuery: "tokyo japan night",
    start_date: "2026-11-02",
    end_date: "2026-11-15",
    guest_count: 1,
  },
  {
    authorKey: "pavel",
    title: "Family of four — Alps in August",
    description:
      "Two adults, two kids (8 + 11). Looking for a chalet within 30 minutes of trailheads, ideally with a small yard or garden. Bavarian Alps or Dolomites both fit. Two weeks, mid-August, flexible by a few days.",
    destinations: ["Bavarian Alps", "Dolomites"],
    unsplashQuery: "alps mountain village",
    flexible_month: "August 2026",
    guest_count: 4,
  },
  {
    authorKey: "mei",
    title: "Bali — three weeks, slow travel",
    description:
      "Coming off a long project and want to disappear into Bali for three weeks. Yoga in the morning, writing in the afternoon, somewhere green. Ubud preferred but Sidemen or Munduk equally welcome.",
    destinations: ["Ubud", "Sidemen", "Munduk"],
    unsplashQuery: "bali rice fields",
    flexible_month: "September 2026",
    guest_count: 1,
  },
  {
    authorKey: "zara",
    title: "Honeymoon — somewhere remote, off-grid OK",
    description:
      "Five-year honeymoon redux. Open to Iceland, Patagonia, the Faroe Islands — anywhere with dramatic landscape and no nightlife. Two weeks, dates flexible. Solar / off-grid totally fine, in fact preferred.",
    destinations: ["Iceland", "Patagonia", "Faroe Islands"],
    unsplashQuery: "iceland landscape",
    start_date: "2026-09-15",
    end_date: "2026-09-29",
    guest_count: 2,
  },
  {
    authorKey: "bjorn",
    title: "Mexico City — food crawl, four nights",
    description:
      "Doing the long taquería tour. Want a base in Roma Norte or Condesa, walking distance to good coffee in the morning. Two of us, no kids, willing to pay for the right spot.",
    destinations: ["Mexico City", "Roma Norte", "Condesa"],
    unsplashQuery: "mexico city street",
    start_date: "2026-06-04",
    end_date: "2026-06-08",
    guest_count: 2,
  },
  {
    authorKey: "felix",
    title: "Marrakech medina — a slow week of cooking",
    description:
      "Want to take a real cooking class — not the touristy one — and settle into a riad for a week. Open to traveling outside Marrakech for the food too. Guides + recommendations welcome.",
    destinations: ["Marrakech"],
    unsplashQuery: "marrakech morocco",
    flexible_month: "March 2026",
    guest_count: 2,
  },
  {
    authorKey: "ines",
    title: "Santorini — two-week reset, off-season",
    description:
      "Looking to go in the shoulder months (March or April) when the cliffs are quiet. Don't need a hotel pool — would much rather have a kitchen, a sea view, and a 10-minute walk to a bakery.",
    destinations: ["Santorini"],
    unsplashQuery: "santorini greece",
    flexible_month: "April 2026",
    guest_count: 2,
  },
  {
    authorKey: "mei",
    title: "Kyoto in cherry blossom season — flexible",
    description:
      "Knowing it's the busiest week of the year. Will travel any time April 1–15, two of us. Quiet residential neighborhood preferred — happy to bus into the temples instead of staying right next to them.",
    destinations: ["Kyoto"],
    unsplashQuery: "kyoto cherry blossom",
    start_date: "2026-04-01",
    end_date: "2026-04-15",
    guest_count: 2,
  },
  {
    authorKey: "pavel",
    title: "Banff in early winter — ski-touring crew of six",
    description:
      "Six skiers (five experienced, one beginner). Looking for a chalet with hot water + parking near a ski-touring trailhead. Mid-November to early-December — happy to time it with first snow.",
    destinations: ["Banff", "Canmore"],
    unsplashQuery: "banff canada winter",
    flexible_month: "November 2026",
    guest_count: 6,
  },
];

async function handle(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return Response.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 }
    );
  }
  if (req.headers.get("x-cron-secret") !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Step 1: wipe existing trip_wish proposals.
  const { data: deleted, error: delErr } = await supabase
    .from("proposals")
    .delete()
    .eq("kind", "trip_wish")
    .select("id");
  if (delErr) {
    console.error("[seed-trip-wishes] delete failed", delErr);
    return Response.json(
      { error: "delete failed", message: delErr.message },
      { status: 500 }
    );
  }

  // Step 2: build new rows with real Unsplash attribution.
  const rows: Record<string, unknown>[] = [];
  const skipped: { title: string; reason: string }[] = [];
  for (const s of SEEDS) {
    const { photos } = await searchUnsplash(s.unsplashQuery);
    const photo = photos[0];
    if (!photo) {
      skipped.push({ title: s.title, reason: "no photos for query" });
      continue;
    }
    rows.push({
      author_id: AUTHORS[s.authorKey],
      kind: "trip_wish",
      title: s.title,
      description: s.description,
      destinations: s.destinations,
      start_date: s.start_date ?? null,
      end_date: s.end_date ?? null,
      flexible_month: s.flexible_month ?? null,
      guest_count: s.guest_count,
      visibility_mode: "inherit",
      status: "active",
      thumbnail_url: photo.url,
      thumbnail_source: "unsplash_picked",
      thumbnail_attribution: {
        photographer_name: photo.photographer_name,
        photographer_url: photo.photographer_url,
        unsplash_url: photo.unsplash_url,
        download_location: photo.download_location,
        photo_id: photo.id,
      },
    });
  }

  if (rows.length === 0) {
    return Response.json(
      { error: "no rows to insert", skipped, deleted: deleted?.length ?? 0 },
      { status: 500 }
    );
  }

  const { data: inserted, error: insErr } = await supabase
    .from("proposals")
    .insert(rows)
    .select("id, title");
  if (insErr) {
    console.error("[seed-trip-wishes] insert failed", insErr);
    return Response.json(
      { error: "insert failed", message: insErr.message },
      { status: 500 }
    );
  }

  return Response.json({
    deleted: deleted?.length ?? 0,
    inserted: inserted?.length ?? 0,
    rows: inserted,
    skipped,
  });
}

export async function POST(req: Request) {
  return handle(req);
}
export async function GET(req: Request) {
  return handle(req);
}
