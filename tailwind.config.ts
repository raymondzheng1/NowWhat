import type { Config } from "tailwindcss";

/**
 * Design tokens — calm, trust-first authority product (PRD §9, harness §14.1).
 * All colour/spacing tokens live here once; never inline ad-hoc values (harness §3.2/§14.4).
 * Colours are tuned for WCAG AA contrast against the neutral surfaces.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.{md,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Calm, trustworthy ink + surfaces
        ink: {
          DEFAULT: "#1a2733", // body text — high contrast on paper
          soft: "#42505c", // secondary text
          faint: "#6b7785", // captions / metadata
        },
        paper: {
          DEFAULT: "#ffffff",
          warm: "#f7f5f1", // page background — warm, calm, non-clinical
          sunk: "#eef1f4", // sunken panels
        },
        // Primary: a steady, non-alarming teal-blue (authority, calm)
        brand: {
          DEFAULT: "#1f6f78",
          dark: "#155259",
          soft: "#e3f0f0",
          ink: "#0d3438",
        },
        // Deadline emphasis — serious but not panic-red (trauma-informed, PRD §4)
        clock: {
          DEFAULT: "#9a5b00",
          soft: "#fdf3e3",
          ink: "#5c3700",
        },
        // Help / escalation — warm, supportive
        help: {
          DEFAULT: "#2e6b4f",
          soft: "#e6f1ea",
          ink: "#173e2c",
        },
        line: "#dfe3e8", // hairline borders
        danger: "#9b2c2c",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      borderRadius: {
        card: "14px",
      },
      maxWidth: {
        prose: "42rem", // readable measure for plain-language copy
      },
      boxShadow: {
        card: "0 1px 2px rgba(26,39,51,0.06), 0 4px 16px rgba(26,39,51,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
