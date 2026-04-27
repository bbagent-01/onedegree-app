/**
 * Wipes every existing trip_wish proposal and re-seeds 10 varied ones,
 * each carrying a real Unsplash CDN photo.
 *
 *   Usage:  node --env-file=.env.local scripts/reseed-trip-wishes.mjs
 *
 * Variations covered:
 *   - destinations (1, 2, 3-tag mixes)
 *   - date specs (concrete range / flexible_month / no dates)
 *   - guest counts 1..6
 *   - title + description voice
 *   - authors spread across our seeded persona users + the real test
 *     account (loren polster) so the impersonation switcher can land
 *     on any of them.
 *
 * thumbnail_source is set to 'unsplash_auto' with no attribution blob,
 * which routes the card to the generic "Destination photo · Unsplash"
 * credit (production-tier compliant — credits Unsplash without
 * fabricating a photographer name).
 */

import { readFileSync } from "node:fs";

// ---- env load -----------------------------------------------------
const envText = readFileSync(
  new URL("../.env.local", import.meta.url),
  "utf8"
);
for (const line of envText.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const i = t.indexOf("=");
  process.env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, "");
}
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_KEY) throw new Error("Missing Supabase env vars");
const H = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const AUTHORS = {
  felix: "8da9ea54-ef83-4553-acf1-1f0f3899f1a7",
  ines: "4fe2ed7e-2a08-4a29-bb8e-d8b4d6eeb6ef",
  pavel: "8823e755-7fd3-4cbf-a69b-24522e199d1b",
  mei: "ea150c05-527d-4614-bece-86e45a4eeba4",
  bjorn: "58b45592-4e03-4e09-97d8-7ae35cc3ee4a",
  zara: "9d120808-f110-4b02-afa2-8b9e257ba8fe",
  loren: "d75cfbe8-0d0c-4014-bc19-af5c4e0621b1",
};

// Photo URLs — direct Unsplash CDN. All are publicly hotlinkable;
// width-capped at 1200 + auto-format for sane bandwidth. Picked for
// destination relevance + visual variety (urban / coastal / desert /
// mountain / tropical / food).
const photo = (id) =>
  `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop&crop=entropy`;

