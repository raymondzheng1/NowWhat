# Handoff: "What Now?" — Landing page (Direction K2 · Deep teal & sand)

## Overview
**What Now?** is a free, **login-free** web app that helps ordinary Victorians (Australia) understand and respond to a government decision — a notice to vacate, a fine, a public-housing or Centrelink decision. It explains the letter in plain English, finds the **review pathway and the exact deadline (a real date)**, drafts the first letter, and routes to **free help** — grounded in a curated, sourced rules base, or it honestly says "I'm not sure, here's who can help." **Nothing the user enters is stored.**

This package covers the approved **landing page** in the selected visual direction: **K2 "Deep teal & sand"** (an architectural side-rail layout, high-contrast editorial serif, warm sand background). It also documents the design tokens and the persistent side-chat launcher that recur across the whole site.

## About the design files
The files in this bundle are **design references created in HTML** — a prototype showing the intended look, layout, and behaviour. They are **not production code to copy directly.** The task is to **recreate this design in the target codebase** (the brief describes a **Next.js + Tailwind** app themed by CSS-variable tokens) using its established patterns and component conventions. Map the tokens below onto the existing Tailwind theme; build the page from the codebase's own components. If no environment exists yet, Next.js + Tailwind is the intended stack.

`landing-k2.html` is **responsive**: resize below 768px to see the mobile (375px) layout.

## Fidelity
**High-fidelity.** Final colours, typography, spacing, and layout are specified. Recreate the UI faithfully using the codebase's libraries. Exact hex values, font sizes, and measurements are given throughout.

---

## Audience & tone (must inform every decision)
People who just received a government "no" — often **stressed, low-literacy, non-English-speaking, elderly, disabled, or in financial hardship, frequently on a phone.** Make them feel **calm, capable, and not judged.** Tone: a trusted community legal centre / good public service — **not** a law firm, **not** a startup, **not** a chatbot.

### Non-negotiables
1. **Accessibility is a hard requirement** — WCAG 2.1 AA contrast on every text/bg pair; **mobile-first at 375px**; touch targets **≥ 48px**; full keyboard + screen-reader support; **visible focus**; respect `prefers-reduced-motion`; ~Year-6 reading level.
2. **Trust surfaces are load-bearing** — the deadline, sources, the disclaimer ("general information, not advice"), and "get free help" stay visible; never hidden behind disclosure.
3. **The deadline is the payoff** — a concrete date + days-remaining + "add to calendar," in the **amber/gold "clock" tones, never red.** The "can't-confirm" state must feel equally calm, not like an error.
4. **No AI / tech framing anywhere** — no robots, sparkles, "AI" badges, neon, typing-bot tropes. The chat is a calm, plain helper.
5. **Privacy is a headline feature** — "We never keep your details" recurs as a small lock motif.
6. **Multilingual-ready** — tolerate long strings (long agency names); wrap/truncate gracefully; never let the deadline / sources / help / chat controls get pushed off.
7. **One primary action per screen** — the single conversion action is **"Find out what you can do"** (`/start`).

---

## Design tokens (Direction K2 "Deep teal & sand")

