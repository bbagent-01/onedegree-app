/**
 * B7 expansion: fetch + upload portraits + home photos for 15 famous
 * historical figures (all died pre-1980, broad public-domain coverage).
 * Same flow as _b7_fetch_photos.ts — writes _b7_famous_results.json.
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const TMP = "/tmp/b7-famous";
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });

type Famous = {
  key: string;
  display: string;
  portraitSlug: string;
  homeName: string;
  homeArea: string;
  homeSlug: string;
};

const FAMOUS: Famous[] = [
  { key: "einstein",   display: "Albert Einstein",   portraitSlug: "Albert_Einstein",         homeName: "Einstein House — Princeton Clapboard",                       homeArea: "Princeton, NJ",        homeSlug: "Albert_Einstein_House" },
  { key: "twain",      display: "Mark Twain",        portraitSlug: "Mark_Twain",              homeName: "Mark Twain House — High-Victorian on Farmington Avenue",     homeArea: "Hartford, CT",         homeSlug: "Mark_Twain_House" },
  { key: "curie",      display: "Marie Curie",       portraitSlug: "Marie_Curie",             homeName: "Maria Skłodowska-Curie Museum — Birthplace in the Old Town", homeArea: "Warsaw, Poland",       homeSlug: "Maria_Sk%C5%82odowska-Curie_Museum" },
  { key: "hemingway",  display: "Ernest Hemingway",  portraitSlug: "Ernest_Hemingway",        homeName: "Hemingway Home — Key West Spanish Colonial",                 homeArea: "Key West, FL",         homeSlug: "Ernest_Hemingway_House" },
  { key: "van_gogh",   display: "Vincent van Gogh",  portraitSlug: "Vincent_van_Gogh",        homeName: "Auberge Ravoux — Final Lodgings in Auvers",                  homeArea: "Auvers-sur-Oise, France", homeSlug: "Auberge_Ravoux" },
  { key: "earhart",    display: "Amelia Earhart",    portraitSlug: "Amelia_Earhart",          homeName: "Amelia Earhart Birthplace — Bluff Above the Missouri",       homeArea: "Atchison, KS",         homeSlug: "Amelia_Earhart_Birthplace_Museum" },
  { key: "keller",     display: "Helen Keller",      portraitSlug: "Helen_Keller",            homeName: "Ivy Green — Family Farmstead",                                homeArea: "Tuscumbia, AL",        homeSlug: "Ivy_Green" },
  { key: "e_roosevelt",display: "Eleanor Roosevelt", portraitSlug: "Eleanor_Roosevelt",       homeName: "Val-Kill Cottage — Eleanor's Hyde Park Retreat",             homeArea: "Hyde Park, NY",        homeSlug: "Val-Kill" },
  { key: "churchill",  display: "Winston Churchill", portraitSlug: "Winston_Churchill",       homeName: "Chartwell — Country House in the Weald of Kent",             homeArea: "Westerham, UK",        homeSlug: "Chartwell" },
  { key: "poe",        display: "Edgar Allan Poe",   portraitSlug: "Edgar_Allan_Poe",         homeName: "Poe House — Baltimore Brick Row House",                       homeArea: "Baltimore, MD",        homeSlug: "Edgar_Allan_Poe_House_and_Museum" },
  { key: "potter",     display: "Beatrix Potter",    portraitSlug: "Beatrix_Potter",          homeName: "Hill Top — 17th-Century Lake District Farm",                  homeArea: "Near Sawrey, UK",      homeSlug: "Hill_Top,_Cumbria" },
  { key: "darwin",     display: "Charles Darwin",    portraitSlug: "Charles_Darwin",          homeName: "Down House — Country Home in Kent",                           homeArea: "Downe, UK",            homeSlug: "Down_House" },
  { key: "whitman",    display: "Walt Whitman",      portraitSlug: "Walt_Whitman",            homeName: "Walt Whitman House — Mickle Street Row House",                homeArea: "Camden, NJ",           homeSlug: "Walt_Whitman_House" },
  { key: "fitzgerald", display: "F. Scott Fitzgerald", portraitSlug: "F._Scott_Fitzgerald",   homeName: "Fitzgerald House — Summit Avenue Brownstone",                 homeArea: "Saint Paul, MN",       homeSlug: "F._Scott_Fitzgerald_House" },
  { key: "anthony",    display: "Susan B. Anthony",  portraitSlug: "Susan_B._Anthony",        homeName: "Susan B. Anthony House — Brick Italianate",                   homeArea: "Rochester, NY",        homeSlug: "Susan_B._Anthony_House" },
];

// ── Helpers (copied from _b7_fetch_photos.ts) ────────────────────────────

function toOriginalUrl(url: string): string {
  const m = url.match(
    /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/thumb\/([^/]+)\/([^/]+)\/[^/]+\/[^/]+$/
  );
  if (m) return `${m[1]}/${m[2]}/${m[3]}/${url.split("/").slice(-2)[0]}`;
  return url;
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function fetchSummaryImage(slug: string) {
  const r = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`,
    { headers: { accept: "application/json", "user-agent": "trustead-b7-seed/1.0 (loren@brightbase.co)" } }
  );
  if (!r.ok) {
    console.error(`[summary] ${slug}: ${r.status}`);
    return null;
  }
  const j = (await r.json()) as { originalimage?: { source: string }; thumbnail?: { source: string } };
  const raw = j.originalimage?.source || j.thumbnail?.source;
  if (!raw) {
    console.error(`[summary] ${slug}: no image`);
    return null;
  }
  return { url: toOriginalUrl(raw) };
}

async function downloadTo(url: string, destPath: string) {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(url, {
        headers: { "user-agent": "trustead-b7-seed/1.0 (loren@brightbase.co)" },
      });
      if (r.status === 503 || r.status === 429) {
        await sleep(1000 * Math.pow(2, i));
        continue;
      }
      if (!r.ok) throw new Error(`download ${url}: ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      writeFileSync(destPath, buf);
      return { bytes: buf.length, contentType: r.headers.get("content-type") || "image/jpeg" };
    } catch (e) {
      await sleep(1000 * Math.pow(2, i));
      if (i === 4) throw e;
    }
  }
  throw new Error("unreachable");
}

async function uploadToBucket(bucket: string, path: string, localPath: string, contentType: string) {
  const fs = await import("node:fs/promises");
  const bytes = await fs.readFile(localPath);
  for (let i = 0; i < 5; i++) {
    const { error } = await sb.storage.from(bucket).upload(path, bytes, {
      contentType,
      upsert: true,
    });
    if (!error) {
      const { data } = sb.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    }
    if (i === 4) throw new Error(error.message);
    await sleep(1500 * Math.pow(2, i));
  }
  throw new Error("unreachable");
}

// ── Main ─────────────────────────────────────────────────────────────────

type Result = {
  key: string; display: string;
  portraitWikiSlug: string; portraitSourceUrl: string; portraitPublicUrl: string;
  homeName: string; homeArea: string;
  homeWikiSlug: string; homeSourceUrl: string; homePublicUrl: string;
};

async function main() {
  const results: Result[] = [];
  for (const f of FAMOUS) {
    console.log(`\n── ${f.display} ──`);
    const portrait = await fetchSummaryImage(f.portraitSlug);
    if (!portrait) throw new Error(`no portrait for ${f.key}`);
    const portraitExt = portrait.url.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
    const portraitFile = `${f.key}.${portraitExt}`;
    const portraitLocal = join(TMP, `${portraitFile}`);
    const dl1 = await downloadTo(portrait.url, portraitLocal);
    console.log(`  portrait: ${portrait.url} → ${dl1.bytes} bytes`);
    const portraitPublic = await uploadToBucket("profile-photos", `famous/${portraitFile}`, portraitLocal, dl1.contentType);
    console.log(`  uploaded → ${portraitPublic}`);

    const home = await fetchSummaryImage(f.homeSlug);
    if (!home) throw new Error(`no home for ${f.key} (${f.homeSlug})`);
    const homeExt = home.url.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
    const homeFile = `${f.key}-home.${homeExt}`;
    const homeLocal = join(TMP, `${homeFile}`);
    const dl2 = await downloadTo(home.url, homeLocal);
    console.log(`  home    : ${home.url} → ${dl2.bytes} bytes`);
    const homePublic = await uploadToBucket("listing-photos", `famous/${homeFile}`, homeLocal, dl2.contentType);
    console.log(`  uploaded → ${homePublic}`);

    results.push({
      key: f.key, display: f.display,
      portraitWikiSlug: f.portraitSlug, portraitSourceUrl: portrait.url, portraitPublicUrl: portraitPublic,
      homeName: f.homeName, homeArea: f.homeArea,
      homeWikiSlug: f.homeSlug, homeSourceUrl: home.url, homePublicUrl: homePublic,
    });
  }

  writeFileSync(join(process.cwd(), "scripts", "_b7_famous_results.json"), JSON.stringify(results, null, 2));
  console.log(`\nWrote scripts/_b7_famous_results.json (${results.length} rows)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
