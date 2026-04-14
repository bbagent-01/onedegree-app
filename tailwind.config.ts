import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#734796",
          50: "#F5F1F8",
          100: "#E8DFF0",
          200: "#D1BDE0",
          300: "#B395CC",
          400: "#946CB3",
          500: "#734796",
          600: "#5E3A7A",
          700: "#4A2E60",
          foreground: "#FFFFFF",
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
        background: "#FFFFFF",
        surface: {
          DEFAULT: "#F8F9FA",
          alt: "#F1F3F5",
        },
        foreground: "#1A1D21",
        muted: {
          DEFAULT: "#F8F9FA",
          foreground: "#6B7280",
        },
        subtle: "#9CA3AF",
        border: "#E5E7EB",
        input: "#E5E7EB",
        ring: "#734796",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#1A1D21",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#1A1D21",
        },
        primary: {
          DEFAULT: "#734796",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F8F9FA",
          foreground: "#1A1D21",
        },
        accent: {
          DEFAULT: "#F8F9FA",
          foreground: "#734796",
        },
        destructive: {
          DEFAULT: "#DC2626",
          foreground: "#FFFFFF",
        },
        trust: {
          low: "#EF4444",
          building: "#F59E0B",
          solid: "#059669",
          exceptional: "#8B5CF6",
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