### Colour
| Token | Hex | Use | Contrast notes |
|---|---|---|---|
| `--rail-bg` | `#10363d` | Deep petrol teal — vertical rail, primary CTA fill, get-help band, chat header/launcher | cream `#eef0e8` on it ≈ 11:1 (AAA) |
| `--rail-fg` | `#eef0e8` | Cream type on teal | — |
| `--rail-accent` | `#c79a52` | Copper-gold accent **on teal** (wordmark "?", labels, launcher icon) | on `#10363d` ≈ 4.9:1 (AA) |
| `--page-bg` | `#e8ddc7` | Warm sand — page background | — |
| `--surface` | `#f4eedd` | Lifted card surface on sand | — |
| `--paper` | `#ffffff` | White — chat bubbles, input fields | — |
| `--ink` | `#1c2a2b` | Headings + primary text | on sand ≈ 11:1 (AAA) |
| `--ink-soft` | `#566163` | Secondary text | on sand ≈ 4.8:1 (AA) |
| `--ink-faint` | `#6c7678` | Meta text | on sand ≈ 3.6:1 — **use ≥14px / large only** |
| `--accent` | `#8a6526` | Gold for labels/links **on sand** (kicker, "Ask a question", step numbers) | on sand ≈ 4.6:1 (AA) |
| `--line` | `#d3c6aa` | Hairline rules on sand | — |
| `--line-strong` | `#1c2a2b` | Ink rule under step 01 (anchors the index) | — |
| `--gold` | `#8a5a14` | **The deadline amber** — clock ring, date emphasis, "add to calendar." **Never red.** | on `--gold-soft` ≈ 6.2:1 (AA) |
| `--gold-soft` | `#f6edda` | Deadline card fill | — |
| `--gold-line` | `#e6d5ab` | Deadline card border | — |
| `--help` | `#2c5544` | Tier-1 free-help green (chips, handoff) | white on it ≈ 7.5:1 (AAA) |
| `--help-soft` | `#e2ede8` | Help card fill | — |
| `--help-ink` | `#173e2c` | Help card text | — |

> **Two distinct "golds" by design.** `--rail-accent (#c79a52)` is the *brand* accent and only ever appears **on the teal rail/bands**. `--accent (#8a6526)` is the AA-safe gold for text **on the sand background**. `--gold (#8a5a14)` is reserved for **the deadline** so it reads as its own load-bearing moment. Keep them separate.

### Typography
| Role | Family | Weight | Size / line-height / tracking |
|---|---|---|---|
| Display (H1, section/step titles, deadline date, wordmark) | **Cormorant Garamond** (`--display`) | 600 (700 for step/trust titles & wordmark) | H1 **58px / 1.04**; step & trust titles **22px / 1.0**; deadline date **30px / 1.05**; get-help H2 **30px** |
| Body / lede | **Cormorant Garamond** for the hero lede (19px/1.7); **system sans** for descriptive copy & meta | 400–500 | lede 19px/1.7; step desc 14.5px/1.6; footer legal 13px/1.6 |
| Buttons / wordmark fallback | **Libre Baskerville** (`--serif`) | 700 | 14px, letter-spacing .04–.06em |
| Micro-labels / nav / kicker / tiers | **system sans** (`--sans`) | 400–600 | 9.5–11px, **UPPERCASE**, letter-spacing .12–.28em |

