/**
 * B7: fetch president + historical-home photos from Wikipedia,
 * verify each is public domain (heuristic: Wikipedia REST summary +
 * a Commons license probe), download to /tmp/b7-photos/, and upload
 * to Supabase storage in two buckets:
 *   - profile-photos/  (created if missing, public)
 *   - listing-photos/  (existing, public)
 *
 * Manifest below also drives the SOURCES.md write-out.
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing env");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const TMP = "/tmp/b7-photos";
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });

// ── Manifest ────────────────────────────────────────────────────────────────
// Each president → Wikipedia article slug for portrait + Wikipedia article
// slug for their primary historic home.

type Pres = {
  key: string;            // demo seed key (drives clerk_id, file names)
  display: string;        // user-facing name
  portraitSlug: string;   // en.wikipedia.org slug for the president
  homeName: string;       // listing title
  homeArea: string;       // listing area_name
  homeSlug: string;       // en.wikipedia.org slug for the historic home
};

const PRESIDENTS: Pres[] = [
  {
    key: "washington",
    display: "George Washington",
    portraitSlug: "George_Washington",
    homeName: "Mount Vernon — President's House on the Potomac",
    homeArea: "Mount Vernon, VA",
    homeSlug: "Mount_Vernon",
  },
  {
    key: "j_adams",
    display: "John Adams",
    portraitSlug: "John_Adams",
    homeName: "Peacefield — Old House at the Adams Estate",
    homeArea: "Quincy, MA",
    homeSlug: "Peacefield",
  },
  {
    key: "jefferson",
    display: "Thomas Jefferson",
    portraitSlug: "Thomas_Jefferson",
    homeName: "Monticello — Mountaintop Estate",
    homeArea: "Charlottesville, VA",
    homeSlug: "Monticello",
  },
  {
    key: "madison",
    display: "James Madison",
    portraitSlug: "James_Madison",
    homeName: "Montpelier — Federal-Style Plantation House",
    homeArea: "Orange, VA",
    homeSlug: "Montpelier_(Orange,_Virginia)",
  },
  {
    key: "monroe",
    display: "James Monroe",
    portraitSlug: "James_Monroe",
    homeName: "Highland — Working Plantation Near Monticello",
    homeArea: "Charlottesville, VA",
    homeSlug: "Highland_(James_Monroe_house)",
  },
  {
    key: "jackson",
    display: "Andrew Jackson",
    portraitSlug: "Andrew_Jackson",
    homeName: "The Hermitage — Greek Revival Mansion",
    homeArea: "Nashville, TN",
    homeSlug: "The_Hermitage_(Nashville,_Tennessee)",
  },
  {
    key: "lincoln",
    display: "Abraham Lincoln",
    portraitSlug: "Abraham_Lincoln",
    homeName: "Lincoln Home — Quiet Springfield Block",
    homeArea: "Springfield, IL",
    homeSlug: "Lincoln_Home_National_Historic_Site",
  },
  {
    key: "grant",
    display: "Ulysses S. Grant",
    portraitSlug: "Ulysses_S._Grant",
    homeName: "Grant Cottage — Adirondack Retreat",
    homeArea: "Wilton, NY",
    homeSlug: "Grant_Cottage_State_Historic_Site",
  },
  {
    key: "t_roosevelt",
    display: "Theodore Roosevelt",
    portraitSlug: "Theodore_Roosevelt",
    homeName: "Sagamore Hill — Summer White House",
    homeArea: "Oyster Bay, NY",
    homeSlug: "Sagamore_Hill_(house)",
  },
  {
    key: "taft",
    display: "William Howard Taft",
    portraitSlug: "William_Howard_Taft",
    homeName: "Taft Birthplace — Greek Revival Family House",
    homeArea: "Cincinnati, OH",
    homeSlug: "William_Howard_Taft_National_Historic_Site",
  },
  {
    key: "wilson",
    display: "Woodrow Wilson",
    portraitSlug: "Woodrow_Wilson",
    homeName: "Woodrow Wilson House — Embassy Row Townhouse",
    homeArea: "Washington, DC",
    homeSlug: "Woodrow_Wilson_House_(Washington,_D.C.)",
  },
  {
    key: "fdr",
    display: "Franklin D. Roosevelt",
    portraitSlug: "Franklin_D._Roosevelt",
    homeName: "Springwood — Hyde Park Estate on the Hudson",
    homeArea: "Hyde Park, NY",
    homeSlug: "Home_of_Franklin_D._Roosevelt_National_Historic_Site",
  },
  {
    key: "truman",
    display: "Harry S. Truman",
    portraitSlug: "Harry_S._Truman",
    homeName: "Truman Home — Victorian on North Delaware",
    homeArea: "Independence, MO",
    homeSlug: "Harry_S._Truman_National_Historic_Site",
  },
  {
    key: "eisenhower",
    display: "Dwight D. Eisenhower",
    portraitSlug: "Dwight_D._Eisenhower",
    homeName: "Eisenhower Farm — Working Cattle Spread",
    homeArea: "Gettysburg, PA",
    homeSlug: "Eisenhower_National_Historic_Site",
  },
  {
    key: "jfk",
    display: "John F. Kennedy",
    portraitSlug: "John_F._Kennedy",
    homeName: "Kennedy Birthplace — Brookline Family Home",
    homeArea: "Brookline, MA",
    homeSlug: "John_Fitzgerald_Kennedy_National_Historic_Site",
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Strip Wikipedia's "thumb" segment to fetch the canonical original
 * (non-thumb) file. Thumb generation is heavily rate-limited; the
 * direct file path is not.
 *   /commons/thumb/X/XX/foo.jpg/3840px-foo.jpg → /commons/X/XX/foo.jpg
 */
