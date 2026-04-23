// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable alongside
// Dev1 and Dev3. All files in src/app/dev/, src/components/dev/,
// src/lib/dev-theme/ delete together.
//
// Token enumeration. Auto-derived from tailwind.config.ts so the canonical
// theme stays the single source of truth — adding/removing a color in the
// config automatically appears here without code changes.

import tailwindConfig from "../../../tailwind.config";

export type TokenCategory =
  | "color"
  | "fontFamily"
  | "fontSize"
  | "spacing"
  | "radius"
  | "shadow"
  | "maxWidth";

export interface TokenSpec {
  /** Stable id used as React key + sandbox storage key. */
  id: string;
  /** Human-readable name shown in the browser. */
  name: string;
  category: TokenCategory;
  /** Group inside category, e.g. "brand" / "trust" / "neutral". */
  group: string;
  /** Canonical value as it appears in tailwind.config. For colors this is
   *  a hex (or hsl); for spacing/radius a px string; for fontSize a tuple
   *  [size, { lineHeight }] flattened to a comma-joined preview. */
  value: string;
  /** Tailwind utility class fragment so we can grep usage counts. */
  utilityFragment: string;
}

// ── Colors ────────────────────────────────────────────────────────────

interface RawColorTree {
  [k: string]: string | RawColorTree;
}

function flattenColors(
  obj: RawColorTree,
  prefix = ""
): Array<{ key: string; value: string }> {
  const out: Array<{ key: string; value: string }> = [];
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}-${k}` : k;
    if (typeof v === "string") {
      // Tailwind treats "DEFAULT" as the un-suffixed key, so `bg-brand`
      // resolves to `brand.DEFAULT`. Strip it for the utility fragment.
      const cleanKey = next.replace(/-DEFAULT$/, "");
      out.push({ key: cleanKey, value: v });
    } else {
      out.push(...flattenColors(v, next));
    }
  }
  return out;
}

function colorTokens(): TokenSpec[] {
  const colors = (tailwindConfig.theme?.extend?.colors ?? {}) as RawColorTree;
  const flat = flattenColors(colors);
  return flat.map(({ key, value }) => {
    // Group is the first segment, e.g. "brand-500" -> "brand".
    const group = key.split("-")[0];
    return {
      id: `color/${key}`,
      name: key,
      category: "color",
      group,
      value,
      utilityFragment: key,
    };
  });
}

// ── Font sizes ────────────────────────────────────────────────────────

function fontSizeTokens(): TokenSpec[] {
  const sizes =
    (tailwindConfig.theme?.extend?.fontSize as Record<
      string,
      [string, { lineHeight: string }] | string
    >) ?? {};
  return Object.entries(sizes).map(([k, raw]) => {
    const [size, meta] = Array.isArray(raw) ? raw : [raw, { lineHeight: "—" }];
    return {
      id: `fontSize/${k}`,
      name: `text-${k}`,
      category: "fontSize",
      group: "scale",
      value: `${size} / ${meta.lineHeight}`,
      utilityFragment: `text-${k}`,
    };
  });
}

// ── Font families ─────────────────────────────────────────────────────

function fontFamilyTokens(): TokenSpec[] {
  const fams =
    (tailwindConfig.theme?.extend?.fontFamily as Record<string, string[]>) ?? {};
  return Object.entries(fams).map(([k, stack]) => ({
    id: `fontFamily/${k}`,
    name: `font-${k}`,
    category: "fontFamily",
    group: "stack",
    value: stack.join(", "),
    utilityFragment: `font-${k}`,
  }));
}

// ── Spacing ───────────────────────────────────────────────────────────
// Tailwind has a built-in 0..96 scale; the config only adds custom keys
// (18 / 88 / 128). The browser shows just the custom additions plus the
// scale anchors most commonly used in this codebase.

function spacingTokens(): TokenSpec[] {
  const customSpacing =
    (tailwindConfig.theme?.extend?.spacing as Record<string, string>) ?? {};
  const baseScale: Record<string, string> = {
    "0": "0px",
    "0.5": "2px",
    "1": "4px",
    "1.5": "6px",
    "2": "8px",
    "2.5": "10px",
    "3": "12px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "8": "32px",
    "10": "40px",
    "12": "48px",
    "16": "64px",
    "20": "80px",
    "24": "96px",
  };
  const all = { ...baseScale, ...customSpacing };
  return Object.entries(all)
    .sort(([a], [b]) => {
      // Numeric (or half-step) sort so "0.5" sits between "0" and "1",
      // not at the end of the scale. Previously the flat Object.entries
      // ordering appended custom spacing at the tail — reaching for
      // "2.5" between "2" and "3" meant scanning the full scale.
      const an = parseFloat(a);
      const bn = parseFloat(b);
      if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
      return a.localeCompare(b);
    })
    .map(([k, v]) => ({
      id: `spacing/${k}`,
      name: `spacing-${k}`,
      category: "spacing",
      group: customSpacing[k] ? "custom" : "scale",
      value: v,
      utilityFragment: `p-${k}`, // representative — actually used across p-/m-/gap-
    }));
}

// ── Border radius ─────────────────────────────────────────────────────

function radiusTokens(): TokenSpec[] {
  const r =
    (tailwindConfig.theme?.extend?.borderRadius as Record<string, string>) ??
    {};
  return Object.entries(r).map(([k, v]) => ({
    id: `radius/${k}`,
    name: `rounded-${k}`,
    category: "radius",
    group: "scale",
    value: v,
    utilityFragment: `rounded-${k}`,
  }));
}

// ── Box shadow ────────────────────────────────────────────────────────

function shadowTokens(): TokenSpec[] {
  const s =
    (tailwindConfig.theme?.extend?.boxShadow as Record<string, string>) ?? {};
  return Object.entries(s).map(([k, v]) => ({
    id: `shadow/${k}`,
    name: `shadow-${k}`,
    category: "shadow",
    group: "scale",
    value: v,
    utilityFragment: `shadow-${k}`,
  }));
}

// ── Max width ─────────────────────────────────────────────────────────

function maxWidthTokens(): TokenSpec[] {
  const m =
    (tailwindConfig.theme?.extend?.maxWidth as Record<string, string>) ?? {};
  return Object.entries(m).map(([k, v]) => ({
    id: `maxWidth/${k}`,
    name: `max-w-${k}`,
    category: "maxWidth",
    group: "scale",
    value: v,
    utilityFragment: `max-w-${k}`,
  }));
}

export function getAllTokens(): TokenSpec[] {
  return [
    ...colorTokens(),
    ...fontFamilyTokens(),
    ...fontSizeTokens(),
    ...spacingTokens(),
    ...radiusTokens(),
    ...shadowTokens(),
    ...maxWidthTokens(),
  ];
}

export function tokensByCategory(): Record<TokenCategory, TokenSpec[]> {
  const all = getAllTokens();
  const out = {
    color: [] as TokenSpec[],
    fontFamily: [] as TokenSpec[],
    fontSize: [] as TokenSpec[],
    spacing: [] as TokenSpec[],
    radius: [] as TokenSpec[],
    shadow: [] as TokenSpec[],
    maxWidth: [] as TokenSpec[],
  };
  for (const t of all) out[t.category].push(t);
  return out;
}
