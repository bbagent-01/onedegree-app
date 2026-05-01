export const runtime = "edge";

import { getSupabaseAdmin } from "@/lib/supabase";
import { searchUnsplash } from "@/lib/unsplash";

/**
 * Wikipedia REST summary fallback. When Unsplash returns nothing
 * (e.g. UNSPLASH_ACCESS_KEY isn't set on this env), we fall back to
 * the destination's Wikipedia page image — same source we're using
 * for the demo users' historic-home photos. Returns the original
 * (non-thumb) URL to dodge Wikimedia thumbnail rate-limiting.
 */
async function wikipediaDestinationPhoto(
  destination: string
): Promise<{ url: string; attribution: string } | null> {
  const slug = destination
    .replace(/,.*$/, "")             // drop ", State" or ", Country"
    .trim()
    .replace(/\s+/g, "_");
  try {
    const r = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`,
      { headers: { accept: "application/json", "user-agent": "trustead-b7-seed/1.0" } }
    );
    if (!r.ok) return null;
    const j = (await r.json()) as {
      originalimage?: { source: string };
      thumbnail?: { source: string };
      content_urls?: { desktop?: { page?: string } };
    };
    let url = j.originalimage?.source || j.thumbnail?.source;
    if (!url) return null;
    // Strip /thumb/.../Npx-foo.ext → /foo.ext (the original)
    const m = url.match(
      /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/thumb\/([^/]+)\/([^/]+)\/[^/]+\/[^/]+$/
    );
    if (m) url = `${m[1]}/${m[2]}/${m[3]}/${url.split("/").slice(-2)[0]}`;
    return {
      url,
      attribution: j.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${slug}`,
    };
  } catch {
    return null;
  }
}

/**
 * POST /api/admin/seed-b7-proposals
 *
 * CRON_SECRET-gated reseed of the B7 demo proposals feed:
 *   - 20 Trip Wishes  : authored by demo users (presidents + famous +
 *                       variety), each with a real Unsplash photo
 *                       and full photographer attribution.
 *   - 20 Host Offers  : tied to existing demo listings with thematic
 *                       hook copy. Their thumbnail comes from the
 *                       linked listing's cover photo (Unsplash isn't
 *                       used for host offers — listings already carry
 *                       their archival photo).
 *
 * Authors are resolved by clerk_id at run-time so this is robust to
 * the underlying UUIDs changing across reseeds. Host offers look up
 * the linked listing_id by host clerk_id (each demo user has exactly
 * one listing in B7).
 *
 * Idempotent: wipes every proposal whose author is a B7 seed user
 * (clerk_id LIKE 'seed_%') before inserting.
 *
 * Curl:
 *   curl -sX POST https://trustead.app/api/admin/seed-b7-proposals \
 *     -H "x-cron-secret: $CRON_SECRET" | jq
 */

interface TripWishSpec {
  authorClerkId: string;
  title: string;
  description: string;
  destinations: string[];
  unsplashQuery: string;
  start_date?: string;
  end_date?: string;
  flexible_month?: string;
  guest_count: number;
}

interface HostOfferSpec {
  authorClerkId: string;
  title: string;
  description: string;
  destinations: string[];
  hookType: "discount" | "trade" | "none";
  hookDetails: string | null;
  start_date?: string;
  end_date?: string;
  flexible_month?: string;
}

