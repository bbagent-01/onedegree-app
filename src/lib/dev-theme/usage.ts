// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable alongside
// Dev1 and Dev3. All files in src/app/dev/, src/components/dev/,
// src/lib/dev-theme/ delete together.
//
// Server-only: counts how many source files reference each token's
// utility class. Cheap one-time scan over src/. Cached for the
// lifetime of the server process — token values don't change at
// runtime, neither does the filesystem during a request.

import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

const CACHE: { built: boolean; map: Map<string, number> } = {
  built: false,
  map: new Map(),
};

async function walk(dir: string, out: string[]) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      await walk(p, out);
    } else if (/\.(tsx?|jsx?|css)$/.test(e.name)) {
      out.push(p);
    }
  }
}

async function buildIndex() {
  const root = path.resolve(process.cwd(), "src");
  const files: string[] = [];
  await walk(root, files);
  const counts = new Map<string, number>();
  for (const f of files) {
    let body: string;
    try {
      body = await fs.readFile(f, "utf8");
    } catch {
      continue;
    }
    // Bucket per file: a hit in the file = 1, regardless of multiplicity.
    // Loren cares "how many places use this", not "how many references".
    const seenInThisFile = new Set<string>();
    // We don't know the token list yet, so we just store the raw string
    // -> increment later when getUsageCount(fragment) is called. Cheap
    // alternative: store the full file contents. We do that.
    counts.set(f, body.length); // placeholder; real lookup uses readFiles below
    void seenInThisFile;
  }
  CACHE.map = counts;
  CACHE.built = true;
  // Stash the file bodies separately for fragment search.
  (globalThis as unknown as { __dev2Files?: Map<string, string> }).__dev2Files =
    new Map(
      await Promise.all(
        files.map(
          async (f) => [f, await fs.readFile(f, "utf8")] as [string, string]
        )
      )
    );
}

export async function ensureBuilt() {
  if (!CACHE.built) await buildIndex();
}

export async function getUsageCount(fragment: string): Promise<number> {
  await ensureBuilt();
  const files = (
    globalThis as unknown as { __dev2Files?: Map<string, string> }
  ).__dev2Files;
  if (!files) return 0;
  // Word-boundary-ish: avoid `bg-brand` matching `bg-brand-50` and
  // vice versa. We accept ` `, `\``, `"`, `'`, `:`, end-of-class, etc.
  const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`);
  let n = 0;
  for (const body of files.values()) {
    if (re.test(body)) n++;
  }
  return n;
}

export async function getUsageMap(
  fragments: string[]
): Promise<Record<string, number>> {
  await ensureBuilt();
  const out: Record<string, number> = {};
  for (const f of fragments) {
    out[f] = await getUsageCount(f);
  }
  return out;
}
