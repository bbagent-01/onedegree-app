import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          purple: "#8B5CF6",
          "purple-dark": "#312E81",
          "purple-light": "#F5F3FF",
        },
        text: {
          primary: "#1A1D21",
          secondary: "#6B7280",
          muted: "#9CA3AF",
        },
        surface: {
          white: "#FFFFFF",
          light: "#F8F9FA",
          muted: "#F1F3F5",
        },
        border: {
          DEFAULT: "#E5E7EB",
        },
      },
    },
  },
  plugins: [],
};
export default config;
