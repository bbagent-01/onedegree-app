// REMOVE BEFORE BETA — Dev2 (design system page).
//
// Brand preset registry. Each preset is a named bundle of token
// overrides + optional font side-effects + optional CSS injection.
// Picking a preset bulk-applies its overrides through the existing
// sandbox runtime so live components re-skin without any code path
// needing to know about presets.
//
// Add a new preset here → it appears in the BrandPresetSwitcher.
// Round 1 = Green theme. Round 2 / 3 / etc. just append.

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
    id: "trustead",
    label: "Trustead theme",
    blurb:
      "Deep forest takeover with glass card surfaces, mint accents, and DM Serif Display headlines.",
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

      // CTA / brand → PALE MINT pill (matches the source mock's "Search"
      // button — almost cream, dark green text, very high contrast
      // against the deep forest page bg).
      "color/brand": "#BFE2D4",
      "color/brand-foreground": "#0B2E25",

      // ── Page surfaces → match the source HTML doc exactly.
      //    body { background: #07221B } in the standalone source
      //    mock, which is THE color the source designer landed on.
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
      /* ── THEME VARIABLES ─────────────────────────────────────
         All foundational Trustead-theme values live as CSS custom
         properties so the live editor can override them with a
         single property assignment. Override CSS appended after
         this block (via setOverride) wins because it lands later
         in the cascade. */
      html[data-theme="sandbox"] {
        --tt-body-bg: #07221B;
        --tt-frame-bg: #0B2E26;
        --tt-glass-bg: rgba(7, 34, 27, 0.75);
        --tt-glass-border: rgba(245, 241, 230, 0.14);
        --tt-rule: rgba(245, 241, 230, 0.10);
        --tt-modal-bg: #0B2E25;
        --tt-cream: #F5F1E6;
        --tt-cream-muted: rgba(245, 241, 230, 0.62);
        --tt-mint: #BFE2D4;
        --tt-mint-mid: #4FB191;
        --tt-h1-size: clamp(40px, 6vw, 72px);
        --tt-h2-size: clamp(28px, 3.5vw, 44px);
        --tt-glass-blur: 6px;
        --tt-modal-blur: 14px;
        --tt-modal-padding: 2.5rem;
        --tt-headline-font: 'DM Serif Display', Georgia, serif;
      }

      /* ── BODY ────────────────────────────────────────────── */
      html[data-theme="sandbox"],
      html[data-theme="sandbox"] body {
        background: var(--tt-body-bg) !important;
        color: var(--tt-cream) !important;
      }

      /* ── SCREEN FRAME ──────────────────────────────────────── */
      html[data-theme="sandbox"] .page-frame {
        margin: 32px 0 56px !important;
        border-radius: 24px !important;
        overflow: hidden !important;
        background: var(--tt-frame-bg) !important;
        border: 1px solid var(--tt-rule) !important;
        box-shadow:
          0 40px 90px -22px rgba(0, 0, 0, 0.78),
          0 8px 24px -8px rgba(0, 0, 0, 0.45),
          inset 0 0 0 1px rgba(245, 241, 230, 0.05) !important;
      }
      html[data-theme="sandbox"] .page-frame [class~="border-b"] {
        border-bottom-color: var(--tt-rule) !important;
      }
      html[data-theme="sandbox"] .page-frame nav,
      html[data-theme="sandbox"] .page-frame aside {
        background: rgba(7, 34, 27, 0.65) !important;
      }

      /* ── PAGE-CHROME NAV BAR ──────────────────────────────── */
      html[data-theme="sandbox"] .bg-white\\/95,
      html[data-theme="sandbox"] .bg-white\\/90,
      html[data-theme="sandbox"] .bg-white\\/80,
      html[data-theme="sandbox"] .bg-white\\/70,
      html[data-theme="sandbox"] .bg-white\\/60 {
        background-color: rgba(7, 34, 27, 0.85) !important;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }

      /* ── BACKDROP DIM ──────────────────────────────────────── */
      html[data-theme="sandbox"] .bg-black\\/40,
      html[data-theme="sandbox"] .bg-black\\/50,
      html[data-theme="sandbox"] .bg-black\\/60 {
        background-color: var(--tt-glass-bg) !important;
        backdrop-filter: blur(var(--tt-modal-blur)) !important;
        -webkit-backdrop-filter: blur(var(--tt-modal-blur)) !important;
      }

      /* ── GLASS TILES ─────────────────────────────────────── */
      html[data-theme="sandbox"] .bg-white:not(.page-frame):not([role="dialog"]),
      html[data-theme="sandbox"] .bg-card:not(.page-frame):not([role="dialog"]),
      html[data-theme="sandbox"] .bg-popover:not(.page-frame):not([role="dialog"]),
      html[data-theme="sandbox"] .bg-background:not(.page-frame):not([role="dialog"]),
      html[data-theme="sandbox"] .bg-surface:not(.page-frame):not([role="dialog"]) {
        background-color: var(--tt-glass-bg) !important;
        border: 1px solid var(--tt-rule) !important;
        backdrop-filter: blur(var(--tt-glass-blur));
        -webkit-backdrop-filter: blur(var(--tt-glass-blur));
      }

      /* ── INTERACTIVE STATES — hover/focus/selected ───────────
         Tailwind compiles hover:bg-white into a hover-pseudoclass
         selector that the static .bg-white rule above does NOT match.
         Without this, list rows hover to pure white with cream text
         (invisible — the exact bug Loren caught on /inbox thread list
         and /browse listing card chevrons). Mirror the rule for muted
         states so footer strips and selected list rows also flip. */
      html[data-theme="sandbox"] [class*="hover\\:bg-white"]:hover,
      html[data-theme="sandbox"] [class*="focus\\:bg-white"]:focus,
      html[data-theme="sandbox"] [class*="hover\\:bg-card"]:hover,
      html[data-theme="sandbox"] [class*="hover\\:bg-popover"]:hover {
        background-color: rgba(245, 241, 230, 0.08) !important;
      }
      /* Selected / muted backgrounds outside dialogs (the in-dialog
         rule below handles bg-muted there). bg-muted is the inbox
         list "selected thread" indicator and various subtle panels. */
      html[data-theme="sandbox"] .bg-muted:not([class*="bg-muted-foreground"]) {
        background-color: rgba(245, 241, 230, 0.06) !important;
      }
      html[data-theme="sandbox"] [class*="hover\\:bg-muted"]:hover,
      html[data-theme="sandbox"] [class*="hover\\:bg-accent"]:hover {
        background-color: rgba(245, 241, 230, 0.08) !important;
      }
      /* bg-muted/40, bg-muted/30 etc. — inbox search input + thread
         header bg. Tint very faintly so they read as lighter
         structure, not filled blocks. */
      html[data-theme="sandbox"] [class*="bg-muted/"] {
        background-color: rgba(245, 241, 230, 0.04) !important;
      }

      /* ── AMBER ALERT / SYSTEM-MILESTONE CARDS ────────────────
         inbox + reservation use bg-amber-50 / bg-amber-100 for the
         "stay terms updated" / "edits requested" alert cards. On
         forest green these read as out-of-system cream-yellow blocks;
         flip to dark glass with an amber accent border so the warm
         tone carries via accent, not as a slab fill. */
      html[data-theme="sandbox"] .bg-amber-50,
      html[data-theme="sandbox"] [class*="bg-amber-50/"] {
        background-color: rgba(7, 34, 27, 0.55) !important;
        border-color: rgba(251, 191, 36, 0.30) !important;
      }
      /* bg-amber-100 is also used for the small icon badge inside
         those cards — tint to translucent amber so the icon still
         reads as a warm pill, just on dark. */
      html[data-theme="sandbox"] .bg-amber-100 {
        background-color: rgba(251, 191, 36, 0.20) !important;
      }
      html[data-theme="sandbox"] .border-amber-200,
      html[data-theme="sandbox"] .border-amber-300 {
        border-color: rgba(251, 191, 36, 0.30) !important;
      }
      html[data-theme="sandbox"] .text-amber-700,
      html[data-theme="sandbox"] .text-amber-800 {
        color: #FCD34D !important;
      }

      /* ── MODALS / DIALOGS ──────────────────────────────────── */
      html[data-theme="sandbox"] [role="dialog"] {
        background: var(--tt-modal-bg) !important;
        background-color: var(--tt-modal-bg) !important;
        border: 1px solid rgba(245, 241, 230, 0.18) !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        padding: var(--tt-modal-padding) !important;
        box-shadow:
          0 50px 100px -25px rgba(0, 0, 0, 0.85),
          0 16px 40px -12px rgba(0, 0, 0, 0.55) !important;
      }
      /* DialogFooter / action bar inside dialogs uses bg-muted
         which the surface rule would otherwise glass — match that
         specifically and force solid so the footer doesn't break
         the modal's solid feel. */
      html[data-theme="sandbox"] [role="dialog"] [class*="bg-muted"],
      html[data-theme="sandbox"] [role="dialog"] .border-t {
        background: transparent !important;
        background-color: transparent !important;
        border-color: var(--tt-glass-border) !important;
        backdrop-filter: none !important;
      }

      /* Translucent overlays (modal backdrops, hover scrims). */
      html[data-theme="sandbox"] .bg-black\\/40,
      html[data-theme="sandbox"] .bg-black\\/50,
      html[data-theme="sandbox"] .bg-black\\/60 {
        background-color: rgba(11, 46, 37, 0.7) !important;
      }

      /* Borders → faint cream */
      html[data-theme="sandbox"] [class~="border"]:not([class*="border-brand"]):not([class*="border-danger"]):not([class*="border-emerald"]):not([class*="border-amber"]):not([class*="border-rose"]) {
        border-color: var(--tt-glass-border) !important;
      }

      /* Default text colors */
      html[data-theme="sandbox"] .text-foreground,
      html[data-theme="sandbox"] [class*="text-foreground/"] {
        color: var(--tt-cream) !important;
      }
      html[data-theme="sandbox"] .text-muted-foreground {
        color: var(--tt-cream-muted) !important;
      }

      /* Form fields → dark green tinted glass on dark */
      html[data-theme="sandbox"] input:not([type="checkbox"]):not([type="radio"]):not([type="color"]),
      html[data-theme="sandbox"] textarea,
      html[data-theme="sandbox"] select,
      html[data-theme="sandbox"] [role="combobox"],
      html[data-theme="sandbox"] [class*="!bg-white"] {
        background-color: rgba(4, 25, 18, 0.55) !important;
        color: var(--tt-cream) !important;
        border-color: var(--tt-glass-border) !important;
      }
      html[data-theme="sandbox"] input::placeholder,
      html[data-theme="sandbox"] textarea::placeholder {
        color: rgba(245, 241, 230, 0.40) !important;
      }

      /* Divider / separator lines */
      html[data-theme="sandbox"] hr,
      html[data-theme="sandbox"] [data-orientation="horizontal"][role="separator"] {
        background-color: var(--tt-rule) !important;
        border-color: var(--tt-rule) !important;
        height: 1px !important;
      }
      html[data-theme="sandbox"] section > .border-t,
      html[data-theme="sandbox"] section .border-t {
        border-top-color: var(--tt-rule) !important;
      }
      html[data-theme="sandbox"] .eyebrow .bg-border {
        background-color: rgba(245, 241, 230, 0.18) !important;
      }

      /* ── BIG SERIF HEADLINES ───────────────────────────────── */
      html[data-theme="sandbox"] h1 {
        font-family: var(--tt-headline-font) !important;
        font-weight: 400 !important;
        font-size: var(--tt-h1-size) !important;
        letter-spacing: -0.025em !important;
        line-height: 1.02 !important;
        color: var(--tt-cream) !important;
        max-width: 18ch;
      }
      html[data-theme="sandbox"] h2 {
        font-family: var(--tt-headline-font) !important;
        font-weight: 400 !important;
        font-size: var(--tt-h2-size) !important;
        letter-spacing: -0.02em !important;
        line-height: 1.05 !important;
        color: var(--tt-cream) !important;
        max-width: 24ch;
      }
      html[data-theme="sandbox"] h3 {
        font-family: 'DM Sans', system-ui, sans-serif !important;
        letter-spacing: -0.01em !important;
        color: var(--tt-cream) !important;
      }
      /* Italic accent — mint by default. */
      html[data-theme="sandbox"] h1 em,
      html[data-theme="sandbox"] h2 em,
      html[data-theme="sandbox"] em.accent {
        font-family: var(--tt-headline-font), 'Instrument Serif', serif !important;
        font-style: italic !important;
        color: var(--tt-mint) !important;
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

      /* ── BRAND BUTTON (the mint pill) ──────────────────────── */
      html[data-theme="sandbox"] button[class*="bg-brand"] {
        border-radius: 999px !important;
        padding-left: 1.25rem !important;
        padding-right: 1.25rem !important;
        font-weight: 600 !important;
        background-color: var(--tt-mint) !important;
        color: var(--tt-modal-bg) !important;
        border-color: transparent !important;
      }
      html[data-theme="sandbox"] button[class*="bg-brand"]:hover {
        background-color: var(--tt-mint-mid) !important;
      }

      /* ── FILTER CHIPS / TAB-LIKE PILLS ─────────────────────── */
      html[data-theme="sandbox"] [class*="bg-brand"][class*="border-brand"] {
        background-color: var(--tt-cream) !important;
        color: var(--tt-modal-bg) !important;
        border-color: transparent !important;
      }

      /* ── BRAND LOGO COLOR FLIP ─────────────────────────────── */
      html[data-theme="sandbox"] .brand-logo {
        color: var(--tt-cream) !important;
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
