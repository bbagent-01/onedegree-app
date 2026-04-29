import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // Tier color classes live here as string literals — without this
    // glob Tailwind's JIT purges them and the TrustTag shield/score
    // renders in the default foreground color.
    "./src/lib/**/*.{js,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Trustead canonical palette ───────────────────────────
        // Forest greens + cream + mint, baked in as the real theme
        // (was previously a runtime overlay via SandboxApplier — now
        // these ARE the source-of-truth tokens). Keep brand.50–700
        // as a single ramp so trust-pill components and the rest of
        // the codebase that reads bg-brand-N keep working.
        brand: {
          DEFAULT: "#BFE2D4", // pale mint pill
          50: "#EAF4EE",
          100: "#BFE2D4",
          200: "#BFE2D4",
          300: "#4FB191",
          400: "#2A8A6B",
          500: "#1F6B53",
          600: "#154C3B",
          700: "#103A2E",
          foreground: "#0B2E25",
        },
        success: {
          DEFAULT: "#059669",
          50: "#ECFDF5",
          100: "#D1FAE5",
          foreground: "#FFFFFF",
        },
        warning: {
          DEFAULT: "#D97706",
          50: "#FFFBEB",
          100: "#FEF3C7",
          foreground: "#FFFFFF",
        },
        danger: {
          DEFAULT: "#DC2626",
          50: "#FEF2F2",
          100: "#FEE2E2",
          foreground: "#FFFFFF",
        },
        background: "#07221B",
        surface: {
          DEFAULT: "rgba(7, 34, 27, 0.55)",
          alt: "rgba(7, 34, 27, 0.7)",
        },
        foreground: "#F5F1E6",
        muted: {
          DEFAULT: "rgba(7, 34, 27, 0.55)",
          foreground: "rgba(245, 241, 230, 0.62)",
        },
        subtle: "rgba(245, 241, 230, 0.55)",
        border: "rgba(245, 241, 230, 0.14)",
        input: "rgba(245, 241, 230, 0.14)",
        ring: "#4FB191",
        card: {
          DEFAULT: "rgba(7, 34, 27, 0.55)",
          foreground: "#F5F1E6",
        },
        popover: {
          DEFAULT: "#0B2E25",
          foreground: "#F5F1E6",
        },
        primary: {
          DEFAULT: "#BFE2D4",
          foreground: "#0B2E25",
        },
        secondary: {
          DEFAULT: "rgba(245, 241, 230, 0.06)",
          foreground: "#F5F1E6",
        },
        accent: {
          DEFAULT: "rgba(245, 241, 230, 0.10)",
          foreground: "#BFE2D4",
        },
        destructive: {
          DEFAULT: "#DC2626",
          foreground: "#FFFFFF",
        },
        trust: {
          low: "#FB923C",
          building: "#FBBF24",
          solid: "#4FB191",
          exceptional: "#C4B5FD",
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "card-hover": "0 4px 12px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)",
        dropdown: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        modal: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        search: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "search-hover": "0 4px 6px -1px rgb(0 0 0 / 0.1)",
      },
      maxWidth: {
        container: "1400px",
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
        pill: "9999px",
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        serif: ["DM Serif Display", "Georgia", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["14px", { lineHeight: "20px" }],
        base: ["16px", { lineHeight: "24px" }],
        lg: ["18px", { lineHeight: "28px" }],
        xl: ["20px", { lineHeight: "28px" }],
        "2xl": ["24px", { lineHeight: "32px" }],
        "3xl": ["30px", { lineHeight: "36px" }],
        "4xl": ["36px", { lineHeight: "40px" }],
      },
      spacing: {
        18: "72px",
        88: "352px",
        128: "512px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