- `--display: 'Cormorant Garamond', Georgia, 'Times New Roman', serif`
- `--serif: 'Libre Baskerville', Georgia, serif`
- `--sans: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
- Google Fonts: `Cormorant+Garamond:wght@500;600;700` and `Libre+Baskerville:wght@400;700`.

### Spacing, radii, shadows
- **Vertical rail width:** `96px` (desktop only).
- **Content max-width:** `1040px`, centered, `48px` horizontal padding (desktop) / `22px` (mobile).
- **Section rhythm:** hero `64px` top; index rows `22px` vertical padding; get-help band `44px`; footer `30px`.
- **Radii:** buttons & cards **4px**; deadline card **6px**; pills (tiers, launcher) **999px**. (Squarer than typical — intentional, editorial.)
- **Shadows:** launcher `0 8px 24px rgba(16,54,61,.34)`. The page is otherwise flat (hairlines, not shadows, do the separating).
- **Touch targets:** all interactive controls **≥ 48px** min-height.

---

## Screens / Views

### Landing page (`/`)
**Purpose:** the trust funnel — orient a stressed visitor and drive the one action, "Find out what you can do."

**Layout (desktop ≥ 768px):**
- **Fixed vertical rail**, `96px`, `--rail-bg`, full viewport height, `position:fixed; left:0`. Three items, space-between, centered:
  1. **Crest** — 30×30px, 1px `--rail-accent` border, serif "W" `--rail-fg` (13px).
  2. **Wordmark** — `writing-mode: vertical-rl; transform: rotate(180deg)` (reads bottom-to-top), Cormorant 600, 21px, tracking .12em, `--rail-fg`, with "?" in `--rail-accent`.
  3. **Tag** — same vertical orientation, "FREE · NO LOGIN", 9.5px uppercase, tracking .26em, `--rail-accent`.
- **Main column** offset `margin-left:96px`; inner content `max-width:1040px`, `48px` side padding.
- **Top nav** (right-aligned): How it works · FAQ · Get help · **Ask a question** (last one in `--accent`). 11px uppercase, tracking .2em, `--ink-soft`. Bottom hairline `--line`.
- **Hero:** kicker "UNDERSTAND · ACT IN TIME · GET HELP" (`--accent`) → H1 (58px Cormorant 600, max-width 760) → lede (19px Cormorant, `--ink-soft`, max-width 560) → actions row.
- **Numbered index ("How it works"):** three rows, each = `01/02/03` number (Cormorant 600, 22px, `--accent`, 42px wide) + title (22px Cormorant 700, 240px wide) + description (14.5px sans, `--ink-soft`). Row 1 has a **strong ink top border** (`--line-strong`); rows 2–3 use hairline `--line`; last row has a hairline bottom border.
- **Deadline band:** the amber card (see component below).
- **Trust band:** four equal cells separated by vertical `--line` borders, top+bottom hairline. Each = title (18px Cormorant 700) + sub (13px `--ink-faint`).
- **Get-help band:** full-bleed `--rail-bg`. Left: H2 "Not sure where to start?" + sub + three tier chips. Right: gold (`--rail-accent`) button "See the three tiers of help".
- **Footer:** legal line (with bold "We never keep your details") + uppercase link row.
- **Chat launcher:** fixed bottom-right (see component).

**Layout (mobile ≤ 767px):**
- Rail is **hidden**; replaced by a **top bar** (`--rail-bg`): horizontal wordmark left, "FREE · NO LOGIN" right.
- Top nav hidden (would become a hamburger / sheet menu — not yet designed; use the codebase's mobile nav pattern).
- H1 → 40px; lede → 16px.
- Index rows: descriptions hidden, titles full-width.
- Trust band: 2×2 wrap, sub-text hidden.
- Get-help band + footer stack vertically.
- Launcher: bottom-right, `16px` insets, respect safe-area insets.

#### Components on this screen

**Primary CTA — "Find out what you can do"**
- `--rail-bg` fill, `--rail-fg` text, Libre Baskerville 700 14px, padding `15px 30px`, radius 4px, min-height 48px, trailing arrow icon (→, 17px, stroke 2.2). Links to `/start`.
- Secondary: "Scan a letter" as `--accent` uppercase text with a 1px `--accent` underline, links to `/decode`.

**Deadline card (signature moment)**
- Row: clock medallion + label/date + "Add to calendar".
- Container: `--gold-soft` fill, 1px `--gold-line` border, radius 6px, padding `22px 26px`.
- Clock medallion: 54px circle, 2px `--gold` ring, clock glyph (`--gold`, stroke 2).
- Label: "YOUR REVIEW DEADLINE", 11px uppercase, tracking .18em, `--gold`.
- Date: "Wed 9 July · 14 days left", Cormorant 700, 30px, `--ink`.
- "Add to calendar": `--gold` uppercase 12px, underlined with `--gold-line`, pushed right (`margin-left:auto`).
- **Can't-confirm variant** (not shown but required): same calm card, no panic styling. Replace the date with e.g. "We couldn't confirm a deadline" + a short line and a clear route to free help. Keep the amber palette, never red, never an error look.

**Trust cell** — title 18px Cormorant 700 + 13px `--ink-faint` sub; cells divided by `--line`.

**Tier chips** — 11px uppercase pills, radius 999px. Tier 1 "Free · Government" = `--help` fill / white. Tiers 2–3 = `rgba(238,240,232,.12)` fill / `--rail-fg`.

**Chat launcher (closed state)** — fixed bottom-right, `--rail-bg` fill, 1px `--rail-accent` border, radius 999px, padding `13px 20px`, min-height 48px, shadow `0 8px 24px rgba(16,54,61,.34)`. Speech-bubble glyph (`--rail-accent`, **no robot/sparkle**) + "Work it out with us" (13px, weight 600). Dismissible; remembers dismissal **for the session only**.

---

## The persistent side chat (recurs site-wide — documented for completeness)
A calm, always-available chat docked bottom-right on content/marketing pages. It is an **intake helper** that routes people to their guide — it does **not** dispense detailed law. **Ephemeral: the conversation is never stored.**

- **Open panel (desktop):** docked right, **380–420px** wide, near-full height, subtle scrim behind. Sticky header: title "Work it out with us" + subtitle "Calm help · not stored" + visible **×**. Scrollable message list. Sticky composer (textarea + send) with a small privacy line.
- **Mobile:** full-screen sheet, sticky header + visible ×, composer pinned above the keyboard.
- **Messages:** assistant left (white/`--paper` card, 1px border, radius `12px 12px 12px 4px`); user right (`--rail-bg`, `12px 12px 4px 12px`). Calm "thinking" indicator (three `--rail-accent` dots, **never "AI is typing"**). `aria-live` on the list.
- **Handoff (the goal):** when the matter is understood, show a prominent **"See your guide →"** action (`--help` fill) with the captured matter + deadline.
- **States to build:** launcher (idle / attention nudge) · greeting/empty · in-conversation · thinking · handoff-ready · **unavailable** (calm "chat isn't available right now — use the step-by-step guide or see free help") · error.
- **A11y:** open panel is a focus-trapped `role="dialog"` (labelled); Esc closes; focus returns to the launcher; reduced-motion disables the slide-in.
- On the **focused tool surfaces** (`/start` wizard steps and the Result) suppress/minimise the launcher so it doesn't compete with the task.

---

## Interactions & behaviour
- **Primary CTA** → navigate to `/start` (3-step wizard). **Secondary** → `/decode`.
- **Smooth-scroll** to `#how` from "How it works".
- **Hover:** links lift to `--ink` / `--accent`; CTA may darken `--rail-bg` ~8%; launcher slightly raises shadow. Keep subtle.
- **Focus:** every interactive element needs a **visible focus ring** (2px, offset). Do not remove outlines.
- **Launcher → chat:** opens the panel (slide-in 200–260ms ease-out; **disabled under `prefers-reduced-motion`** — appear instantly).
- **Responsive breakpoint:** `768px` (rail↔top-bar swap).
- **Long content:** agency names and titles must wrap; the deadline date, "add to calendar", and launcher must never be pushed off-screen.

