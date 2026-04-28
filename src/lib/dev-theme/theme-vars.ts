// REMOVE BEFORE BETA — Dev2 (design system page).
//
// Curated registry of Trustead-theme CSS variables exposed by the live
// editor. Each entry maps the editor's override id (storage key) to a
// CSS variable name + canonical value + widget kind. The brand-presets
// extraCss declares these on html[data-theme="sandbox"] and references
// them throughout via var(--tt-X), so an override emitted by the
// editor flips the entire theme through one variable assignment.
//
// Convention: id is "themevar/<name>", cssVar is "--tt-<name>", and
// sandbox.ts's generateCss intercepts ids starting with "themevar/"
// to emit `:root { --tt-<name>: <value>; }` rules.

export type ThemeVarKind = "color" | "size" | "blur" | "freeform";

export interface ThemeVar {
  /** sessionStorage / setOverride key. */
  id: string;
  /** Human-readable name for the editor row. */
  name: string;
  /** Logical group used to section the editor UI. */
  group: "Surfaces" | "Type" | "Accents" | "Effects";
  /** Drives which input widget renders. */
  kind: ThemeVarKind;
  /** Canonical value (matches what brand-presets.ts declares). */
  default: string;
  /** Optional one-line hint for the editor row. */
  hint?: string;
}

export const TRUSTEAD_THEME_VARS: ThemeVar[] = [
  // Surfaces
  {
    id: "themevar/body-bg",
    name: "Body bg",
    group: "Surfaces",
    kind: "color",
    default: "#07221B",
  },
  {
    id: "themevar/frame-bg",
    name: "Frame bg",
    group: "Surfaces",
    kind: "color",
    default: "#0B2E26",
  },
  {
    id: "themevar/glass-bg",
    name: "Glass card bg",
    group: "Surfaces",
    kind: "freeform",
    default: "rgba(7, 34, 27, 0.75)",
    hint: "rgba — bump alpha for less translucent glass",
  },
  {
    id: "themevar/glass-border",
    name: "Glass border",
    group: "Surfaces",
    kind: "freeform",
    default: "rgba(245, 241, 230, 0.14)",
  },
  {
    id: "themevar/rule",
    name: "Faint rule",
    group: "Surfaces",
    kind: "freeform",
    default: "rgba(245, 241, 230, 0.10)",
    hint: "Hairline dividers and faint borders",
  },
  {
    id: "themevar/modal-bg",
    name: "Modal bg",
    group: "Surfaces",
    kind: "color",
    default: "#0B2E25",
  },
  // Type
  {
    id: "themevar/cream",
    name: "Cream foreground",
    group: "Type",
    kind: "color",
    default: "#F5F1E6",
  },
  {
    id: "themevar/cream-muted",
    name: "Cream muted",
    group: "Type",
    kind: "freeform",
    default: "rgba(245, 241, 230, 0.62)",
  },
  {
    id: "themevar/h1-size",
    name: "H1 font size",
    group: "Type",
    kind: "freeform",
    default: "clamp(40px, 6vw, 72px)",
    hint: "clamp(min, fluid, max) — or replace with one px value",
  },
  {
    id: "themevar/h2-size",
    name: "H2 font size",
    group: "Type",
    kind: "freeform",
    default: "clamp(28px, 3.5vw, 44px)",
  },
  {
    id: "themevar/headline-font",
    name: "Headline font",
    group: "Type",
    kind: "freeform",
    default: "'DM Serif Display', Georgia, serif",
  },
  // Accents
  {
    id: "themevar/mint",
    name: "Mint accent",
    group: "Accents",
    kind: "color",
    default: "#BFE2D4",
    hint: "CTA pill bg + italic headline accent",
  },
  {
    id: "themevar/mint-mid",
    name: "Mint mid",
    group: "Accents",
    kind: "color",
    default: "#4FB191",
    hint: "Trust-solid pill + CTA hover",
  },
  // Effects
  {
    id: "themevar/glass-blur",
    name: "Glass blur",
    group: "Effects",
    kind: "size",
    default: "6px",
  },
  {
    id: "themevar/modal-blur",
    name: "Modal backdrop blur",
    group: "Effects",
    kind: "size",
    default: "14px",
  },
  {
    id: "themevar/modal-padding",
    name: "Modal padding",
    group: "Effects",
    kind: "freeform",
    default: "2.5rem",
  },
];

export const THEME_VAR_GROUPS: Array<ThemeVar["group"]> = [
  "Surfaces",
  "Type",
  "Accents",
  "Effects",
];
