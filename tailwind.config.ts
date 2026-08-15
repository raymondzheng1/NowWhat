import type { Config } from "tailwindcss";

/**
 * Design tokens — "Sticker album" (design20260816): physical stickers on cream paper.
 * Ink + warm paper, one brand red, deterministic rotations, hard offset shadows.
 * The matching CSS custom properties live in app/globals.css. Define once, reuse everywhere.
 *
 * ── AA CORRECTIONS (the handoff's own constraint #5 requires AA on every text/bg pair;
 * seven pairs in the supplied palette fail for small text, so these are darkened the
 * minimum amount, hue preserved, and verified with axe):
 *   red      #E0452C → kept for FILLS + large text only (borders, marker, the "?" at 19/900).
 *   red-cta  #CD3F28   button fill so cream #FFF6EC on it = 4.53:1 (was 3.88:1).
 *   red-ink  #C33C26   small red text + links on paper = 4.51:1 (was 3.57:1).
 *   tan      #8A7A55 → kept for Caveat notes (20–24px = large text, 3.61:1 ✓).
 *   tan-ink  #786A4A   12px mono meta on paper = 4.56:1 (was 3.61:1).
 *   green    #2B8A4B → #267B43 where it carries small text = 4.51:1 (was 4.34:1).
 *   chip gradients darkened where white numerals sit on them (yellow #E0A52C → #976F1E,
 *   teal #3AA08A → #308371, pink #C95F8E → #B75681) — all ≥ 4.5:1.
 *
 * Legacy semantic names (rail/sand/accent/gold/help/line/navy/brass) are RETAINED and
 * re-pointed at sticker values so all ~500 existing usages re-skin coherently.
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
        // ---- canonical sticker palette ----
        paper: { DEFAULT: "#FFFFFF", warm: "#F6EDD9", sunk: "#EFE3C9" },
        cream: { DEFAULT: "#F6EDD9", deep: "#EFE3C9", onRed: "#FFF6EC" },
        ink: { DEFAULT: "#2B2417", soft: "#5C5138", faint: "#786A4A", tan: "#8A7A55" },
        red: { DEFAULT: "#E0452C", cta: "#CD3F28", ink: "#C33C26", deep: "#B34C36" },
        // the deadline amber — calm, never red, never a countdown
        amber: { bg: "#FBF3D9", border: "#E0A52C", ink: "#8A6A14" },
        // sticker-face gradient stops (text-bearing stops are the AA-safe variants)
        sticker: {
          green: "#2B8A4B", greenInk: "#267B43",
          blue: "#2F6FBF",
          yellow: "#E0A52C", yellowInk: "#976F1E",
          purple: "#7A4FB3",
          teal: "#3AA08A", tealInk: "#308371",
          pink: "#C95F8E", pinkInk: "#B75681",
        },

        // ---- legacy semantic names → sticker values (keeps every existing class working) ----
        rail: { DEFAULT: "#2B2417", dark: "#1C1710", fg: "#F6EDD9", accent: "#E0452C" },
        sand: { DEFAULT: "#F6EDD9", surface: "#FFFFFF" },
        accent: "#C33C26",
        gold: {
          DEFAULT: "#8A6A14", strong: "#6E5410", text: "#8A6A14",
          soft: "#FBF3D9", line: "#E0A52C", line2: "#E6D5AB",
        },
        help: { DEFAULT: "#267B43", soft: "#E7F1E8", ink: "#1C5B31" },
        line: { DEFAULT: "#DCCFB0", card: "#DCCFB0", strong: "#2B2417" },
        danger: "#B34C36",
        navy: { DEFAULT: "#2B2417", dark: "#1C1710", soft: "#F6EDD9", ink: "#2B2417" },
        brass: { DEFAULT: "#E0A52C", text: "#8A6A14", q: "#E0452C" },
      },
      fontFamily: {
        // Archivo (--font-display) — headings, buttons, labels. Caveat (--font-note) —
        // handwritten margin notes. Spline Sans Mono (--font-mono) — receipt/meta lines.
        display: ["var(--font-display)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        note: ["var(--font-note)", "ui-rounded", "cursive"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
        // legacy alias: "serif" used to mean the button face — now Archivo too.
        serif: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      fontSize: {
        // Sticker scale. H1 clamps 42→88px; everything else is fixed.
        display: ["clamp(42px, 7.5vw, 88px)", { lineHeight: "0.97", letterSpacing: "-0.03em" }],
        h1: ["clamp(34px, 5.2vw, 52px)", { lineHeight: "1.02", letterSpacing: "-0.025em" }],
        h2: ["26px", { lineHeight: "1.15", letterSpacing: "-0.015em" }],
        title: ["21px", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        lede: ["19px", { lineHeight: "1.6" }],
        lead: ["19px", { lineHeight: "1.6" }],
        body: ["17px", { lineHeight: "1.6" }],
        ui: ["15px", { lineHeight: "1.5" }],
        sm: ["14.5px", { lineHeight: "1.55" }],
        meta: ["14.5px", { lineHeight: "1.55" }],
        micro: ["12.5px", { lineHeight: "1.4", letterSpacing: "0.06em" }],
        kicker: ["13px", { lineHeight: "1.2", letterSpacing: "0.14em" }],
        label: ["12.5px", { lineHeight: "1.2", letterSpacing: "0.12em" }],
        h3: ["19px", { lineHeight: "1.3" }],
        eyebrow: ["13px", { lineHeight: "1.2", letterSpacing: "0.14em" }],
      },
      borderRadius: {
        sticker: "8px",
        button: "14px",
        input: "10px",
        card: "12px",
        panel: "12px",
        deadline: "12px",
        pill: "9999px",
        icon: "8px",
      },
      maxWidth: {
        prose: "44rem",
        content: "1180px",
      },
      spacing: { rail: "0px" },
      boxShadow: {
        // hard offset, no blur — a sticker sitting on paper
        sticker: "0 3px 0 rgba(43,36,23,.28)",
        card: "0 3px 0 rgba(43,36,23,.28)",
        raised: "0 4px 0 rgba(43,36,23,.30)",
        pressed: "0 1px 0 rgba(43,36,23,.28)",
        chip: "0 2px 0 rgba(43,36,23,.25)",
        deadline: "0 3px 0 rgba(43,36,23,.25)",
        cta: "0 4px 0 rgba(43,36,23,.30)",
        launcher: "0 4px 0 rgba(43,36,23,.30)",
      },
      minHeight: { control: "48px" },
      rotate: {
        "0.6": "0.6deg", "0.7": "0.7deg", "0.8": "0.8deg", "0.9": "0.9deg",
        "1.1": "1.1deg", "1.2": "1.2deg", "1.4": "1.4deg", "1.5": "1.5deg",
        "1.6": "1.6deg", "2.2": "2.2deg",
      },
    },
  },
  plugins: [],
};

export default config;