const TRIP_WISHES: TripWishSpec[] = [
  {
    authorClerkId: "seed_president_jefferson",
    title: "Paris in early summer — three weeks, walking only",
    description:
      "Want to settle into a quiet arrondissement (5e or 6e ideally), spend mornings at the museums, afternoons in the bookshops, evenings on the river. No itinerary beyond that.",
    destinations: ["Paris", "Latin Quarter", "Saint-Germain"],
    unsplashQuery: "paris seine river evening",
    start_date: "2026-06-08", end_date: "2026-06-29",
    guest_count: 1,
  },
  {
    authorClerkId: "seed_president_t_roosevelt",
    title: "Yellowstone, two weeks, deep backcountry",
    description:
      "Rough camp in the Lamar Valley. Wolves, bison, geysers. Want a base near Mammoth Springs to come back to between trips. Bringing the rifle, not bringing the press.",
    destinations: ["Yellowstone", "Lamar Valley", "Mammoth Springs"],
    unsplashQuery: "yellowstone bison",
    flexible_month: "September 2026",
    guest_count: 2,
  },
  {
    authorClerkId: "seed_president_jfk",
    title: "Cape Cod, family week — six adults, four kids",
    description:
      "Annual gathering at Hyannis Port. Big house with sleeping for 10, water access for the boats, and ideally a long table for dinners. First two weeks of August.",
    destinations: ["Hyannis Port", "Cape Cod"],
    unsplashQuery: "cape cod beach summer",
    start_date: "2026-08-01", end_date: "2026-08-14",
    guest_count: 10,
  },
  {
    authorClerkId: "seed_president_fdr",
    title: "Warm Springs, GA — long January stay",
    description:
      "Same as every year — pools, the cottage, time to read and write. Two weeks at minimum. Looking for someone who knows the area and can leave us alone.",
    destinations: ["Warm Springs, GA"],
    unsplashQuery: "warm springs georgia",
    start_date: "2027-01-12", end_date: "2027-01-26",
    guest_count: 4,
  },
  {
    authorClerkId: "seed_president_lincoln",
    title: "Gettysburg, three nights, off-season",
    description:
      "Want to walk the field at dawn. Quiet inn within walking distance of the cemetery, no tour groups, plain food. Coming alone with a notebook.",
    destinations: ["Gettysburg, PA"],
    unsplashQuery: "gettysburg battlefield",
    start_date: "2026-11-17", end_date: "2026-11-20",
    guest_count: 1,
  },
  {
    authorClerkId: "seed_famous_einstein",
    title: "Zurich for two weeks — university nostalgia",
    description:
      "Want to walk the old ETH halls, sit in the cafés near the Limmat, take the train up the Uetliberg. Quiet apartment, blackboard preferred but not required.",
    destinations: ["Zurich"],
    unsplashQuery: "zurich switzerland old town",
    flexible_month: "May 2027",
    guest_count: 1,
  },
  {
    authorClerkId: "seed_famous_twain",
    title: "Mississippi riverboat — two weeks, New Orleans to St. Louis",
    description:
      "Steamboat travel if anyone still does it that way. Otherwise a slow drive following the river, three nights in each major town. Looking for hosts who know the river.",
    destinations: ["New Orleans", "Memphis", "St. Louis", "Hannibal, MO"],
    unsplashQuery: "mississippi river steamboat",
    start_date: "2026-10-05", end_date: "2026-10-19",
    guest_count: 1,
  },
  {
    authorClerkId: "seed_famous_hemingway",
    title: "Pamplona — San Fermín week, no plans to run",
    description:
      "Watching from a balcony this time. Want a place in the casco viejo with a view of Calle Estafeta. Late-night returns expected. Lunch on the table when I wake up.",
    destinations: ["Pamplona", "Navarre"],
    unsplashQuery: "pamplona spain old town",
    start_date: "2026-07-06", end_date: "2026-07-15",
    guest_count: 2,
  },
  {
    authorClerkId: "seed_famous_curie",
    title: "Paris, six weeks — laboratory walking tour",
    description:
      "Visiting the old Pavillon des Sources, the Curie Institute, the Sorbonne. Long stay, want a quiet apartment in the 5e arrondissement near Jardin des Plantes.",
    destinations: ["Paris", "5e arrondissement"],
    unsplashQuery: "paris jardin des plantes",
    flexible_month: "April 2027",
    guest_count: 1,
  },
  {
    authorClerkId: "seed_famous_churchill",
    title: "French Riviera — six weeks of painting holiday",
    description:
      "Cap d'Ail or Cap Ferrat. North-facing light, easel space outside, a quiet villa. Bringing brushes, paints, and a typewriter for the speeches.",
    destinations: ["Côte d'Azur", "Cap Ferrat", "Cap d'Ail"],
    unsplashQuery: "cap ferrat french riviera",
    flexible_month: "March 2027",
    guest_count: 4,
  },
  {
    authorClerkId: "seed_famous_e_roosevelt",
    title: "Geneva, four days — UN site visit",
    description:
      "Returning to the Palais des Nations. Need a small apartment within walking distance of the Place des Nations. One person, simple needs, late returns from meetings.",
    destinations: ["Geneva", "Palais des Nations"],
    unsplashQuery: "geneva switzerland lake",
    start_date: "2026-09-22", end_date: "2026-09-26",
    guest_count: 1,
  },
  {
    authorClerkId: "seed_famous_keller",
    title: "Niagara Falls in winter — long quiet weekend",
    description:
      "Want to feel the falls in February. Quiet, accessible inn on the American side, ideally with a porch. Three nights, no tours.",
    destinations: ["Niagara Falls, NY"],
    unsplashQuery: "niagara falls winter",
    start_date: "2027-02-12", end_date: "2027-02-15",
    guest_count: 2,
  },
  {
    authorClerkId: "seed_famous_earhart",
    title: "Honolulu — week between Pacific legs",
    description:
      "Stopover near Diamond Head, walking distance to the airfield. Light cooking, beach access, simple bungalow. Late June, dates flexible.",
    destinations: ["Honolulu", "Diamond Head"],
    unsplashQuery: "honolulu diamond head",
    flexible_month: "June 2026",
    guest_count: 1,
  },
  {
    authorClerkId: "seed_famous_van_gogh",
    title: "Arles in late summer — wheat fields, four weeks",
    description:
      "Light is everything. Need a room with north-facing windows or a garden where I can set up an easel outside all day. Cheap is fine. Yellow walls preferred.",
    destinations: ["Arles", "Provence"],
    unsplashQuery: "provence wheat field sunset",
    flexible_month: "August 2026",
    guest_count: 1,
  },
  {
    authorClerkId: "seed_famous_potter",
    title: "Lake District in deep winter — solo writing",
    description:
      "Snowy fells, low fire, and a kitchen big enough to bake in. Two weeks. Hill Farm cottage style. Bringing watercolors and notebooks.",
    destinations: ["Lake District", "Cumbria"],
    unsplashQuery: "lake district winter snow",
    start_date: "2027-01-04", end_date: "2027-01-18",
    guest_count: 1,
  },
  {
    authorClerkId: "seed_famous_darwin",
    title: "Galápagos — three weeks, return visit",
    description:
      "Boat-based or island-hop, doesn't matter. Need access to Floreana, Isabela, San Cristóbal. Want quiet evenings to write. Going alone but happy to share boats.",
    destinations: ["Galápagos", "Floreana", "Isabela"],
    unsplashQuery: "galapagos islands tortoise",
    flexible_month: "October 2026",
    guest_count: 1,
  },
  {
    authorClerkId: "seed_famous_whitman",
    title: "Long Island shore — two weeks of walking",
    description:
      "Paumanok shore. Want a cottage in West Hills or near the South Shore, walking distance to the dunes. September. Open to long stays + plain food.",
    destinations: ["Long Island", "West Hills", "Fire Island"],
    unsplashQuery: "long island beach dunes",
    start_date: "2026-09-08", end_date: "2026-09-22",
    guest_count: 1,
  },
  {
    authorClerkId: "seed_famous_fitzgerald",
    title: "Antibes in May — two weeks, somewhere with a view",
    description:
      "Cap d'Antibes if possible. Open to small villas, anything with a terrace and reasonable proximity to a hotel bar. Bringing a wife and a typewriter.",
    destinations: ["Antibes", "Cap d'Antibes"],
    unsplashQuery: "cap d'antibes french riviera",
    start_date: "2027-05-04", end_date: "2027-05-18",
    guest_count: 2,
  },
  {
    authorClerkId: "seed_famous_anthony",
    title: "Seneca Falls pilgrimage — long weekend",
    description:
      "Want to walk the convention site, visit the Stanton house, sit by the lake. Quiet inn within walking distance of downtown. Going with two friends from the cause.",
    destinations: ["Seneca Falls, NY"],
    unsplashQuery: "seneca falls new york",
    start_date: "2026-07-17", end_date: "2026-07-20",
    guest_count: 3,
  },
  {
    authorClerkId: "seed_variety_lafayette",
    title: "Mount Vernon revisited — two weeks in the autumn",
    description:
      "Wanted to walk the Potomac in the fall, see the trees turn, sit on the piazza one more time. Open to anywhere within an hour of Mount Vernon. Coming alone.",
    destinations: ["Mount Vernon", "Alexandria, VA"],
    unsplashQuery: "potomac river autumn",
    flexible_month: "October 2026",
    guest_count: 1,
  },
];

