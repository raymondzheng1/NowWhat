# Handoff: "What Now?" — UI uplift (Direction C, "Chambers")

## Overview
**What Now?** is a free, **login-free** web app that helps ordinary Victorians (Australia) understand and respond to a government decision — a notice to vacate, a fine, a public-housing decision, or any state decision. A short guided wizard produces a plain-English explanation, the **review pathway and exact time limit (a real date)**, a **draft letter**, the **sources** behind the answer, and a hand-off to **free help**. **Nothing the user enters is stored.**

This package documents the approved visual direction — **Direction C ("Chambers")**: a calm, trustworthy, *lawyerly* look built on a **navy + brass + ivory** palette with a **Libre Baskerville** serif for headings. It covers the three hero surfaces: **Landing**, the **guided Wizard**, and the **Result** experience (including the signature deadline card and the "deadline can't be confirmed" state).

The audience is often stressed, low-literacy, non-English-speaking, elderly, disabled, or in hardship — frequently on a phone. The design goal is to make them feel **calm, capable, and not judged**. Tone: a trusted community legal centre / good public service — **not** a law firm sales site, **not** a startup, **not** a chatbot.

---

## About the Design Files
The file in `design-reference/What Now — Direction C.dc.html` is a **design reference created in HTML** — a prototype showing the intended look, layout, copy, and behaviour. **It is not production code to copy directly.** (It uses an internal authoring runtime — `support.js`, `<x-dc>`, `<helmet>` — that is *not* part of the deliverable; ignore it.)

Your task is to **recreate these designs in the target codebase's environment**. The brief specifies the intended stack: **Next.js (App Router) + Tailwind CSS**, themed via CSS-variable design tokens. If that codebase already exists, follow its established patterns, components, and conventions. If you are starting fresh, scaffold Next.js + Tailwind and implement the tokens in `design-tokens/` first.

`design-reference/DESIGN_BRIEF.md` is the full original product brief — read it for the safety model, accessibility bar, and content rules. Where this README and the brief agree, treat it as binding; the brief governs product/safety requirements.

---

## Fidelity
**High-fidelity (hifi).** Colours, typography, spacing, radii, and copy are final and intentional. Recreate the UI faithfully using the codebase's libraries. The one explicit *system* requirement from the brief: **define the tokens once and reuse** — a single card pattern, one tag/label treatment, one type scale, serif headings. Do not introduce one-off styles that duplicate a primitive.

The mobile frames are designed **at 375 px** (the real target). The desktop frames show the same content at a wider measure. Build mobile-first and let the documented desktop layout take over at `md`/`lg`.

---

## Non-negotiables (carry these into the build — from the brief)
1. **Accessibility is a hard requirement.** WCAG 2.1 AA contrast on every text/bg pair (the token file notes ratios); mobile-first, works at **375 × 812**; touch targets **≥ 48 px**; full keyboard + screen-reader support; **visible focus** (`--wn-focus-ring`); respects `prefers-reduced-motion`; ~Year-6 reading level.
2. **Trust surfaces are load-bearing.** Every result must keep visible: the **deadline**, a **sources** panel, a **disclaimer** ("general information, not advice"), and **"get free help"**. These are the safety model — never hide them behind disclosure.
3. **The deadline is the payoff.** A concrete date + days-remaining + "add to calendar". Unmissable, **serious but not panic-inducing** — use the **gold/amber "clock" tones, never red**. The "can't confirm" state must feel equally calm and intentional, not like an error.
4. **Honest "uncertain" states feel safe, not failed.** ("We're not sure — here's who can help", "paste the text", etc.)
5. **No AI / tech framing anywhere.** No robots, sparkles, "AI" badges, chat bubbles, neon gradients.
6. **Privacy is a headline feature.** "We never keep your details" appears as a small, repeated trust motif (lock icon + line), not buried in a policy page.
7. **Multilingual-ready.** Tolerate **long strings** (long agency names, future locales) — wrap/truncate gracefully; never let the deadline, sources, or get-help get pushed off-screen. RTL-friendly is a plus.
8. **One primary action per screen.** The single conversion action is **"Find out what you can do"** → the wizard at `/start`. Secondary actions (Ask a question, Get help) are visually subordinate. The landing **section order is a trust funnel** — keep it.
9. **Mobile is first-class.** Any sheet/modal needs a **visible "×" in a sticky header** (never backdrop-tap alone).

---

## Design Tokens
Authoritative values live in:
- `design-tokens/tokens.css` — CSS custom properties (with AA contrast notes per colour).
- `design-tokens/tailwind.tokens.cjs` — the same values as a Tailwind `theme.extend` fragment.