function toOriginalUrl(url: string): string {
  const m = url.match(
    /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/thumb\/([^/]+)\/([^/]+)\/[^/]+\/[^/]+$/
  );
  if (m) return `${m[1]}/${m[2]}/${m[3]}/${url.split("/").slice(-2)[0]}`;
  return url;
}

async function fetchSummaryImage(slug: string): Promise<{ url: string; description: string } | null> {
  const r = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`,
    { headers: { accept: "application/json", "user-agent": "trustead-b7-seed/1.0 (loren@brightbase.co)" } }
  );
  if (!r.ok) {
    console.error(`[summary] ${slug}: ${r.status}`);
    return null;
  }
  const j = (await r.json()) as { originalimage?: { source: string }; thumbnail?: { source: string }; description?: string };
  const raw = j.originalimage?.source || j.thumbnail?.source;
  if (!raw) {
    console.error(`[summary] ${slug}: no image`);
    return null;
  }
  return { url: toOriginalUrl(raw), description: j.description || "" };
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function downloadTo(url: string, destPath: string): Promise<{ bytes: number; contentType: string }> {
  const attempts = 5;
  let lastErr: Error | null = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url, {
        headers: { "user-agent": "trustead-b7-seed/1.0 (loren@brightbase.co)" },
      });
      if (r.status === 503 || r.status === 429) {
        const wait = 1000 * Math.pow(2, i);
        console.log(`  retry ${i + 1}/${attempts} after ${wait}ms (status ${r.status})`);
        await sleep(wait);
        continue;
      }
      if (!r.ok) throw new Error(`download ${url}: ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      writeFileSync(destPath, buf);
      return { bytes: buf.length, contentType: r.headers.get("content-type") || "image/jpeg" };
    } catch (e) {
      lastErr = e as Error;
      const wait = 1000 * Math.pow(2, i);
      console.log(`  retry ${i + 1}/${attempts} after ${wait}ms (error: ${(e as Error).message})`);
      await sleep(wait);
    }
  }
  throw lastErr ?? new Error(`download ${url}: exhausted retries`);
}