## State management
- `chatOpen` (bool), `chatDismissed` (session-only — `sessionStorage`, **never** persist across sessions, **never** store messages), `chatState` ∈ {idle, greeting, conversing, thinking, handoffReady, unavailable, error}.
- `mobileNavOpen` (bool) for the mobile menu (pattern TBD from codebase).
- **No accounts, no logins, no analytics that store PII, no storage of anything the user types** — hard constraint.

## Assets
- **Favicon set** in `favicon/`: `favicon.svg` (scalable, primary), `favicon-32.png`, `favicon-16.png`, `apple-touch-icon-180.png`, `favicon-512.png` (maskable/PWA). Mark = deep-teal (`#10363d`) rounded square, thin gold (`#c79a52`) inset frame, cream serif "W". Wire up:
  ```html
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="/apple-touch-icon-180.png">
  ```
- **Icons** are inline SVG line glyphs (clock, lock, speech-bubble, document, heart, arrow) — calm, **non-techy**, stroke 1.7–2.2. Swap for the codebase's icon set if it has equivalents; keep them line-style and human.
- **Fonts:** Google Fonts (Cormorant Garamond, Libre Baskerville). Self-host in production for privacy/perf.
- No raster imagery is used on the landing.

## Files in this bundle
- `landing-k2.html` — the responsive high-fidelity landing reference (this is the file to recreate).
- `favicon/` — favicon + app-icon set described above.
- `README.md` — this document.

---
*One-line summary: give a stressed Victorian a calm, trustworthy place — with a warm chat always one tap away — that turns a government "no" into a clear date, a draft they can send, and free help, with the deadline, the sources, and the human help always in plain sight.*
