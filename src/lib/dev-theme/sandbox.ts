// REMOVE BEFORE BETA — Dev2 (design system page). Hard-removable alongside
// Dev1 and Dev3. All files in src/app/dev/, src/components/dev/,
// src/lib/dev-theme/ delete together.
//
// Sandbox theme runtime. Holds a sessionStorage-backed map of
// `tokenId -> overrideValue`, generates a single <style> block that
// overrides the matching Tailwind utility classes (bg-X, text-X,
// border-X, rounded-X, etc.), and re-applies it on every route.
//
// Persistence is intentionally sessionStorage only — closing the tab
// MUST drop overrides. localStorage would risk Loren forgetting the
// sandbox is on between days and reading false positives.

import type { TokenSpec, TokenCategory } from "./tokens";
import { getActivePresetId, getPresetById } from "./brand-presets";

export const SANDBOX_STORAGE_KEY = "dev2.sandbox.overrides.v1";
export const SANDBOX_ENABLED_KEY = "dev2.sandbox.enabled.v1";
export const SANDBOX_STYLE_ID = "dev2-sandbox-style";
export const SANDBOX_FONTS_ID = "dev2-sandbox-fonts";
export const SANDBOX_EXTRA_ID = "dev2-sandbox-extra";
export const SANDBOX_EVENT = "dev2:sandbox-changed";

export type SandboxOverrides = Record<string, string>;

export function readOverrides(): SandboxOverrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(SANDBOX_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export function writeOverrides(o: SandboxOverrides) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(o));
  window.dispatchEvent(new CustomEvent(SANDBOX_EVENT));
}

export function isEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SANDBOX_ENABLED_KEY) === "1";
}

export function setEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) sessionStorage.setItem(SANDBOX_ENABLED_KEY, "1");
  else sessionStorage.removeItem(SANDBOX_ENABLED_KEY);
  window.dispatchEvent(new CustomEvent(SANDBOX_EVENT));
}

export function setOverride(id: string, value: string) {
  const o = readOverrides();
  o[id] = value;
  writeOverrides(o);
}

export function clearOverride(id: string) {
  const o = readOverrides();
  delete o[id];
  writeOverrides(o);
}

export function clearAll() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SANDBOX_STORAGE_KEY);
  sessionStorage.removeItem(SANDBOX_ENABLED_KEY);
  window.dispatchEvent(new CustomEvent(SANDBOX_EVENT));
}

// ── CSS generation ────────────────────────────────────────────────────
// For each token category we know which Tailwind utilities the value
// flows into. The generated CSS uses html[data-theme="sandbox"] as the
// scoping selector so flipping the toggle off cleanly drops every
// override. Important is appended for utilities only — the canonical
// class still wins for any element that doesn't match, so nothing
// outside the sandbox is affected when sandbox is off.

function colorCss(name: string, value: string): string {
  // bg-, text-, border-, ring-, fill-, stroke-, divide-, outline-,
  // accent-, decoration-, caret-, placeholder-, from-, via-, to-
  // We cover the common subset to avoid bloat.
  const baseRules = `
.bg-${name} { background-color: ${value} !important; }
.text-${name} { color: ${value} !important; }
.border-${name} { border-color: ${value} !important; }
.ring-${name} { --tw-ring-color: ${value} !important; }
.fill-${name} { fill: ${value} !important; }
.stroke-${name} { stroke: ${value} !important; }
.from-${name} { --tw-gradient-from: ${value} !important; }
`.trim();
  // Foundational tokens also drive direct body / html rules, since
  // brand-preset extraCss targets the body/html element rather than
  // the utility class. Without this, editing color/background in the
  // drawer would only affect elements with .bg-background — leaving
  // the actual page bg unchanged.
  if (name === "background") {
    return `${baseRules}
body, html { background-color: ${value} !important; }`;
  }
  if (name === "foreground") {
    return `${baseRules}
body { color: ${value} !important; }`;
  }
  return baseRules;
}

function radiusCss(name: string, value: string): string {
  return `.rounded-${name} { border-radius: ${value} !important; }`;
}

function shadowCss(name: string, value: string): string {
  return `.shadow-${name} { box-shadow: ${value} !important; }`;
}

function spacingCss(name: string, value: string): string {
  // Cover the prefixes Tailwind generates from the spacing scale.
  const prefixes = [
    ["p", "padding"],
    ["px", "padding-left", "padding-right"],
    ["py", "padding-top", "padding-bottom"],
    ["pt", "padding-top"],
    ["pr", "padding-right"],
    ["pb", "padding-bottom"],
    ["pl", "padding-left"],
    ["m", "margin"],
    ["mx", "margin-left", "margin-right"],
    ["my", "margin-top", "margin-bottom"],
    ["mt", "margin-top"],
    ["mr", "margin-right"],
    ["mb", "margin-bottom"],
    ["ml", "margin-left"],
    ["gap", "gap"],
    ["w", "width"],
    ["h", "height"],
    ["min-w", "min-width"],
    ["min-h", "min-height"],
  ] as const;
  return prefixes
    .map(([cls, ...props]) => {
      const decls = props.map((p) => `${p}: ${value} !important;`).join(" ");
      return `.${cls}-${name} { ${decls} }`;
    })
    .join("\n");
}