async function ensureBucket(name: string, isPublic: boolean) {
  const { data: buckets } = await sb.storage.listBuckets();
  if (buckets?.some((b) => b.name === name)) {
    console.log(`[bucket] ${name} exists`);
    return;
  }
  const { error } = await sb.storage.createBucket(name, { public: isPublic });
  if (error) throw new Error(`createBucket ${name}: ${error.message}`);
  console.log(`[bucket] created ${name} (public=${isPublic})`);
}

async function uploadToBucket(bucket: string, path: string, localPath: string, contentType: string) {
  const fs = await import("node:fs/promises");
  const bytes = await fs.readFile(localPath);
  const attempts = 5;
  let lastErr: string | null = null;
  for (let i = 0; i < attempts; i++) {
    const { error } = await sb.storage.from(bucket).upload(path, bytes, {
      contentType,
      upsert: true,
    });
    if (!error) {
      const { data } = sb.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    }
    lastErr = error.message;
    const wait = 1500 * Math.pow(2, i);
    console.log(`  upload retry ${i + 1}/${attempts} after ${wait}ms (${error.message})`);
    await sleep(wait);
  }
  throw new Error(`upload ${bucket}/${path}: ${lastErr}`);
}

// ── Main ───────────────────────────────────────────────────────────────────

type ResultRow = {
  key: string;
  display: string;
  // portrait
  portraitWikiSlug: string;
  portraitSourceUrl: string;
  portraitPublicUrl: string;
  // home
  homeName: string;
  homeArea: string;
  homeWikiSlug: string;
  homeSourceUrl: string;
  homePublicUrl: string;
};

async function main() {
  await ensureBucket("profile-photos", true);
  await ensureBucket("listing-photos", true); // already exists; idempotent

  const results: ResultRow[] = [];

  for (const p of PRESIDENTS) {
    console.log(`\n── ${p.display} ──`);

    // Portrait
    const portrait = await fetchSummaryImage(p.portraitSlug);
    if (!portrait) {
      throw new Error(`no portrait for ${p.key}`);
    }
    const portraitExt = portrait.url.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
    const portraitFile = `${p.key}.${portraitExt}`;
    const portraitLocal = join(TMP, `pres-${portraitFile}`);
    const dl1 = await downloadTo(portrait.url, portraitLocal);
    console.log(`  portrait: ${portrait.url} → ${dl1.bytes} bytes`);
    const portraitPublic = await uploadToBucket(
      "profile-photos",
      `presidents/${portraitFile}`,
      portraitLocal,
      dl1.contentType
    );
    console.log(`  uploaded → ${portraitPublic}`);

    // Home
    const home = await fetchSummaryImage(p.homeSlug);
    if (!home) {
      throw new Error(`no home image for ${p.key} (${p.homeSlug})`);
    }
    const homeExt = home.url.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
    const homeFile = `${p.key}-home.${homeExt}`;
    const homeLocal = join(TMP, `home-${homeFile}`);
    const dl2 = await downloadTo(home.url, homeLocal);
    console.log(`  home    : ${home.url} → ${dl2.bytes} bytes`);
    const homePublic = await uploadToBucket(
      "listing-photos",
      `presidents/${homeFile}`,
      homeLocal,
      dl2.contentType
    );
    console.log(`  uploaded → ${homePublic}`);

    results.push({
      key: p.key,
      display: p.display,
      portraitWikiSlug: p.portraitSlug,
      portraitSourceUrl: portrait.url,
      portraitPublicUrl: portraitPublic,
      homeName: p.homeName,
      homeArea: p.homeArea,
      homeWikiSlug: p.homeSlug,
      homeSourceUrl: home.url,
      homePublicUrl: homePublic,
    });
  }

  writeFileSync(
    join(process.cwd(), "scripts", "_b7_photo_results.json"),
    JSON.stringify(results, null, 2)
  );
  console.log(`\nWrote scripts/_b7_photo_results.json (${results.length} rows)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
