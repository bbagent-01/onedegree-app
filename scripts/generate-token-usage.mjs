#!/usr/bin/env node
/**
 * REMOVE BEFORE BETA — Dev2 design system usage counter.
 *
 * The /dev/design-system page runs on Cloudflare Pages edge runtime
 * and can't do filesystem greps at request time — which is why the
 * first pass showed "0 files" next to every token. This script runs
 * at build/dev time, greps the src/ tree for each Tailwind utility
 * fragment, and writes a static JSON the page can import.
 *
 * Usage:
 *   node scripts/generate-token-usage.mjs
 *
 * Output:
 *   src/lib/dev-theme/usage-counts.json (gitignored;
 *   regenerated on prebuild + predev)
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = join(__dirname, "..");
const srcDir = join(root, "src");
const outPath = join(srcDir, "lib/dev-theme/usage-counts.json");

// Mirror of tailwind.config.ts theme.extend — could in theory be imported
// dynamically, but keeping this script dependency-free + runnable pre-install
// is worth duplicating a few keys. If the canonical config grows keys, add
// them here and the counter picks them up.
const CONFIG = (() => {
  const raw = readFileSync(join(root, "tailwind.config.ts"), "utf8");
  return raw;
})();

// Very permissive key scraping — we pull every `<word>: "<hex|px|rem|...>"`
// key and every nested group to build a superset of utility fragments.
function collectColorFragments() {
  const out = new Set();
  const colorsMatch = CONFIG.match(/colors:\s*{([\s\S]*?)},\s*boxShadow/);
  if (!colorsMatch) return out;
  const block = colorsMatch[1];
  // Strip nested object bodies first so top-level key scraping doesn't
  // capture inner numeric keys like "50" / "100" as standalone tokens.
  let flat = block;
  const objectKey = /(\w+):\s*{([^}]+)}/g;
  const nestedMatches = [];
  let nm;
  while ((nm = objectKey.exec(block))) {
    nestedMatches.push(nm);
  }
  for (const match of nestedMatches) {
    const group = match[1];
    out.add(group);
    const sub = match[2];
    const subKey = /(\w+):\s*"?#?[0-9a-fA-F.]*"?/g;
    let sm;
    while ((sm = subKey.exec(sub))) {
      const k = sm[1];
      if (k === "DEFAULT" || k === "foreground") continue;
      out.add(`${group}-${k}`);
    }
    flat = flat.replace(match[0], "");
  }
  // Now scan the flattened (nested-free) block for bare top-level
  // string keys. These are the ungrouped single-value colors —
  // background, foreground, subtle, border, input, ring.
  const stringKey = /(\w+):\s*"#?[0-9a-fA-F]{3,8}"/g;
  let m;
  while ((m = stringKey.exec(flat))) {
    const k = m[1];
    // Drop purely numeric residuals (defensive).
    if (/^\d+$/.test(k)) continue;
    if (k === "DEFAULT") continue;
    out.add(k);
  }
  return out;
}

function collectRadiusFragments() {
  const match = CONFIG.match(/borderRadius:\s*{([^}]+)}/);
  if (!match) return new Set();
  const out = new Set();
  const keyRe = /"?([\w.]+)"?:\s*"[^"]+"/g;
  let m;
  while ((m = keyRe.exec(match[1]))) {
    out.add(`rounded-${m[1]}`);
  }
  return out;
}

function collectShadowFragments() {
  const match = CONFIG.match(/boxShadow:\s*{([\s\S]*?)},\s*maxWidth/);
  if (!match) return new Set();
  const out = new Set();
  const keyRe = /"?([\w-]+)"?:\s*"[^"]+"/g;
  let m;
  while ((m = keyRe.exec(match[1]))) {
    out.add(`shadow-${m[1]}`);
  }
  return out;
}

function collectSpacingFragments() {
  // Static scale — matches tokens.ts baseScale + custom spacing keys.
  const base = [
    "0",
    "0.5",
    "1",
    "1.5",
    "2",
    "2.5",
    "3",
    "4",
    "5",
    "6",
    "8",
    "10",
    "12",
    "16",
    "20",
    "24",
  ];
  const custom = ["18", "88", "128"];
  return new Set([...base, ...custom]);
}

function collectFontSizeFragments() {
  const match = CONFIG.match(/fontSize:\s*{([\s\S]*?)},\s*spacing/);
  if (!match) return new Set();
  const out = new Set();
  const keyRe = /"?([\w.-]+)"?:\s*\[/g;
  let m;
  while ((m = keyRe.exec(match[1]))) {
    out.add(`text-${m[1]}`);
  }
  return out;
}

function collectFontFamilyFragments() {
  const match = CONFIG.match(/fontFamily:\s*{([\s\S]*?)},\s*fontSize/);
  if (!match) return new Set();
  const out = new Set();
  const keyRe = /"?([\w.-]+)"?:\s*\[/g;
  let m;
  while ((m = keyRe.exec(match[1]))) {
    out.add(`font-${m[1]}`);
  }
  return out;
}

function collectMaxWidthFragments() {
  const match = CONFIG.match(/maxWidth:\s*{([^}]+)}/);
  if (!match) return new Set();
  const out = new Set();
  const keyRe = /"?([\w.-]+)"?:\s*"[^"]+"/g;
  let m;
  while ((m = keyRe.exec(match[1]))) {
    out.add(`max-w-${m[1]}`);
  }
  return out;
}

// Walk src/ and collect every file's text once so we grep in-memory.
function collectSourceFiles() {
  const out = [];
  const stack = [srcDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      // skip the dev-theme folder itself so we don't count our own
      // showcase previews as "real" usages
      if (
        st.isDirectory() &&
        !entry.startsWith(".") &&
        entry !== "node_modules" &&
        full !== join(srcDir, "components/dev") &&
        full !== join(srcDir, "lib/dev-theme")
      ) {
        stack.push(full);
      } else if (
        st.isFile() &&
        /\.(tsx?|jsx?|css)$/.test(entry) &&
        !entry.endsWith(".d.ts")
      ) {
        try {
          out.push({
            path: relative(root, full),
            text: readFileSync(full, "utf8"),
          });
        } catch {
          /* ignore */
        }
      }
    }
  }
  return out;
}