const PROPOSALS = [
  {
    author: AUTHORS.ines,
    title: "Long weekend in Lisbon — late spring, two friends",
    description:
      "Looking for a calm neighborhood place with a kitchen and good morning light. Plan to walk a lot, drink a lot of coffee, and find one perfect tasca per day. Open to Alfama, Graça, or Príncipe Real.",
    destinations: ["Lisbon"],
    start_date: "2026-05-08",
    end_date: "2026-05-12",
    guest_count: 2,
    photo: "1555881400-74d7acaacd8b",
  },
  {
    author: AUTHORS.felix,
    title: "Tokyo in November — solo writing trip",
    description:
      "Writing a short novel and want a quiet base in Tokyo for two weeks. Suburban or low-key neighborhoods preferred — Kichijoji, Shimokitazawa, anything with a long walking river. Light cooking, mostly out for meals.",
    destinations: ["Tokyo", "Kichijoji", "Shimokitazawa"],
    start_date: "2026-11-02",
    end_date: "2026-11-15",
    guest_count: 1,
    photo: "1542051841857-5f90071e7989",
  },
  {
    author: AUTHORS.pavel,
    title: "Family of four — Alps in August",
    description:
      "Two adults, two kids (8 + 11). Looking for a chalet within 30 minutes of trailheads, ideally with a small yard or garden. Bavarian Alps or Dolomites both fit. Two weeks, mid-August, flexible by a few days.",
    destinations: ["Bavarian Alps", "Dolomites"],
    flexible_month: "August 2026",
    guest_count: 4,
    photo: "1469474968028-56623f02e42e",
  },
  {
    author: AUTHORS.mei,
    title: "Bali — three weeks, slow travel",
    description:
      "Coming off a long project and want to disappear into Bali for three weeks. Yoga in the morning, writing in the afternoon, somewhere green. Ubud preferred but Sidemen or Munduk equally welcome.",
    destinations: ["Ubud", "Sidemen", "Munduk"],
    flexible_month: "September 2026",
    guest_count: 1,
    photo: "1537953773345-d172ccf13cf1",
  },
  {
    author: AUTHORS.zara,
    title: "Honeymoon — somewhere remote, off-grid OK",
    description:
      "Five-year honeymoon redux. Open to Iceland, Patagonia, the Faroe Islands — anywhere with dramatic landscape and no nightlife. Two weeks, dates flexible. Solar / off-grid totally fine, in fact preferred.",
    destinations: ["Iceland", "Patagonia", "Faroe Islands"],
    start_date: "2026-09-15",
    end_date: "2026-09-29",
    guest_count: 2,
    photo: "1500530855697-b586d89ba3ee",
  },
  {
    author: AUTHORS.bjorn,
    title: "Mexico City — food crawl, four nights",
    description:
      "Doing the long taquería tour. Want a base in Roma Norte or Condesa, walking distance to good coffee in the morning. Two of us, no kids, willing to pay for the right spot.",
    destinations: ["Mexico City", "Roma Norte", "Condesa"],
    start_date: "2026-06-04",
    end_date: "2026-06-08",
    guest_count: 2,
    photo: "1518105779142-d975f22f1b0a",
  },
  {
    author: AUTHORS.felix,
    title: "Marrakech medina — a slow week of cooking",
    description:
      "Want to take a real cooking class — not the touristy one — and settle into a riad for a week. Open to traveling outside Marrakech for the food too. Guides + recommendations welcome.",
    destinations: ["Marrakech"],
    flexible_month: "March 2026",
    guest_count: 2,
    photo: "1545167622-3a6ac756afa4",
  },
  {
    author: AUTHORS.ines,
    title: "Santorini — two-week reset, off-season",
    description:
      "Looking to go in the shoulder months (March or April) when the cliffs are quiet. Don't need a hotel pool — would much rather have a kitchen, a sea view, and a 10-minute walk to a bakery.",
    destinations: ["Santorini"],
    flexible_month: "April 2026",
    guest_count: 2,
    photo: "1570077188670-e3a8d69ac5ff",
  },
  {
    author: AUTHORS.mei,
    title: "Kyoto in cherry blossom season — flexible",
    description:
      "Knowing it's the busiest week of the year. Will travel any time April 1–15, two of us. Quiet residential neighborhood preferred — happy to bus into the temples instead of staying right next to them.",
    destinations: ["Kyoto"],
    start_date: "2026-04-01",
    end_date: "2026-04-15",
    guest_count: 2,
    photo: "1493976040374-85c8e12f0c0e",
  },
  {
    author: AUTHORS.pavel,
    title: "Banff in early winter — ski-touring crew of six",
    description:
      "Six skiers (five experienced, one beginner). Looking for a chalet with hot water + parking near a ski-touring trailhead. Mid-November to early-December — happy to time it with first snow.",
    destinations: ["Banff", "Canmore"],
    flexible_month: "November 2026",
    guest_count: 6,
    photo: "1551632436-cbf8dd35adfa",
  },
];

// ---- delete --------------------------------------------------------
console.log("Deleting all existing trip_wish proposals…");
const del = await fetch(
  `${SB_URL}/rest/v1/proposals?kind=eq.trip_wish`,
  { method: "DELETE", headers: H }
);
if (!del.ok) throw new Error(`Delete failed: ${del.status} ${await del.text()}`);
const deleted = await del.json();
console.log(`  deleted ${deleted.length} rows`);

// ---- insert --------------------------------------------------------
console.log("Inserting 10 fresh trip_wish rows…");
const rows = PROPOSALS.map((p) => ({
  author_id: p.author,
  kind: "trip_wish",
  title: p.title,
  description: p.description,
  destinations: p.destinations,
  start_date: p.start_date ?? null,
  end_date: p.end_date ?? null,
  flexible_month: p.flexible_month ?? null,
  guest_count: p.guest_count ?? null,
  visibility_mode: "inherit",
  status: "active",
  thumbnail_url: photo(p.photo),
  thumbnail_source: "unsplash_auto",
  thumbnail_attribution: null, // generic credit branch
}));
const ins = await fetch(`${SB_URL}/rest/v1/proposals`, {
  method: "POST",
  headers: H,
  body: JSON.stringify(rows),
});
if (!ins.ok) throw new Error(`Insert failed: ${ins.status} ${await ins.text()}`);
const inserted = await ins.json();
console.log(`  inserted ${inserted.length} rows`);
for (const r of inserted) {
  console.log(`    ${r.id.slice(0, 8)} ${r.title.slice(0, 60)}`);
}
console.log("done.");
