// REMOVE BEFORE BETA — Dev2 (design system page).
//
// Brand preset registry. Each preset is a named bundle of token
// overrides + optional font side-effects + optional CSS injection.
// Picking a preset bulk-applies its overrides through the existing
// sandbox runtime so live components re-skin without any code path
// needing to know about presets.
//
// Add a new preset here → it appears in the BrandPresetSwitcher.
// Round 1 = Guesty Forest. Round 2 / 3 / etc. just append.

export interface BrandPreset {
  /** Stable id used as sessionStorage key + switcher value. */
  id: string;
  /** Short human label for the switcher. */
  label: string;
  /** One-line description shown under the switcher. */
  blurb: string;
  /** Token override map: tokenId → override value. Mirrors the
   *  shape sandbox.ts already speaks. */
  overrides: Record<string, string>;
  /** Optional Google Fonts families to load while this preset is
   *  active (e.g. "DM+Serif+Display:wght@400" — the slug after
   *  fonts.googleapis.com/css2?family=...&display=swap). */
  googleFonts?: string[];
  /** Optional raw CSS injected under html[data-theme="sandbox"].
   *  Use for typography rules the token system can't express
   *  (e.g. headline font swap, italic accent treatments). */
  extraCss?: string;
}

export const BRAND_PRESETS: BrandPreset[] = [
  {
    id: "default",
    label: "Default · Trustead",
    blurb: "Current alpha-c brand — Attio-clean white surfaces with plum brand.",
    overrides: {},
  },
  {
    id: "guesty-forest",
    label: "Guesty Forest",
    blurb:
      "Deep forest greens, cream paper surfaces, DM Serif Display headlines with italic accents — inspired by guesty.com.",
    overrides: {
      // ── Brand → Forest greens ────────────────────────────────
      "color/brand-50": "#EAF4EE",
      "color/brand-100": "#BFE2D4",
      "color/brand-200": "#BFE2D4",
      "color/brand-300": "#4FB191",
      "color/brand-400": "#2A8A6B",
      "color/brand-500": "#1F6B53",
      "color/brand-600": "#154C3B",
      "color/brand-700": "#103A2E",
      "color/brand": "#1F6B53",
      "color/brand-foreground": "#F5F1E6",

      // ── Surfaces → Cream / paper ────────────────────────────
      "color/background": "#FBF8EF",
      "color/surface": "#ECE6D4",
      "color/surface-alt": "#ECE6D4",
      "color/muted": "#ECE6D4",
      "color/muted-foreground": "#6B7B73",
      "color/card": "#FBF8EF",
      "color/card-foreground": "#0F1614",
      "color/popover": "#FBF8EF",
      "color/popover-foreground": "#0F1614",

      // ── Foreground → ink ─────────────────────────────────────
      "color/foreground": "#0F1614",
      "color/subtle": "#6B7B73",

      // ── Borders + rings ──────────────────────────────────────
      "color/border": "#E5DFCC",
      "color/input": "#E5DFCC",
      "color/ring": "#1F6B53",

      // ── Primary / Secondary / Accent ─────────────────────────
      "color/primary": "#1F6B53",
      "color/primary-foreground": "#F5F1E6",
      "color/secondary": "#ECE6D4",
      "color/secondary-foreground": "#0F1614",
      "color/accent": "#ECE6D4",
      "color/accent-foreground": "#103A2E",

      // ── Trust palette tilt (still color-distinct so the trust
      //    grades are legible against the cream surface) ──────
      "color/trust-low": "#C2410C", // burnt sienna instead of red
      "color/trust-building": "#B45309", // amber-700
      "color/trust-solid": "#1F6B53", // forest CTA
      "color/trust-exceptional": "#7C3AED", // keep Trustead plum heritage as exceptional accent
    },
    googleFonts: [
      "DM+Sans:wght@400;500;600;700",
      "DM+Serif+Display:ital@0;1",
      "Instrument+Serif:ital@0;1",
    ],
    extraCss: `
      /* Headline serif — applied while Guesty Forest preset is on */
      html[data-theme="sandbox"] h1,
      html[data-theme="sandbox"] h2 {
        font-family: 'DM Serif Display', Georgia, serif !important;
        font-weight: 400 !important;
        letter-spacing: -0.02em !important;
        line-height: 1.05 !important;
      }
      html[data-theme="sandbox"] h3 {
        font-family: 'DM Sans', system-ui, sans-serif !important;
        letter-spacing: -0.01em !important;
      }
      /* Italic accent treatment — wrap a phrase in <em> inside an
         h1/h2 to get the green serif italic Guesty hero look. */
      html[data-theme="sandbox"] h1 em,
      html[data-theme="sandbox"] h2 em {
        font-family: 'Instrument Serif', 'DM Serif Display', serif !important;
        font-style: italic !important;
        color: #2A8A6B !important;
      }
      /* Eyebrow micro-label utility — opt-in via .eyebrow class */
      html[data-theme="sandbox"] .eyebrow {
        font-size: 11px !important;
        font-weight: 600 !important;
        letter-spacing: 0.22em !important;
        text-transform: uppercase !important;
        color: #6B7B73 !important;
      }
      /* Paper-textured surface tilt for body bg — slightly warmer */
      html[data-theme="sandbox"] body {
        background: #FBF8EF !important;
      }
      /* Heavier shadow on cards to match Guesty's floating-card feel */
      html[data-theme="sandbox"] .shadow-card {
        box-shadow: 0 12px 32px -8px rgba(15, 22, 20, 0.08),
                    0 2px 4px rgba(15, 22, 20, 0.04) !important;
      }
    `,
  },
];

export const STORAGE_KEY = "dev2.brand-preset.v1";

export function getActivePresetId(): string {
  if (typeof window === "undefined") return "default";
  return sessionStorage.getItem(STORAGE_KEY) ?? "default";
}

export function setActivePresetId(id: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, id);
}

export function getPresetById(id: string): BrandPreset | undefined {
  return BRAND_PRESETS.find((p) => p.id === id);
}