function countUsages(fragment, files) {
  // Utility fragments land inside class strings alongside other utilities,
  // so we word-boundary match `bg-brand-500`, `text-brand-500`, `border-brand-500`,
  // etc. Color fragments in tokens.ts are stored WITHOUT the utility prefix
  // (e.g. "brand-500"), so we check any prefix form. Radius/shadow/font
  // tokens already carry their prefix.
  let count = 0;
  const needleBare = fragment;
  for (const f of files) {
    // Word-boundary match so `brand` doesn't match `brand-500` and vice versa.
    const re = new RegExp(`\\b${needleBare.replace(/[-.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    if (re.test(f.text)) count++;
  }
  return count;
}

function main() {
  const colorFragments = collectColorFragments();
  const radiusFragments = collectRadiusFragments();
  const shadowFragments = collectShadowFragments();
  const fontSizeFragments = collectFontSizeFragments();
  const fontFamilyFragments = collectFontFamilyFragments();
  const spacingFragments = collectSpacingFragments();
  const maxWidthFragments = collectMaxWidthFragments();

  const allFragments = new Set([
    ...colorFragments,
    ...radiusFragments,
    ...shadowFragments,
    ...fontSizeFragments,
    ...fontFamilyFragments,
    ...[...spacingFragments].map((s) => `p-${s}`), // tokens.ts uses p- as representative
    ...maxWidthFragments,
  ]);

  const files = collectSourceFiles();
  console.log(
    `[token-usage] scanning ${files.length} files for ${allFragments.size} tokens…`
  );

  const counts = {};
  for (const frag of allFragments) {
    counts[frag] = countUsages(frag, files);
  }

  writeFileSync(outPath, JSON.stringify(counts, null, 2));
  console.log(`[token-usage] wrote ${outPath}`);
}

main();
