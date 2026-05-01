/**
 * B7 variety pass: fetch portraits + home photos for 6 demo users
 * representing distinct profile-state archetypes:
 *   - 2 "4+°" : Lafayette + John Marshall (chain to founder cluster)
 *   - 2 "no connection" : Chopin + Andersen (vouch only with each other)
 *   - 2 "new member" : Nightingale + Thoreau (zero vouches, recent created_at)
 *
 * Same fetch + upload pattern as the previous fetch scripts. Writes
 * scripts/_b7_variety_results.json.
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TMP = "/tmp/b7-variety";
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });

type Item = {
  key: string;
  display: string;
  archetype: "far" | "no_conn" | "new_member";
  portraitSlug: string;
  homeName: string;
  homeArea: string;
  homeSlug: string;
};

const ITEMS: Item[] = [
  // 4+° pair — bridges to the founders cluster (Madison/Monroe/J.Adams)
  {
    key: "lafayette", display: "Marquis de Lafayette", archetype: "far",
    portraitSlug: "Gilbert_du_Motier,_Marquis_de_Lafayette",
    homeName: "La Grange-Bléneau — Lafayette's Country Château",
    homeArea: "Courpalay, France",
    homeSlug: "Ch%C3%A2teau_de_la_Grange-Bl%C3%A9neau",
  },
  {
    key: "john_marshall", display: "John Marshall", archetype: "far",
    portraitSlug: "John_Marshall",
    homeName: "Marshall House — Federal-Era Brick Townhouse",
    homeArea: "Richmond, VA",
    homeSlug: "John_Marshall_House",
  },
  // No-connection pair — vouched only with each other, no path to anyone else
  {
    key: "chopin", display: "Frédéric Chopin", archetype: "no_conn",
    portraitSlug: "Fr%C3%A9d%C3%A9ric_Chopin",
    homeName: "Żelazowa Wola — Chopin's Birthplace Manor",
    homeArea: "Żelazowa Wola, Poland",
    homeSlug: "%C5%BBelazowa_Wola",
  },
  {
    key: "andersen", display: "Hans Christian Andersen", archetype: "no_conn",
    portraitSlug: "Hans_Christian_Andersen",
    homeName: "H.C. Andersens Hus — Yellow Cottage in Odense",
    homeArea: "Odense, Denmark",
    homeSlug: "Hans_Christian_Andersen_Museum",
  },
  // New-member pair — zero vouches, recent created_at
  {
    key: "nightingale", display: "Florence Nightingale", archetype: "new_member",
    portraitSlug: "Florence_Nightingale",
    homeName: "Embley Park — Hampshire Country Estate",
    homeArea: "Romsey, UK",
    homeSlug: "Embley_Park",
  },
  {
    key: "thoreau", display: "Henry David Thoreau", archetype: "new_member",
    portraitSlug: "Henry_David_Thoreau",
    homeName: "Thoreau's Cabin — Replica on the Walden Shore",
    homeArea: "Concord, MA",
    homeSlug: "Walden_Pond",
  },
];

// ── Helpers (same shape as prior scripts) ────────────────────────────────

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

async function downloadTo(url: string, dest: string) {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": "trustead-b7-seed/1.0 (loren@brightbase.co)" } });
      if (r.status === 503 || r.status === 429) { await sleep(1000 * Math.pow(2, i)); continue; }
      if (!r.ok) throw new Error(`download ${url}: ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      writeFileSync(dest, buf);
      return { bytes: buf.length, contentType: r.headers.get("content-type") || "image/jpeg" };
    } catch (e) {
      if (i === 4) throw e;
      await sleep(1000 * Math.pow(2, i));
    }
  }
  throw new Error("unreachable");
}

async function uploadToBucket(bucket: string, path: string, localPath: string, contentType: string) {
  const fs = await import("node:fs/promises");
  const bytes = await fs.readFile(localPath);
  for (let i = 0; i < 5; i++) {
    const { error } = await sb.storage.from(bucket).upload(path, bytes, { contentType, upsert: true });
    if (!error) {
      const { data } = sb.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    }
    if (i === 4) throw new Error(error.message);
    await sleep(1500 * Math.pow(2, i));
  }
  throw new Error("unreachable");
}

type Result = Item & {
  portraitSourceUrl: string; portraitPublicUrl: string;
  homeSourceUrl: string; homePublicUrl: string;
};

async function main() {
  const results: Result[] = [];
  for (const it of ITEMS) {
    console.log(`\n── ${it.display} (${it.archetype}) ──`);
    const portrait = await fetchSummaryImage(it.portraitSlug);
    if (!portrait) throw new Error(`no portrait for ${it.key}`);
    const portraitExt = portrait.url.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
    const portraitFile = `${it.key}.${portraitExt}`;
    const portraitLocal = join(TMP, portraitFile);
    const dl1 = await downloadTo(portrait.url, portraitLocal);
    console.log(`  portrait: ${portrait.url} → ${dl1.bytes} bytes`);
    const portraitPublic = await uploadToBucket("profile-photos", `variety/${portraitFile}`, portraitLocal, dl1.contentType);
    console.log(`  uploaded → ${portraitPublic}`);

    const home = await fetchSummaryImage(it.homeSlug);
    if (!home) throw new Error(`no home for ${it.key} (${it.homeSlug})`);
    const homeExt = home.url.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
    const homeFile = `${it.key}-home.${homeExt}`;
    const homeLocal = join(TMP, homeFile);
    const dl2 = await downloadTo(home.url, homeLocal);
    console.log(`  home    : ${home.url} → ${dl2.bytes} bytes`);
    const homePublic = await uploadToBucket("listing-photos", `variety/${homeFile}`, homeLocal, dl2.contentType);
    console.log(`  uploaded → ${homePublic}`);

    results.push({ ...it, portraitSourceUrl: portrait.url, portraitPublicUrl: portraitPublic,
                          homeSourceUrl: home.url, homePublicUrl: homePublic });
  }

  writeFileSync(join(process.cwd(), "scripts", "_b7_variety_results.json"), JSON.stringify(results, null, 2));
  console.log(`\nWrote scripts/_b7_variety_results.json (${results.length} rows)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
