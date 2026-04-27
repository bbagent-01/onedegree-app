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
      "Deep forest takeover with glass card surfaces, mint accents, and DM Serif Display headlines — full re-skin inspired by guesty.com.",
    overrides: {
      // ── Brand scale → Forest greens (used by trust pills, badges,
      //    score chips that read brand-500 / brand-100 etc.) ─────
      "color/brand-50": "#EAF4EE",
      "color/brand-100": "#BFE2D4",
      "color/brand-200": "#BFE2D4",
      "color/brand-300": "#4FB191",
      "color/brand-400": "#2A8A6B",
      "color/brand-500": "#1F6B53",
      "color/brand-600": "#154C3B",
      "color/brand-700": "#103A2E",

      // CTA / brand → MINT (lighter than forest 600 so a "Search"
      // pill pops against the dark green page bg with high contrast).
      "color/brand": "#4FB191",
      "color/brand-foreground": "#0B2E25",

      // ── Page surfaces → DARK forest takeover ────────────────
      "color/background": "#0B2E25",
      "color/foreground": "#F5F1E6",

      // ── Card / popover → GLASS (translucent cream over green) ─
      "color/card": "rgba(245, 241, 230, 0.06)",
      "color/card-foreground": "#F5F1E6",
      "color/popover": "#103A2E",
      "color/popover-foreground": "#F5F1E6",

      // ── Muted surfaces → glass-er glass + dim cream text ────
      "color/muted": "rgba(245, 241, 230, 0.06)",
      "color/muted-foreground": "rgba(245, 241, 230, 0.62)",
      "color/surface": "rgba(245, 241, 230, 0.06)",
      "color/surface-alt": "rgba(245, 241, 230, 0.10)",
      "color/subtle": "rgba(245, 241, 230, 0.55)",

      // ── Borders / inputs → faint cream rule on dark ─────────
      "color/border": "rgba(245, 241, 230, 0.14)",
      "color/input": "rgba(245, 241, 230, 0.14)",
      "color/ring": "#4FB191",

      // ── Primary / secondary / accent ─────────────────────────
      "color/primary": "#4FB191",
      "color/primary-foreground": "#0B2E25",
      "color/secondary": "rgba(245, 241, 230, 0.06)",
      "color/secondary-foreground": "#F5F1E6",
      "color/accent": "rgba(245, 241, 230, 0.10)",
      "color/accent-foreground": "#BFE2D4",

      // ── Trust palette tilt for legibility on dark ──────────
      "color/trust-low": "#FB923C", // bright orange — pops on dark
      "color/trust-building": "#FBBF24", // amber-400
      "color/trust-solid": "#4FB191", // mint
      "color/trust-exceptional": "#C4B5FD", // violet-300, plum heritage but bright
    },
    googleFonts: [
      "DM+Sans:wght@400;500;600;700",
      "DM+Serif+Display:ital@0;1",
      "Instrument+Serif:ital@0;1",
    ],
    extraCss: `
      /* ── DARK PAGE TAKEOVER ─────────────────────────────────
         Forest forest — every page background, the design-system
         shell, and the body itself flip to deep green. Cards become
         translucent glass overlays on top. */
      html[data-theme="sandbox"],
      html[data-theme="sandbox"] body {
        background: #0B2E25 !important;
        color: #F5F1E6 !important;
      }

      /* Common surface utility classes — every card / panel / row
         that hardcodes bg-white falls back to glass. */
      html[data-theme="sandbox"] .bg-white,
      html[data-theme="sandbox"] .bg-card,
      html[data-theme="sandbox"] .bg-popover,
      html[data-theme="sandbox"] .bg-background {
        background-color: rgba(245, 241, 230, 0.06) !important;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }

      /* Translucent overlays (modal backdrops, hover scrims) get
         a slightly darker tint so the glass cards still read on top. */
      html[data-theme="sandbox"] .bg-black\\/40,
      html[data-theme="sandbox"] .bg-black\\/50,
      html[data-theme="sandbox"] .bg-black\\/60 {
        background-color: rgba(11, 46, 37, 0.7) !important;
      }

      /* Borders → faint cream */
      html[data-theme="sandbox"] [class~="border"]:not([class*="border-brand"]):not([class*="border-danger"]):not([class*="border-emerald"]):not([class*="border-amber"]):not([class*="border-rose"]) {
        border-color: rgba(245, 241, 230, 0.14) !important;
      }

      /* Default paragraph + span text → cream (the foreground token
         already does most of this; this catches text-foreground/90,
         text-foreground/80 etc. that bypass the token). */
      html[data-theme="sandbox"] .text-foreground,
      html[data-theme="sandbox"] [class*="text-foreground/"] {
        color: #F5F1E6 !important;
      }
      html[data-theme="sandbox"] .text-muted-foreground {
        color: rgba(245, 241, 230, 0.62) !important;
      }

      /* Form fields → glass on dark */
      html[data-theme="sandbox"] input:not([type="checkbox"]):not([type="radio"]):not([type="color"]),
      html[data-theme="sandbox"] textarea,
      html[data-theme="sandbox"] select,
      html[data-theme="sandbox"] [role="combobox"],
      html[data-theme="sandbox"] [class*="!bg-white"] {
        background-color: rgba(245, 241, 230, 0.06) !important;
        color: #F5F1E6 !important;
        border-color: rgba(245, 241, 230, 0.14) !important;
      }
      html[data-theme="sandbox"] input::placeholder,
      html[data-theme="sandbox"] textarea::placeholder {
        color: rgba(245, 241, 230, 0.40) !important;
      }

      /* Divider / separator lines → faint cream */
      html[data-theme="sandbox"] hr,
      html[data-theme="sandbox"] [data-orientation="horizontal"][role="separator"] {
        background-color: rgba(245, 241, 230, 0.14) !important;
        border-color: rgba(245, 241, 230, 0.14) !important;
      }

      /* ── BIG SERIF HEADLINES ─────────────────────────────────
         Every h1 / h2 picks up the Guesty hero treatment: DM Serif
         Display, generous size, italic Instrument Serif accents in
         mint for <em>-wrapped words. */
      html[data-theme="sandbox"] h1 {
        font-family: 'DM Serif Display', Georgia, serif !important;
        font-weight: 400 !important;
        font-size: 56px !important;
        letter-spacing: -0.025em !important;
        line-height: 1.05 !important;
        color: #F5F1E6 !important;
      }
      html[data-theme="sandbox"] h2 {
        font-family: 'DM Serif Display', Georgia, serif !important;
        font-weight: 400 !important;
        font-size: 32px !important;
        letter-spacing: -0.02em !important;
        line-height: 1.1 !important;
        color: #F5F1E6 !important;
      }
      html[data-theme="sandbox"] h3 {
        font-family: 'DM Sans', system-ui, sans-serif !important;
        letter-spacing: -0.01em !important;
        color: #F5F1E6 !important;
      }
      html[data-theme="sandbox"] h1 em,
      html[data-theme="sandbox"] h2 em,
      html[data-theme="sandbox"] em.accent {
        font-family: 'Instrument Serif', 'DM Serif Display', serif !important;
        font-style: italic !important;
        color: #BFE2D4 !important;
        font-weight: 400 !important;
      }

      /* Eyebrow utility — small caps tracked label
         (use .eyebrow on any element) */
      html[data-theme="sandbox"] .eyebrow {
        font-family: 'DM Sans', sans-serif !important;
        font-size: 11px !important;
        font-weight: 600 !important;
        letter-spacing: 0.22em !important;
        text-transform: uppercase !important;
        color: rgba(245, 241, 230, 0.55) !important;
      }
      html[data-theme="sandbox"] .eyebrow .num {
        color: #F5F1E6 !important;
        margin-right: 10px !important;
      }

      /* ── PILL CONTROLS ───────────────────────────────────────
         Search controls + filter chips inherit a glass-pill look. */
      html[data-theme="sandbox"] .rounded-full,
      html[data-theme="sandbox"] [data-radix-pill] {
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }

      /* ── BRAND LOGO COLOR FLIP ───────────────────────────────
         The wordmark uses text-brand by default (plum). On Guesty
         dark forest, plum-on-dark would be illegible. Force cream
         when the logo is wrapped in .brand-logo. */
      html[data-theme="sandbox"] .brand-logo {
        color: #F5F1E6 !important;
      }

      /* ── SHADOWS ─────────────────────────────────────────────
         Heavy floating-card shadow + subtle inset glass highlight. */
      html[data-theme="sandbox"] .shadow-card,
      html[data-theme="sandbox"] .shadow-sm,
      html[data-theme="sandbox"] .shadow-md {
        box-shadow:
          0 30px 80px -20px rgba(0, 0, 0, 0.5),
          inset 0 0 0 1px rgba(245, 241, 230, 0.06) !important;
      }
      html[data-theme="sandbox"] .shadow-modal {
        box-shadow:
          0 40px 100px -20px rgba(0, 0, 0, 0.65),
          inset 0 0 0 1px rgba(245, 241, 230, 0.08) !important;
      }

      /* ── OUTLINE BUTTONS get glass look ──────────────────── */
      html[data-theme="sandbox"] button[class*="border"]:not([class*="bg-brand"]):not([class*="bg-danger"]):not([class*="bg-emerald"]) {
        background-color: rgba(245, 241, 230, 0.06) !important;
        border-color: rgba(245, 241, 230, 0.14) !important;
        color: #F5F1E6 !important;
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