### Colours (hex)
| Token | Hex | Use |
|---|---|---|
| `ink` | `#14253a` | Body + headings |
| `ink-soft` | `#44566b` | Secondary text |
| `ink-faint` | `#7b8794` | Captions/meta (≥12px) |
| `paper` | `#ffffff` | Card/sheet surface |
| `paper-warm` | `#f7f4ee` | Ivory page bg, hero, insets |
| `paper-sunk` | `#eef0f2` | Subtle fills |
| `navy` | `#1b3a5b` | **Primary** buttons, links, active border |
| `navy-dark` | `#122a44` | Footer, pressed |
| `navy-soft` | `#e7edf3` | Tier-2 chip, selected icon well |
| `navy-ink` | `#102744` | Heading tint on ivory |
| `brass` | `#b08d57` | Hairline **rules/borders**, monogram frame (decorative — not text) |
| `brass-text` | `#6f5527` | Brass-toned **label** text (AA on white) |
| `brass-q` | `#9c7a3e` | The "?" in the wordmark (display size only) |
| `gold` | `#8a5a14` | Deadline numerals; deadline primary button |
| `gold-strong` | `#5c3a0a` | The big date text |
| `gold-text` | `#7a5a2a` | Deadline supporting copy |
| `gold-soft` | `#f6edda` | Deadline panel bg |
| `gold-line` / `gold-line2` | `#e6d5ab` / `#ddc794` | Deadline outer / inner (double-rule) borders |
| `help` | `#2c5544` | Tier-1 accent; "who can confirm" button |
| `help-soft` | `#e4ede7` | Tier-1 chip bg |
| `help-ink` | `#173e2c` | Help heading text |
| `line` | `#dde1e6` | Default hairline |
| `line-card` | `#e2e5ea` | Card border |

### Typography
- **Headings + wordmark:** `"Libre Baskerville", Georgia, serif` — weight **700**. Load Libre Baskerville (400/700) from Google Fonts (or self-host). Used for the wordmark, all H1–H3, card titles, the date, and the draft-letter preview.
- **Body + UI:** the system sans stack. Weights 400/500/600.
- **Scale (desktop):** display 41 / h1 34 / h2 30 / h3 19 / lead 18 / body 16 / ui 15 / sm 14 / meta 13 / eyebrow 11.5 (uppercase, `letter-spacing: .14em`, weight 700). Line-heights in the token files.
- **Mobile heading sizes:** hero H1 28, wizard/result H2 22–23, card titles 15.5–16.5. (Body stays 14–16.)

### Spacing / Radii / Shadows
- Spacing: 4px base (4/8/12/16/20/24/32/36/40/52/58). Desktop section x-padding **40px**; mobile **18–20px**.
- Radii (deliberately squarer/formal): button **8**, input **8**, card **10**, panel/frame **12**, small tag **6**, icon well **9**.
- Shadows: `card` `0 1px 2px rgba(20,37,58,.05)` · `raised` `0 8px 20px -12px rgba(27,58,91,.40)` · `deadline` `0 14px 30px -18px rgba(138,90,20,.40)` · `cta` `0 10px 22px -10px rgba(27,58,91,.60)`.

---

## Shared Components (define once, reuse)
These primitives appear across all screens. Build them as components and reuse.

### Wordmark / logo
- **Monogram crest:** a `44×44` navy (`navy`) rounded-square (`radius 7px`) with a **1px brass inset frame** (`rect` inset 3.5px, `radius 4.5px`, stroke `brass`) and serif **"WN"** in `#f3e7d0` centred. (See `<svg>` in the reference.)
- **Wordmark text:** "What Now?" in Libre Baskerville 700, `ink`, with the **"?" in `brass-q`**.
- **Tagline (optional):** "KNOW YOUR NEXT STEP" — eyebrow style, `ink-faint`, `letter-spacing .18em`.
- Provide favicon/app-icon from the crest, and an OG/social share image (1200×630) using crest + wordmark on `paper-warm` with a brass rule. (Not yet designed — flag to product if needed.)

### Button
- **Primary:** bg `navy`, text white, `radius 8`, `min-height 54px` (hero/wizard) / `50px` (in-card), padding `0 24–32px`, weight 600, `shadow-cta` on hero. Hover: darken toward `navy-dark`. Focus: `--wn-focus-ring`.
- **Deadline primary:** identical but bg `gold` (used only for "Add a reminder to my calendar").
- **Help primary:** bg `help` (used for "Who can confirm my date").
- **Secondary:** white bg, `1.5px` border `#c3cad3`, text `navy`, same radii/heights.
- **Brass CTA (footer only):** bg `brass`, text `#1c1605`, weight 700 ("Get free help" on the navy strip).
- All buttons ≥ 48px tall; full-width on mobile.

