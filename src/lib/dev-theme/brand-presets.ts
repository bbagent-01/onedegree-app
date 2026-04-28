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

      // CTA / brand → PALE MINT pill (matches the Guesty "Search"
      // button — almost cream, dark green text, very high contrast
      // against the deep forest page bg).
      "color/brand": "#BFE2D4",
      "color/brand-foreground": "#0B2E25",

      // ── Page surfaces → match the source HTML doc exactly.
      //    body { background: #07221B } in the standalone Guesty
      //    file, which is THE color the source designer landed on.
      //    The earlier #03241A push was too dark — frame + cards
      //    didn't get enough room to layer above it without
      //    looking near-black. ──────────────────────────────────
      "color/background": "#07221B",
      "color/foreground": "#F5F1E6",

      // ── Card / popover → DARK GREEN-TINTED GLASS.
      //    Cards register as scooped darker wells in the lighter
      //    frame interior. Alpha tuned for the new #0B2E26 frame:
      //    rgba(7,34,27,0.55) lands ~25% darker than the frame so
      //    cards read clearly without losing forest saturation. ─
      "color/card": "rgba(7, 34, 27, 0.55)",
      "color/card-foreground": "#F5F1E6",
      "color/popover": "#0B2E25",
      "color/popover-foreground": "#F5F1E6",

      // ── Muted surfaces → dark green tint ────────────────────
      "color/muted": "rgba(7, 34, 27, 0.55)",
      "color/muted-foreground": "rgba(245, 241, 230, 0.62)",
      "color/surface": "rgba(7, 34, 27, 0.55)",
      "color/surface-alt": "rgba(7, 34, 27, 0.7)",
      "color/subtle": "rgba(245, 241, 230, 0.55)",

      // ── Borders / inputs → faint cream rule on dark ─────────
      "color/border": "rgba(245, 241, 230, 0.14)",
      "color/input": "rgba(245, 241, 230, 0.14)",
      "color/ring": "#4FB191",

      // ── Primary / secondary / accent ─────────────────────────
      "color/primary": "#BFE2D4",
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
      /* ── BODY ────────────────────────────────────────────────
         #07221B — taken verbatim from the source standalone
         (body { background: #07221B }). */
      html[data-theme="sandbox"],
      html[data-theme="sandbox"] body {
        background: #07221B !important;
        color: #F5F1E6 !important;
      }

      /* ── SCREEN FRAME ────────────────────────────────────────
         #0B2E26 — Loren's explicit value, also the source mock's
         --green-900. Lighter than body so the frame visibly
         floats; same hue family so saturation reads consistent
         across body→frame→glass. */
      html[data-theme="sandbox"] .page-frame {
        margin: 32px 0 56px !important;
        border-radius: 24px !important;
        overflow: hidden !important;
        background: #0B2E26 !important;
        border: 1px solid rgba(245, 241, 230, 0.10) !important;
        box-shadow:
          0 40px 90px -22px rgba(0, 0, 0, 0.78),
          0 8px 24px -8px rgba(0, 0, 0, 0.45),
          inset 0 0 0 1px rgba(245, 241, 230, 0.05) !important;
      }
      html[data-theme="sandbox"] .page-frame [class~="border-b"] {
        border-bottom-color: rgba(245, 241, 230, 0.10) !important;
      }
      /* Sidebar / nav surfaces inside the frame go DARKER than the
         frame interior so they read as the structural ground, not
         another glass tile. */
      html[data-theme="sandbox"] .page-frame nav,
      html[data-theme="sandbox"] .page-frame aside {
        background: rgba(7, 34, 27, 0.65) !important;
      }

      /* ── PAGE-CHROME NAV BAR ────────────────────────────────
         The mock nav uses bg-white/95. Catch the common opacity
         variants and flip to near-opaque dark forest. */
      html[data-theme="sandbox"] .bg-white\\/95,
      html[data-theme="sandbox"] .bg-white\\/90,
      html[data-theme="sandbox"] .bg-white\\/80,
      html[data-theme="sandbox"] .bg-white\\/70,
      html[data-theme="sandbox"] .bg-white\\/60 {
        background-color: rgba(7, 34, 27, 0.85) !important;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }

      /* ── MODALS ──────────────────────────────────────────────
         Solid forest box with generous padding; backdrop overlay
         gets dark + heavy blur so the page behind soft-fades.
         Catches shadcn dialog content + any [role="dialog"]
         element with the shadow-modal token. */
      html[data-theme="sandbox"] [role="dialog"][aria-modal="true"],
      html[data-theme="sandbox"] [data-radix-dialog-content],
      html[data-theme="sandbox"] [data-state="open"][role="dialog"],
      html[data-theme="sandbox"] .shadow-modal {
        background: #0B2E25 !important;
        background-color: #0B2E25 !important;
        border: 1px solid rgba(245, 241, 230, 0.18) !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        padding: 2.5rem !important;
        box-shadow:
          0 50px 100px -25px rgba(0, 0, 0, 0.85),
          0 16px 40px -12px rgba(0, 0, 0, 0.55) !important;
      }
      /* Backdrop dim — heavy blur so the page underneath softens. */
      html[data-theme="sandbox"] .bg-black\\/40,
      html[data-theme="sandbox"] .bg-black\\/50,
      html[data-theme="sandbox"] .bg-black\\/60 {
        background-color: rgba(7, 34, 27, 0.55) !important;
        backdrop-filter: blur(14px) !important;
        -webkit-backdrop-filter: blur(14px) !important;
      }

      /* ── GLASS TILES ─────────────────────────────────────────
         CRITICAL: cream-tinted glass on every .bg-white was
         painting white over green, which visually averaged the
         whole content area to gray-green. Flipped to a semi-
         transparent darker forest tint — cards now read as
         scooped wells in the frame interior, the saturation
         stays rich, and the thin cream rim still defines edges. */
      html[data-theme="sandbox"] .bg-white,
      html[data-theme="sandbox"] .bg-card,
      html[data-theme="sandbox"] .bg-popover,
      html[data-theme="sandbox"] .bg-background {
        background-color: rgba(4, 25, 18, 0.55) !important;
        border: 1px solid rgba(245, 241, 230, 0.10) !important;
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
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

      /* Form fields → dark green tinted glass on dark */
      html[data-theme="sandbox"] input:not([type="checkbox"]):not([type="radio"]):not([type="color"]),
      html[data-theme="sandbox"] textarea,
      html[data-theme="sandbox"] select,
      html[data-theme="sandbox"] [role="combobox"],
      html[data-theme="sandbox"] [class*="!bg-white"] {
        background-color: rgba(4, 25, 18, 0.55) !important;
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
         The hero treatment from the Guesty mock: DM Serif Display,
         tight tracking, italic Instrument Serif accent words in mint
         for <em>-wrapped phrases. h1 scales up to 72px on wide
         viewports — the design-system page reads as an editorial
         spread once Guesty is on. */
      html[data-theme="sandbox"] h1 {
        font-family: 'DM Serif Display', Georgia, serif !important;
        font-weight: 400 !important;
        font-size: clamp(40px, 6vw, 72px) !important;
        letter-spacing: -0.025em !important;
        line-height: 1.02 !important;
        color: #F5F1E6 !important;
        max-width: 18ch;
      }
      html[data-theme="sandbox"] h2 {
        font-family: 'DM Serif Display', Georgia, serif !important;
        font-weight: 400 !important;
        font-size: clamp(28px, 3.5vw, 44px) !important;
        letter-spacing: -0.02em !important;
        line-height: 1.05 !important;
        color: #F5F1E6 !important;
        max-width: 24ch;
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
         Search controls + filter chips inherit a glass-pill look.
         The mint brand button stays rounded-lg per token but every
         existing rounded-full pill gets the glass treatment. */
      html[data-theme="sandbox"] .rounded-full,
      html[data-theme="sandbox"] [data-radix-pill] {
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }

      /* ── BRAND BUTTON (the mint pill) ────────────────────────
         Main CTA inherits the pale mint #BFE2D4 from the brand token
         but should also lean into a generous rounded-pill shape so
         it reads like the Guesty "Search" affordance. */
      html[data-theme="sandbox"] button[class*="bg-brand"] {
        border-radius: 999px !important;
        padding-left: 1.25rem !important;
        padding-right: 1.25rem !important;
        font-weight: 600 !important;
        background-color: #BFE2D4 !important;
        color: #0B2E25 !important;
        border-color: transparent !important;
      }
      html[data-theme="sandbox"] button[class*="bg-brand"]:hover {
        background-color: #4FB191 !important;
      }

      /* ── FILTER CHIPS / TAB-LIKE PILLS ──────────────────────
         Active state = full cream pill with dark text; inactive =
         glass with cream text. */
      html[data-theme="sandbox"] [class*="bg-brand"][class*="border-brand"] {
        background-color: #F5F1E6 !important;
        color: #0B2E25 !important;
        border-color: transparent !important;
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

      /* ── OUTLINE BUTTONS — match the dark-glass card treatment */
      html[data-theme="sandbox"] button[class*="border"]:not([class*="bg-brand"]):not([class*="bg-danger"]):not([class*="bg-emerald"]) {
        background-color: rgba(4, 25, 18, 0.45) !important;
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