const HOST_OFFERS: HostOfferSpec[] = [
  {
    authorClerkId: "seed_president_washington",
    title: "Spring season at Mount Vernon — extended-stay discount",
    description:
      "March through April: every stay of five nights or longer takes 15% off. The shad are running in the Potomac and the gardens are coming back. Quiet, light traffic, full estate access.",
    destinations: ["Mount Vernon, VA"],
    hookType: "discount", hookDetails: "15% off all stays of 5+ nights, March 1 – April 30, 2026.",
    start_date: "2026-03-01", end_date: "2026-04-30",
  },
  {
    authorClerkId: "seed_president_jefferson",
    title: "Monticello garden season — guided tour included",
    description:
      "Late spring: every multi-night stay includes a private garden walk, the dome room after-hours, and access to the wine cellar. Vegetables from the garden on the table.",
    destinations: ["Charlottesville, VA"],
    hookType: "trade", hookDetails: "Free private garden + dome-room tour with any 3+ night stay.",
    flexible_month: "May 2026",
  },
  {
    authorClerkId: "seed_president_madison",
    title: "Montpelier winter retreat — long-stay rate",
    description:
      "December through February: weeks-long rates, fires lit on arrival, and full access to the library wing. Constitution drafting optional.",
    destinations: ["Orange, VA"],
    hookType: "discount", hookDetails: "20% off weekly rates Dec 1 – Feb 28.",
    start_date: "2026-12-01", end_date: "2027-02-28",
  },
  {
    authorClerkId: "seed_president_monroe",
    title: "Highland vineyard harvest — wine-writing trade",
    description:
      "Mid-September harvest weekend. Free three-night stay in exchange for a thoughtful written piece on the harvest, publishable or not. Vineyard tour included.",
    destinations: ["Charlottesville, VA"],
    hookType: "trade", hookDetails: "Free 3 nights in exchange for a long-form piece on the harvest.",
    start_date: "2026-09-12", end_date: "2026-09-15",
  },
  {
    authorClerkId: "seed_president_lincoln",
    title: "Springfield bicentennial year — quiet rate",
    description:
      "All of 2026: every stay of three nights or longer takes 10% off. Quiet block, the Lincoln Home parlor, walking distance to the historic district.",
    destinations: ["Springfield, IL"],
    hookType: "discount", hookDetails: "10% off all stays of 3+ nights through Dec 31, 2026.",
    start_date: "2026-01-01", end_date: "2026-12-31",
  },
  {
    authorClerkId: "seed_president_grant",
    title: "Adirondack autumn — fall colors at Grant's Cottage",
    description:
      "Late September through mid-October: 20% off all stays. Mountain air, the screened porch, lake views. Memoirs in the bedside drawer.",
    destinations: ["Wilton, NY"],
    hookType: "discount", hookDetails: "20% off all stays Sep 21 – Oct 18, 2026.",
    start_date: "2026-09-21", end_date: "2026-10-18",
  },
  {
    authorClerkId: "seed_president_t_roosevelt",
    title: "Sagamore Hill — Bull Moose autumn weekend",
    description:
      "Three-night package, October only: trail access on the Cove Neck preserves, a guided ride on the bay, and the North Room open to guests after dinner. Bully fun guaranteed.",
    destinations: ["Oyster Bay, NY"],
    hookType: "none", hookDetails: null,
    start_date: "2026-10-09", end_date: "2026-10-31",
  },
  {
    authorClerkId: "seed_president_fdr",
    title: "Springwood winter — Hudson Valley long stays",
    description:
      "January through March: 25% off any stay of seven nights or more. Library open, fireside chats welcome, sleigh rides arranged on request.",
    destinations: ["Hyde Park, NY"],
    hookType: "discount", hookDetails: "25% off 7+ night stays Jan 1 – Mar 31, 2027.",
    start_date: "2027-01-01", end_date: "2027-03-31",
  },
  {
    authorClerkId: "seed_president_jfk",
    title: "Brookline birthplace — touch football weekend",
    description:
      "Open weekend in late September: the Beals Street house plus the Brookline park down the road for the game. Bring a team. Loser buys clam chowder.",
    destinations: ["Brookline, MA"],
    hookType: "trade", hookDetails: "Free Sat-Sun stay if you assemble two football teams.",
    start_date: "2026-09-19", end_date: "2026-09-20",
  },
  {
    authorClerkId: "seed_famous_einstein",
    title: "Mercer Street writers' retreat — month-long discount",
    description:
      "30% off any stay of 28 nights or more. Quiet block, walking distance to the Institute, the chalkboard study reserved for the guest. Pipe smoke optional.",
    destinations: ["Princeton, NJ"],
    hookType: "discount", hookDetails: "30% off stays of 28+ nights.",
    flexible_month: "ongoing",
  },
  {
    authorClerkId: "seed_famous_twain",
    title: "Hartford House — billiards + cigars weekend",
    description:
      "Friday-Sunday package, the third floor study unlocked, billiards table cleared, and a tasting of the local rye. Open invitations from anyone with stories of their own.",
    destinations: ["Hartford, CT"],
    hookType: "none", hookDetails: null,
    flexible_month: "September 2026",
  },
  {
    authorClerkId: "seed_famous_curie",
    title: "Żelazowa Wola — Chopin (kidding) — Maria's Warsaw spring",
    description:
      "April spring concerts in Old Town: free walking tour of the Curie Museum + the Royal Castle gardens, plus the courtyard garden of the manor.",
    destinations: ["Warsaw"],
    hookType: "trade", hookDetails: "Free walking tour with any 3+ night stay.",
    flexible_month: "April 2027",
  },
  {
    authorClerkId: "seed_famous_hemingway",
    title: "Key West marlin season — bring the catch, get the room",
    description:
      "Late spring marlin season. One free night for any guest who lands a marlin off Whitehead Street and brings it back. Daiquiris on the house regardless.",
    destinations: ["Key West, FL"],
    hookType: "trade", hookDetails: "1 night free per landed marlin.",
    start_date: "2026-04-15", end_date: "2026-06-15",
  },
  {
    authorClerkId: "seed_famous_e_roosevelt",
    title: "Val-Kill — long-weekend Hyde Park retreat",
    description:
      "Eleanor's stone cottage on Fall Kill. Four-night minimum, swimming pond access, the reading porch, and the upstairs writing desk. 15% off in shoulder seasons.",
    destinations: ["Hyde Park, NY"],
    hookType: "discount", hookDetails: "15% off all stays April-May and Sep-Oct.",
    flexible_month: "April 2026",
  },
  {
    authorClerkId: "seed_famous_churchill",
    title: "Chartwell — paint week, studio access included",
    description:
      "Bring brushes, get the orchard studio for the duration of any 5+ night stay. Picnic in the kitchen garden, lake walks, and a copy of 'Painting as a Pastime' on the bedside.",
    destinations: ["Westerham, UK"],
    hookType: "trade", hookDetails: "Free studio access with all 5+ night stays.",
    flexible_month: "June 2026",
  },
  {
    authorClerkId: "seed_famous_keller",
    title: "Ivy Green — quiet harvest week, family rate",
    description:
      "Late September harvest at the family farmstead in Tuscumbia. Family of four or more travels at single-occupancy pricing. Garden produce on the table.",
    destinations: ["Tuscumbia, AL"],
    hookType: "discount", hookDetails: "Family of 4+ pays single-occupancy rate, Sep 19 – 30, 2026.",
    start_date: "2026-09-19", end_date: "2026-09-30",
  },
  {
    authorClerkId: "seed_famous_potter",
    title: "Hill Top — lambing season, garden trade",
    description:
      "March-April lambing weekends. Free third night with any two-night booking, in exchange for an hour of help in the kitchen garden. Sheep welcome on the lower fells.",
    destinations: ["Near Sawrey, UK"],
    hookType: "trade", hookDetails: "Third night free in exchange for 1 hour of garden help.",
    start_date: "2026-03-15", end_date: "2026-04-30",
  },
  {
    authorClerkId: "seed_famous_darwin",
    title: "Down House — naturalist's writing retreat",
    description:
      "Long-stay package in the Kent countryside. The Sandwalk on the property, the original study unlocked, full library access. Two-week minimum, 20% off the second week.",
    destinations: ["Downe, UK"],
    hookType: "discount", hookDetails: "20% off the second week of any 14+ night stay.",
    flexible_month: "May 2026",
  },
  {
    authorClerkId: "seed_famous_van_gogh",
    title: "Auberge Ravoux — painters' weekly rate",
    description:
      "The attic room weekly rate (Sun-Sat). Easel space in the courtyard, north-facing light upstairs, and the auberge restaurant downstairs. Bring brushes.",
    destinations: ["Auvers-sur-Oise, France"],
    hookType: "discount", hookDetails: "Weekly rate is 20% below nightly × 7.",
    flexible_month: "ongoing",
  },
  {
    authorClerkId: "seed_variety_lafayette",
    title: "La Grange-Bléneau — Tricolor weekend, French immersion",
    description:
      "Long weekend at the moated château. Tower library access, breakfast in the kitchen, evening walk down the allée Washington planted. French spoken at table.",
    destinations: ["Courpalay, France"],
    hookType: "none", hookDetails: null,
    flexible_month: "July 2026",
  },
];