### Eyebrow / label tag
- Uppercase, weight 700, `letter-spacing .14–.16em`, size 10.5–11.5px, colour `brass-text`. Often preceded by a **30×1.5px brass rule** (`hr`/span) for the "letterhead" motif.
- Category chips (e.g. "Renting · Notice to vacate") use the same treatment.

### Card
- bg `paper`, `1px` border `line-card`, `radius 10`, padding 17–24px, `shadow-card`. Section titles inside use **h3 serif 700**.
- **Selectable card** (wizard options): default border `line-card`; **selected** = `1.5px` border `navy` + `shadow-raised` + icon well switches from `paper-sunk` (`#f4f5f7`) to `navy-soft`.

### Icon well
- `52×52` (desktop) / `46×46` (mobile) rounded square (`radius 9`), `navy-soft` when active else `#f4f5f7`, centred line icon stroked in `navy` (`stroke-width 1.7`).

### Hairline rule motif
- 1–2px `brass` rules used as ornament: under eyebrows, as a 2px header bottom-border, as a 2px footer top-border, and as left-borders on disclaimer/source/help items. This is the signature "Chambers" detail — use it consistently, sparingly.

### Privacy motif
- A small inline lock icon (rounded padlock, stroke `help`) + short line in `ink-soft`/`ink-faint`, e.g. "We never keep your details." Repeats in hero, wizard footer, and result.

