import type { Config } from "tailwindcss";

/**
 * Design tokens — Direction C, "Chambers" (navy + brass + gold + ivory).
 * Mirrors design_handoff_what_now/design-tokens/tailwind.tokens.cjs 1:1; the matching
 * CSS custom properties live in app/globals.css. Define once, reuse everywhere
 * (handoff §Fidelity) — no one-off styles that duplicate a primitive.
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
        // faint darkened from the handoff's #7b8794 (3.7:1) to meet WCAG AA (4.5:1) for
        // the small meta/caption text it's used on — axe-verified on white + paper-warm.
        ink: { DEFAULT: "#14253a", soft: "#44566b", faint: "#5f6b78" },
        paper: { DEFAULT: "#ffffff", warm: "#f7f4ee", sunk: "#eef0f2" },
        navy: { DEFAULT: "#1b3a5b", dark: "#122a44", soft: "#e7edf3", ink: "#102744" },
        brass: { DEFAULT: "#b08d57", text: "#6f5527", q: "#9c7a3e" },
        // "clock" — deadline emphasis (amber, never red)
        gold: {
          DEFAULT: "#8a5a14",
          strong: "#5c3a0a",
          text: "#7a5a2a",
          soft: "#f6edda",
          line: "#e6d5ab",
          line2: "#ddc794",
        },
        help: { DEFAULT: "#2c5544", soft: "#e4ede7", ink: "#173e2c" },
        line: { DEFAULT: "#dde1e6", card: "#e2e5ea" },
        danger: "#9b2c2c",
      },
      fontFamily: {
        // Libre Baskerville (via next/font → --font-display) for wordmark + ALL headings.
        serif: ["var(--font-display)", "Georgia", "Times New Roman", "serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      fontSize: {
        display: ["41px", { lineHeight: "1.16" }],
        h1: ["34px", { lineHeight: "1.20" }],
        h2: ["30px", { lineHeight: "1.22" }],
        h3: ["19px", { lineHeight: "1.30" }],
        lead: ["18px", { lineHeight: "1.55" }],
        body: ["16px", { lineHeight: "1.55" }],
        ui: ["15px", { lineHeight: "1.40" }],
        sm: ["14px", { lineHeight: "1.45" }],
        meta: ["13px", { lineHeight: "1.45" }],
        eyebrow: ["11.5px", { lineHeight: "1", letterSpacing: "0.14em" }],
      },
      borderRadius: {
        button: "8px",
        input: "8px",
        card: "10px",
        panel: "12px",
        pill: "6px",
        icon: "9px",
      },
      maxWidth: {
        prose: "42rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,37,58,.05)",
        raised: "0 8px 20px -12px rgba(27,58,91,.40)",
        deadline: "0 14px 30px -18px rgba(138,90,20,.40)",
        cta: "0 10px 22px -10px rgba(27,58,91,.60)",
      },
      minHeight: { control: "48px" },
    },
  },
  plugins: [],
};

export default config;