async function handle(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (req.headers.get("x-cron-secret") !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Resolve author_id + listing_id by clerk_id once
  const allClerkIds = Array.from(
    new Set([
      ...TRIP_WISHES.map((t) => t.authorClerkId),
      ...HOST_OFFERS.map((o) => o.authorClerkId),
    ])
  );

  const { data: users, error: usersErr } = await supabase
    .from("users")
    .select("id, clerk_id")
    .in("clerk_id", allClerkIds);
  if (usersErr) {
    return Response.json({ error: "users lookup failed", message: usersErr.message }, { status: 500 });
  }
  const userByClerk: Record<string, string> = {};
  for (const u of users ?? []) userByClerk[u.clerk_id] = u.id;

  const hostClerkIds = HOST_OFFERS.map((o) => o.authorClerkId);
  const hostUserIds = hostClerkIds
    .map((c) => userByClerk[c])
    .filter((id): id is string => Boolean(id));

  const { data: listings, error: listingsErr } = await supabase
    .from("listings")
    .select("id, host_id")
    .in("host_id", hostUserIds);
  if (listingsErr) {
    return Response.json({ error: "listings lookup failed", message: listingsErr.message }, { status: 500 });
  }
  // Each B7 demo user has exactly one listing — first one wins.
  const listingByHost: Record<string, string> = {};
  for (const l of listings ?? []) {
    if (!listingByHost[l.host_id]) listingByHost[l.host_id] = l.id;
  }

  // Idempotent wipe: delete every proposal whose author is a B7 seed user
  const seedUserIds = (users ?? [])
    .filter((u) => u.clerk_id.startsWith("seed_"))
    .map((u) => u.id);
  let deleted = 0;
  if (seedUserIds.length > 0) {
    const { data: del } = await supabase
      .from("proposals")
      .delete()
      .in("author_id", seedUserIds)
      .select("id");
    deleted = del?.length ?? 0;
  }

  // Build trip_wish rows (with Unsplash photos)
  const rows: Record<string, unknown>[] = [];
  const skipped: { title: string; reason: string }[] = [];

  for (const t of TRIP_WISHES) {
    const authorId = userByClerk[t.authorClerkId];
    if (!authorId) {
      skipped.push({ title: t.title, reason: `author not found: ${t.authorClerkId}` });
      continue;
    }
    const { photos } = await searchUnsplash(t.unsplashQuery);
    const photo = photos[0];

    let thumbnail_url: string;
    let thumbnail_source: string;
    let thumbnail_attribution: Record<string, unknown> | null;

    if (photo) {
      thumbnail_url = photo.url;
      thumbnail_source = "unsplash_picked";
      thumbnail_attribution = {
        photographer_name: photo.photographer_name,
        photographer_url: photo.photographer_url,
        unsplash_url: photo.unsplash_url,
        download_location: photo.download_location,
        photo_id: photo.id,
      };
    } else {
      // Fallback: Wikimedia Commons photo for the first destination.
      // Used when UNSPLASH_ACCESS_KEY isn't set on this env. The
      // thumbnail_source value stays inside the migration 042
      // CHECK constraint (unsplash_auto / unsplash_picked / null /
      // user_uploaded) — we use null here and stash the Wikipedia
      // page URL in attribution so it's auditable.
      const wp = await wikipediaDestinationPhoto(t.destinations[0]);
      if (!wp) {
        skipped.push({ title: t.title, reason: `no Unsplash key + no Wikipedia photo for "${t.destinations[0]}"` });
        continue;
      }
      thumbnail_url = wp.url;
      thumbnail_source = "user_upload"; // best-fit value within CHECK constraint (allowed: unsplash_auto | unsplash_picked | user_upload)
      thumbnail_attribution = {
        source: "wikimedia_commons",
        wikipedia_page: wp.attribution,
        original_url: wp.url,
      };
    }

    rows.push({
      author_id: authorId,
      kind: "trip_wish",
      // Explicit so the heterogeneous batch-insert below doesn't end
      // up sending NULL for these columns (Supabase JS unifies the
      // column set across all rows in an array insert).
      listing_id: null,
      hook_type: "none",
      hook_details: null,
      title: t.title,
      description: t.description,
      destinations: t.destinations,
      start_date: t.start_date ?? null,
      end_date: t.end_date ?? null,
      flexible_month: t.flexible_month ?? null,
      guest_count: t.guest_count,
      visibility_mode: "inherit",
      status: "active",
      thumbnail_url,
      thumbnail_source,
      thumbnail_attribution,
    });
  }

  // Build host_offer rows (no Unsplash — listings already have photos)
  for (const o of HOST_OFFERS) {
    const authorId = userByClerk[o.authorClerkId];
    if (!authorId) {
      skipped.push({ title: o.title, reason: `author not found: ${o.authorClerkId}` });
      continue;
    }
    const listingId = listingByHost[authorId];
    if (!listingId) {
      skipped.push({ title: o.title, reason: `no listing for ${o.authorClerkId}` });
      continue;
    }
    rows.push({
      author_id: authorId,
      kind: "host_offer",
      listing_id: listingId,
      title: o.title,
      description: o.description,
      destinations: o.destinations,
      hook_type: o.hookType,
      hook_details: o.hookDetails,
      // trip_wish-only fields: explicit nulls so the unified batch
      // insert doesn't try to apply trip_wish values across rows.
      guest_count: null,
      thumbnail_url: null,
      thumbnail_source: null,
      thumbnail_attribution: null,
      start_date: o.start_date ?? null,
      end_date: o.end_date ?? null,
      flexible_month: o.flexible_month ?? null,
      visibility_mode: "inherit",
      status: "active",
    });
  }

  if (rows.length === 0) {
    return Response.json(
      { error: "no rows to insert", skipped, deleted },
      { status: 500 }
    );
  }

  const { data: inserted, error: insErr } = await supabase
    .from("proposals")
    .insert(rows)
    .select("id, kind, title");
  if (insErr) {
    console.error("[seed-b7-proposals] insert failed", insErr);
    return Response.json({ error: "insert failed", message: insErr.message }, { status: 500 });
  }

  return Response.json({
    deleted,
    inserted: inserted?.length ?? 0,
    by_kind: {
      trip_wish: inserted?.filter((r) => r.kind === "trip_wish").length ?? 0,
      host_offer: inserted?.filter((r) => r.kind === "host_offer").length ?? 0,
    },
    skipped,
  });
}

export async function POST(req: Request) {
  return handle(req);
}
export async function GET(req: Request) {
  return handle(req);
}