### Icon set (line, calm, non-techy)
Stroke `1.7–2`, rounded joins. Needed: house (renting), receipt/ticket (fines), apartment blocks (public housing), document (gov decision), paste/lines (paste letter), list-lines (plain english), shield+check (sourced), people (help), clock (deadline), calendar/calendar-plus (add reminder), printer, lock (privacy), info-circle, warning-circle (can't-confirm), check-in-square (evidence), chevrons/× (nav). Use the codebase's existing icon library if it has equivalents; otherwise these simple strokes are in the reference SVGs.

---

## Screens / Views

### 1. Landing (`/`)
**Purpose:** Build trust and route the user to the single primary action. **Section order is a trust funnel — keep it.**

**Layout (desktop):**
- **Header** (sticky), height 74px, `2px` `navy` bottom border. Left: crest + wordmark. Right: text nav (How it works · Get help · FAQ) + **secondary** "Ask a question" button.
- **Hero**, bg `paper-warm`, padding `58px 40px 52px`, two columns (`~1.15fr` text / `0.85fr` teaser, gap 46px, vertically centred):
  - Left: brass-rule eyebrow "FREE · VICTORIA · NOTHING SAVED" → **H1 display serif** ("Got a government 'no'? Let's work out what you can do.") → lead paragraph (max ~34rem) → button row (**primary** "Find out what you can do →" + **secondary** "Ask a question") → privacy motif line.
  - Right: **payoff teaser card** (`paper`, border, `radius 12`, padding 24) — eyebrow "What you get back" over a brass hairline; a mini **gold deadline chip** (`gold-soft` bg, `gold-line` border) showing "Tue 8 July 2025" + a white "14 / days left" box; then 3 navy-check list items (explanation / draft letter / sources).
- **Trust band**, bg `paper`, padding `48px 40px`: a **3-column bordered group** (single `line-card` border, `radius 10`, columns split by `1px` dividers). Each: line icon → h3 serif title → sm description. Titles: *Plain English · Always sourced · Real free help*.
- **How it works**, bg `paper-warm`, brass-rule eyebrow, **3 columns**: a `38px` circle with `1.5px brass` border + serif numeral → h3 title → sm copy. Steps: *Answer a few questions · Get your pathway & date · Use the draft & get help*.
- **Get-help strip**, bg `navy`, padding `42px 40px`, space-between: serif white heading "Would rather talk to a person?" + sub in `#aebfd2`; **brass button** "Get free help".
- **Footer**, bg `navy-dark`, `2px brass` top border, text `#9fb0c4`: crest + wordmark · disclaimer line ("General information, not legal advice. We never store what you enter. Victoria, Australia.") · links (About · Your privacy · Get help).

**Layout (mobile, 375):** single column. Status bar (mock) → header (58px, 2px navy border, crest + hamburger) → hero (`paper-warm`, 28px H1, stacked **full-width** primary + secondary buttons, centred privacy line) → trust items as a **ruled list** (each row 16px padding, `line` divider) → navy get-help block with brass button. (Teaser card may be omitted on mobile, as in the reference.)

**Key copy:** see reference verbatim; reading level ~Year 6.

---

### 2. Guided Wizard (`/start`)
**Purpose:** Calm step-by-step intake; one decision at a time. **Step 1 of 3 is fully designed**; Steps 2–3 follow the same shell (Step 2 = optional date + optional free-text "anything to add" with a privacy reassurance; Step 3 routes to the Result).

**Shell (all steps):**
- **Wizard header** (desktop), padding `20px 40px`, `line` bottom border: left crest + wordmark; centre **progress** — label row ("Step N of 3 · <title>" in `navy` + "NN%") above a **5px track** (`paper-sunk`) with a **`brass` fill** (square ends — 33% at step 1); right a **44px** square (`radius 8`, `line` border) **close "×"** button.
- **Body**, bg `paper-warm`, padding `54px 40px 58px`, centred column max **780px**.
- **Footer nav**: left **"← Back"** (muted `#9aa3ac` and disabled on step 1), right **primary** "Continue →" (54px). Below: centred privacy line "Nothing you enter here is stored."

**Step 1 — "What is your decision about?":**
- Serif **H2** centred + sm subhead ("Pick the closest one. You can change it later.").
- **2×2 grid** (gap 16) of **selectable cards** (icon well + serif h3 title + sm description). The first ("Renting / notice to vacate") shown **selected**. The four: *Renting / notice to vacate · Fines & infringements · Public & community housing · A Victorian gov decision*.
- Below the grid: a **dashed-border** full-width option — "None of these — **let me paste my letter**" (opens a paste box that routes to the right guide).

**Mobile:** sticky header shows "Step 1 of 3" + 36px close "×" above the brass progress track; cards stack **single-column** (icon well 46px); dashed paste option last; sticky footer with "← Back" + full-width "Continue →".

---

### 3. Result experience (shared by wizard / ask / decode)
**Purpose:** Dense but scannable answer. Strong sectioning so a stressed person isn't overwhelmed, while the deadline / sources / disclaimer / get-help stay visible.

**Layout (desktop):** header (64px, `2px navy` border): **"← Start over"** · centred crest+wordmark · **"Print"** outline button. Below, a two-column body on `paper-warm`:
- **Main column (`1.7fr`, padding 36):**
  1. **Header block** — brass eyebrow category ("Renting · Notice to vacate") → serif **H2** answer ("You can ask VCAT to review your notice to vacate.").
  2. **"What this is about"** card — serif h3, body paragraph, then a **disclaimer** with a `3px brass` left border on `paper-warm` ("general information … not legal advice").
  3. **DEADLINE CARD — signature** (see below).
  4. **"What can help your case"** card — serif h3 + checklist (rounded-square check icons stroked `help`).
  5. **"A draft letter to start with"** card — serif h3 + **Edit** (secondary) / **Download** (primary navy) buttons; the draft preview in a `paper-warm` inset, **set in Libre Baskerville** to read like a letter.
- **Right rail (`1fr`, padding 36 0 36 0, `sticky top:20px`):**
  - **"Where this comes from"** (sources) card — serif h3 + list, each item with a **`2px brass` left border**: link in `navy` 600 + grey meta.
  - **"Get free help"** card — serif h3 + the **three tiers** (see below).
  - **Privacy motif** block ("Nothing on this page was saved…").

**Deadline card (the signature moment):**
- **Double-rule frame:** outer `gold-soft` bg + `gold-line` border `radius 12`, padding 6, holding an inner box with `gold-line2` border `radius 9`, padding 24. `shadow-deadline`.
- Gold-tone eyebrow + clock icon: "YOUR TIME LIMIT TO APPLY".
- Row: left the **date** in **serif 34px `gold-strong`** ("Tuesday 8 July 2025") + sub "Apply to VCAT by this date…"; right a white **"14 / days left"** box (serif 44px `gold`, `gold-line` border).
- **"How it's counted"** white inset: "30 days from the date on your notice (8 June 2025). Counting includes weekends and public holidays."
- Buttons: **gold primary** "Add a reminder to my calendar" (calendar-plus icon) + secondary "How this date works".

**Tiered "get help" (order matters — free is encouraged, paid is clearly secondary):**
- **Tier 1 · Free government** — `help-soft` bg, `3px help` left border: "VCAT · Lodge your review · 1300 018 228".
- **Tier 2 · Free legal help** — `navy-soft` bg, `3px navy` left border: "Tenants Victoria · Legal Aid".
- **Tier 3 · Paid** — white, `line-card` border, `3px #cdd3da` left border, muted text: "Find a private lawyer · Law Institute referral · fees apply".

**Mobile result:** single column, stacked in this order — header (52px) → category + serif H1 (22px) → "What this is about" → **deadline card** → **get free help** (3 tiers) → **sources** → privacy line. The deadline card keeps the double-rule frame; the date shows "Tue 8 July 2025" with the "14 / days left" box beside it and a full-width gold "Add reminder to calendar" button. **Never let deadline/sources/get-help fall off-screen.**

**State — deadline can't be confirmed:** same gold double-rule panel, but with a **warning-circle** icon and eyebrow "A TIME LIMIT APPLIES", serif heading "There's a deadline here — but we couldn't confirm the exact date.", calm body, and two buttons: **help-green** "Who can confirm my date →" + secondary "Why we're not sure". It must read as a normal, dignified outcome — **not an error**.

---

## Interactions & Behaviour
- **Primary navigation:** Landing "Find out what you can do" → `/start`. Wizard "Continue" advances steps; "Back" returns (disabled on step 1); "×" exits to `/`. Result "Start over" → `/start`.
- **Wizard selection:** tapping an area card selects it (single-select; selected style above) and enables "Continue". The paste option reveals a textarea and routes to the matching guide.
- **Add to calendar:** generates an `.ics` (or Google Calendar link) for the deadline date; no account, no storage.
- **Draft letter:** editable in place; **Download** (.txt/.docx/print) and **Print**. Nothing persisted server-side.
- **Sheets/modals (mobile):** must have a sticky header with a visible "×"; closeable by button (not backdrop-tap alone).
- **Hover/active/focus:** primary buttons darken on hover; **all** interactive elements show a visible focus ring (`--wn-focus-ring`). Links underline on hover/focus.
- **Loading states:** calm skeletons/!spinners on the `paper-warm` surface; never an alarming or "AI thinking" treatment.
- **Responsive:** mobile-first at 375; the documented desktop two-column layouts engage at the codebase's `lg` breakpoint. Long entity names must wrap; the sticky rail and the deadline must never be pushed out of view.

### Motion notes (subtle, purposeful; must degrade)
- Step transitions: a 150–200ms fade/slide of the wizard body only; progress bar width animates 200ms ease.
- Card select: 120ms border/shadow transition.
- **Respect `prefers-reduced-motion: reduce`** — disable slides/auto-animations, keep instant state changes.

---

## State Management
This is a **stateless, no-login** product — keep all of it client-side and ephemeral.
- `wizard.step` (1–3), `wizard.category` (renting | fines | housing | gov | paste), `wizard.decisionDate?`, `wizard.note?`, `wizard.pastedText?`.
- `result` = derived from a **curated, sourced rules base** (grounded-or-silent). It yields: explanation, pathway(s), each pathway's **deadline** (date, daysRemaining, countingMethod) or a `cannotConfirm` flag, evidence checklist, draft letter template, sources[], help tiers.
- **Do not** persist user input to any store, cookie, or backend. Calendar/letter outputs are generated on the client.
- Trust surfaces (deadline, sources, disclaimer, get-help) are **always rendered** when a result exists — they are not optional/collapsible away.

---

## Assets
- **Wordmark crest, area icons, and all UI icons** are inline SVGs in the reference file — re-draw them as components or map to the codebase's icon library (calm, non-techy line style; no AI/robot/sparkle motifs).
- **Fonts:** Libre Baskerville (400/700) — Google Fonts or self-hosted. System sans needs no asset.
- **To produce (not yet designed):** favicon + app-icon set from the crest, and a 1200×630 OG/social share image. Flag to product/design if in scope.
- No photography is required for these three screens.

## Files
- `design-reference/What Now — Direction C.dc.html` — the hi-fi design reference (open in a browser to inspect exact layout/colour/spacing; it shows desktop **and** 375px mobile for each screen, plus the system strip and the can't-confirm state).
- `design-reference/DESIGN_BRIEF.md` — the full original product brief (safety model, full screen inventory, accessibility bar).
- `design-tokens/tokens.css` — CSS custom properties with AA contrast notes.
- `design-tokens/tailwind.tokens.cjs` — Tailwind `theme.extend` fragment matching the tokens.

## Out of scope / do not change (from the brief)
- The flow logic and safety model: **grounded-or-silent, info-not-advice, never an unsourced deadline**, and deadline + sources + disclaimer + get-help on **every** result.
- Anything that adds accounts, logins, data collection, or stores the user's details.
- Any visual that implies advice, predicts an outcome, references AI, or asks for an API key.