function fontSizeCss(name: string, value: string): string {
  // value is "16px / 24px" — split.
  const [size, lh] = value.split("/").map((s) => s.trim());
  return `.text-${name} { font-size: ${size} !important; ${
    lh && lh !== "—" ? `line-height: ${lh} !important;` : ""
  } }`;
}

function fontFamilyCss(name: string, value: string): string {
  return `.font-${name} { font-family: ${value} !important; }`;
}

function maxWidthCss(name: string, value: string): string {
  return `.max-w-${name} { max-width: ${value} !important; }`;
}

function tokenCss(t: TokenSpec, value: string): string {
  switch (t.category) {
    case "color":
      return colorCss(t.utilityFragment, value);
    case "radius":
      return radiusCss(t.utilityFragment.replace(/^rounded-/, ""), value);
    case "shadow":
      return shadowCss(t.utilityFragment.replace(/^shadow-/, ""), value);
    case "spacing":
      return spacingCss(t.utilityFragment.replace(/^p-/, ""), value);
    case "fontSize":
      return fontSizeCss(t.utilityFragment.replace(/^text-/, ""), value);
    case "fontFamily":
      return fontFamilyCss(t.utilityFragment.replace(/^font-/, ""), value);
    case "maxWidth":
      return maxWidthCss(t.utilityFragment.replace(/^max-w-/, ""), value);
  }
}

export function generateCss(
  overrides: SandboxOverrides,
  tokens: TokenSpec[]
): string {
  const byId = new Map(tokens.map((t) => [t.id, t]));
  const blocks: string[] = [];
  for (const [id, value] of Object.entries(overrides)) {
    const t = byId.get(id);
    if (!t) continue;
    const block = tokenCss(t, value);
    // Scope every rule under html[data-theme="sandbox"] so that
    // flipping the attribute off instantly reverts every override.
    const scoped = block
      .split("\n")
      .map((line) => (line.trim() ? `html[data-theme="sandbox"] ${line}` : ""))
      .join("\n");
    blocks.push(`/* ${id} */\n${scoped}`);
  }
  return blocks.join("\n\n");
}

export function applySandbox(tokens: TokenSpec[]) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!isEnabled()) {
    root.removeAttribute("data-theme");
    document.getElementById(SANDBOX_STYLE_ID)?.remove();
    document.getElementById(SANDBOX_FONTS_ID)?.remove();
    document.getElementById(SANDBOX_EXTRA_ID)?.remove();
    return;
  }
  root.setAttribute("data-theme", "sandbox");
  const css = generateCss(readOverrides(), tokens);
  let style = document.getElementById(SANDBOX_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = SANDBOX_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = css;

  // ── Brand preset side-effects (fonts + extra CSS) ──────────
  const preset = getPresetById(getActivePresetId());

  // Google Fonts <link>. We use a single idempotent <link> tag —
  // updating its href is cheap and the browser dedupes already-
  // cached families.
  if (preset?.googleFonts && preset.googleFonts.length > 0) {
    const families = preset.googleFonts
      .map((f) => `family=${f}`)
      .join("&");
    const href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    let link = document.getElementById(SANDBOX_FONTS_ID) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = SANDBOX_FONTS_ID;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (link.href !== href) link.href = href;
  } else {
    document.getElementById(SANDBOX_FONTS_ID)?.remove();
  }

  // Preset extra CSS (typography rules, etc.).
  if (preset?.extraCss) {
    let extra = document.getElementById(SANDBOX_EXTRA_ID) as HTMLStyleElement | null;
    if (!extra) {
      extra = document.createElement("style");
      extra.id = SANDBOX_EXTRA_ID;
      document.head.appendChild(extra);
    }
    extra.textContent = preset.extraCss;
  } else {
    document.getElementById(SANDBOX_EXTRA_ID)?.remove();
  }

  // Re-append the override style tag to the END of <head> so it wins
  // any same-selector cascade fight against the preset's extraCss.
  // Without this, edits made via the drawer to selectors that the
  // preset hardcodes (body bg, h1 font-size, etc.) get overridden by
  // the preset's later-loaded !important rules.
  document.head.appendChild(style);
}

// ── Export helpers ────────────────────────────────────────────────────

export function exportAsJson(overrides: SandboxOverrides): string {
  return JSON.stringify(overrides, null, 2);
}

/**
 * CSS variables snippet — Loren can paste into globals.css to adopt
 * the sandbox values. We emit each as a comment + assignment line so
 * the source token id is preserved alongside the value.
 */
export function exportAsCssDiff(
  overrides: SandboxOverrides,
  tokens: TokenSpec[]
): string {
  const byId = new Map(tokens.map((t) => [t.id, t]));
  const lines: string[] = [
    "/* Sandbox export — paste into tailwind.config.ts theme.extend. */",
  ];
  for (const [id, value] of Object.entries(overrides)) {
    const t = byId.get(id);
    if (!t) continue;
    lines.push(`/* ${t.category}.${t.name} (was ${t.value}) */`);
    lines.push(`${t.id}: "${value}";`);
  }
  return lines.join("\n");
}

export function downloadFile(name: string, contents: string, mime: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type { TokenCategory };
