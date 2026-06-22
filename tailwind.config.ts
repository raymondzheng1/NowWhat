import type { Config } from "tailwindcss";

/**
 * Design tokens — Direction K2, "Deep teal & sand" (deep petrol teal + warm sand +
 * three distinct golds). The matching CSS custom properties live in app/globals.css.
 * Source of truth: Designnew/README.md token table. Define once, reuse everywhere.
 *
 * THREE golds, kept separate by design:
 *   rail.accent #c79a52 — brand copper, ONLY on the teal rail/bands.
 *   accent      #8a6526 — AA-safe gold for text/links ON the sand background.
 *   gold        #8a5a14 — reserved for THE DEADLINE (its own load-bearing moment).
 *
 * The legacy "Chambers" names (navy/brass) are retained as transitional aliases pointed
 * at K2 values so every existing page re-skins immediately; they are removed once the
 * component sweep finishes (task: K2 landing + re-skin pages).
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
        // ---- K2 canonical ----
        rail: { DEFAULT: "#10363d", dark: "#0c2a30", fg: "#eef0e8", accent: "#c79a52" },
        sand: { DEFAULT: "#e8ddc7", surface: "#f4eedd" },
        // accent darkened from the README's #8a6526 (actually 3.93:1 on sand, not the
        // claimed 4.6:1) to #7a5618 (~4.9:1) to meet WCAG AA for link/label text — axe-verified.
        accent: "#7a5618",
        // ink-faint darkened from the README's #6c7678 (3.47:1 on sand) to #586466
        // (~4.55:1) to meet WCAG AA on the small meta text it carries — axe-verified.
        ink: { DEFAULT: "#1c2a2b", soft: "#566163", faint: "#586466" },
        paper: { DEFAULT: "#ffffff", warm: "#f4eedd", sunk: "#e8ddc7" },
        // the deadline amber (never red) — unchanged from Chambers; load-bearing.
        gold: {
          DEFAULT: "#8a5a14",
          strong: "#5c3a0a",
          text: "#7a5a2a",
          soft: "#f6edda",
          line: "#e6d5ab",
          line2: "#ddc794",
        },
        help: { DEFAULT: "#2c5544", soft: "#e2ede8", ink: "#173e2c" },
        line: { DEFAULT: "#d3c6aa", card: "#d3c6aa", strong: "#1c2a2b" },
        danger: "#9b2c2c",
        // ---- transitional aliases (legacy names → K2 values; removed after sweep) ----
        navy: { DEFAULT: "#10363d", dark: "#0c2a30", soft: "#dfe6df", ink: "#0a2329" },
        brass: { DEFAULT: "#c79a52", text: "#8a6526", q: "#c79a52" },
      },
      fontFamily: {
        // Cormorant Garamond (next/font → --font-display) — H1, section/step titles,
        // deadline date, wordmark. Libre Baskerville (--font-serif) — buttons.
        display: ["var(--font-display)", "Georgia", "Times New Roman", "serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      fontSize: {
        // K2 scale
        display: ["58px", { lineHeight: "1.04" }], // H1 (desktop)
        h1: ["40px", { lineHeight: "1.08" }], // H1 (mobile) / smaller heads
        h2: ["30px", { lineHeight: "1.05" }], // get-help H2, deadline date
        title: ["22px", { lineHeight: "1.0" }], // step & trust titles
        lede: ["19px", { lineHeight: "1.7" }], // hero lede (serif)
        lead: ["19px", { lineHeight: "1.55" }], // (legacy alias)
        body: ["16px", { lineHeight: "1.6" }],
        ui: ["15px", { lineHeight: "1.4" }], // (legacy)
        sm: ["14.5px", { lineHeight: "1.6" }],
        meta: ["13px", { lineHeight: "1.6" }],
        micro: ["11px", { lineHeight: "1", letterSpacing: "0.18em" }],
        kicker: ["11px", { lineHeight: "1", letterSpacing: "0.28em" }],
        h3: ["19px", { lineHeight: "1.3" }], // (legacy)
        eyebrow: ["11px", { lineHeight: "1", letterSpacing: "0.18em" }],
      },
      borderRadius: {
        // squarer, editorial (K2)
        button: "4px",
        input: "4px",
        card: "4px",
        panel: "6px",
        deadline: "6px",
        pill: "9999px",
        icon: "4px",
      },
      maxWidth: {
        prose: "42rem",
        content: "1040px",
      },
      spacing: {
        rail: "96px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,54,61,.05)",
        raised: "0 8px 20px -12px rgba(16,54,61,.40)",
        deadline: "0 14px 30px -18px rgba(138,90,20,.40)",
        cta: "0 10px 22px -10px rgba(16,54,61,.55)",
        launcher: "0 8px 24px rgba(16,54,61,.34)",
      },
      minHeight: { control: "48px" },
    },
  },
  plugins: [],
};

export default config;
