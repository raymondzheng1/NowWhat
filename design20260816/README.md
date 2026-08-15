# Handoff: "What Now?" Landing Page — Sticker Album Theme

## Overview
Marketing/entry landing page for **What Now?** — a free service (Victoria & Commonwealth, en-AU) that explains government decision letters in plain English, lays out review pathways, and routes users to free human help. This design applies a "sticker album" visual language (physical stickers on cream paper) to a legal-help product while preserving strict trust-and-safety constraints.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to copy directly. The task is to **recreate this design in the target codebase's existing environment** (e.g. Next.js/React) using its established patterns and libraries — or, if no environment exists yet, choose the most appropriate framework and implement there. `landing-reference.html` opens directly in a browser and is responsive (desktop → 1 column under 900px).

## Fidelity
**High-fidelity (hifi).** Colors, typography, spacing, radii, shadows, rotations, copy and states are final. Recreate pixel-perfectly.

## Hard product constraints (non-negotiable, from the product brief)
1. **Deadlines are always amber and calm** — never red, never a countdown. Red is NEVER used for time pressure.
2. **"Talk to a person" route is always visible** (header pill + "Humans: available. Free." section).
3. **Standing disclaimer on every page**: "What Now? gives general information, not legal advice…"
4. **Privacy line everywhere**: lock icon + "FREE / NO ACCOUNT / NOTHING STORED". No accounts exist.
5. **Accessibility**: all text/background pairs AA; tap targets ≥ 44px (CTAs 48–52px); body ≥ 14.5px (main body 17–19px); status is always glyph + word + colour, never colour alone.
6. **Light-only** (paper is paper) — no dark mode.
7. All fonts are OFL, on Google Fonts, self-hostable via `next/font`.

## Screens / Views

### Landing page (single view, responsive)
Sections top to bottom. Max content width 1180px, 24px side padding. Background: cream `#F6EDD9` with dot grain: `radial-gradient(rgba(43,36,23,.07) 1px, transparent 1px)`, `background-size: 13px 13px`.

**1. Header** — bottom border 2px ink. Left: logo sticker (white bg, radius 8, padding 8×16, rotate −1.2°, shadow `0 3px 0 rgba(43,36,23,.28)`), "WHAT NOW" Archivo 900 19px ink + red "?". Right nav: Archivo 800 13px uppercase, letter-spacing .06em, color `#5C5138`; links Work it out / Scan a letter / Ask; last item is a red pill sticker "A person, any time" (radius 999, padding 12×20, min-height 44, rotate +0.8°).

**2. Hero** — 2-col grid `1.25fr 1fr`, gap 52, padding 64 top / 52 bottom.
- Left: Caveat 600 24px tan note "the day the letter arrived — start here" (rotate −1.4°); H1 Archivo 900 88px (clamp to 42px on mobile), line-height .97, letter-spacing −.03em, ink: "They said no." then "You may say: look again." — "look again." highlighted with `box-shadow: inset 0 -10px 0 rgba(224,69,44,.35)` (marker underline, not border). Body 19px `#5C5138`, max-width 560px. Lock line (mono 12.5px): "FREE / NO ACCOUNT / NOTHING STORED".
- Right: **the foil card** — the ONLY iridescent element allowed on the page: wrapper `linear-gradient(115deg,#E9D8FF,#FFE9C7,#D2F4E0,#CFE6FF)`, radius 12, padding 6, rotate +1.6°, shadow `0 4px 0 rgba(43,36,23,.3)`; inner white card radius 9, padding 26. Label "RECOMMENDED · START HERE" (Archivo 900 13px tan) + Caveat note "the one thing to do first". Title "Find out what you can do" Archivo 900 26px. Primary CTA "Start now →" + secondary "Scan or paste the letter".

**3. Three ways to start** — Caveat note heading; 3-col grid, gap 26. Each card: white, radius 12, padding 22, deterministic rotations **−1.5° / +0.9° / +2.2°**, shadow `0 3px 0 rgba(43,36,23,.28)`. Contents: 44px gradient number chip (radius 8, Archivo 900 17px white, shadow `0 2px 0 rgba(43,36,23,.25)`) — 01 `linear-gradient(135deg,#2B8A4B,#3AA08A)`, 02 `linear-gradient(135deg,#2F6FBF,#3AA08A)`, 03 `linear-gradient(135deg,#7A4FB3,#C95F8E)`; title Archivo 900 21px ink; body 14.5px; red action link Archivo 800 13px uppercase ("Begin →" / "Read it →" / "Ask →").

**4. Deadline + Empty slot** — 2-col grid, gap 26.
- **Time-limit card (amber, calm)**: bg `#FBF3D9`, border 2px `#E0A52C`, radius 12, rotate −0.6°, shadow `0 3px 0 rgba(43,36,23,.25)`. Label "◔ TIME LIMIT — NOTED EARLY, KEPT CALM" Archivo 900 12.5px `#8A6A14`; headline "Usually 28 days to ask for a review." Archivo 800 19px ink (tabular numerals); body 14.5px; mono source line "SOURCE: VCAT — APPLICATION TIME LIMITS" 12px `#8A6A14`.
- **Empty slot (signature device)**: border 3px dashed `#E0452C`, radius 12, bg `rgba(224,69,44,.06)`, rotate +1.1°, **no shadow** (it's a gap, not a sticker). Label "EMPTY SLOT — YOUR FIRST LETTER" `#C9553D`; headline "This slot is empty until we draft it together."; body copy; Caveat note "goes here ↑ when you're ready". Use this pattern for anything absent/pending — never for deadlines.

**5. Human help** — white card sticker (rotate −0.7°, shadow `0 4px 0`): "Humans: available. Free." Archivo 900 24px; line "Talk to a person whenever you like — they can take it from here."; three cream pills (radius 999, Archivo 800 12px uppercase, rotations −0.8°/+0.6°/−0.6°): Legal Aid / Community legal centres / Tribunal registries; red primary CTA "Find free help near you →" (rotate +1.2°).

**6. Footer** — top border 2px ink. Disclaimer 14px (bold ink lead-in). Mono link row ABOUT / PRIVACY / TERMS (tan, underlined, offset 3px) + lock line "NOTHING STORED · VIC & CTH · EN-AU".

## Interactions & Behavior
- **Sticker hover** (pointer devices): straighten to 0° and lift −2px, `transition: transform 150ms ease, box-shadow 150ms ease`.
- **Sticker press (:active)**: translateY(+1px) and shadow collapses to `0 1px 0` — "sticking it down".
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` — disable transitions and hover straightening entirely.
- **Focus-visible**: double ring `box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px #2B2417` (white gap + ink ring). Never remove outlines without this replacement.
- **Rotations are deterministic per item** (fixed values in markup/config), never randomized at runtime.
- Navigation targets: "Start now" and card 01 → /start (triage flow); card 02 / "Scan or paste the letter" → /decode; card 03 → /ask; "A person, any time" and "Find free help near you" → /help.
- Responsive: grids collapse to 1 column ≤ 900px; H1 clamps 42–88px; phone-first checked at 390px; tap targets stay ≥ 44px.

## State Management
Landing is static (no fetching). Global UI state only: none required. The empty-slot card is presentational here; in the app flow the same slot pattern is bound to `firstLetterDraft: null | Draft` (null → dashed empty slot; present → filled white sticker card).

## Design Tokens
Colors:
- Paper `#F6EDD9` · Ink `#2B2417` · Body `#5C5138` · Tan (muted/notes) `#8A7A55`
- Accent red `#E0452C` · Deep red `#C9553D` · Text-on-red `#FFF6EC`
- Sticker-face gradients: green `#2B8A4B`, blue `#2F6FBF`, yellow `#E0A52C`, purple `#7A4FB3`, teal `#3AA08A`, pink `#C95F8E`
- Amber (deadline-only): bg `#FBF3D9`, border `#E0A52C`, ink `#8A6A14`
- Foil gradient: `linear-gradient(115deg,#E9D8FF,#FFE9C7,#D2F4E0,#CFE6FF)` — **max one foil element per screen**, reserved for the single recommended action.
- Status (always glyph + word + colour): ▲ needs `#2F6FBF` · ✓ on target `#2B8A4B` · ▼ rest/closed `#C9553D`

Typography (all OFL / Google Fonts, self-host via `next/font`):
- Display & buttons: **Archivo** 800/900 (H1 88/42 clamp · card titles 21–26 · section labels 12.5–13 uppercase, ls .08–.14em)
- Handwritten notes: **Caveat** 600, 20–24px, tan, small rotations
- Body: system sans stack, 14.5–19px, line-height 1.55–1.6
- Receipt/meta: **Spline Sans Mono**, 12–12.5px, ls .04–.06em
- All numerals tabular (`font-variant-numeric: tabular-nums`)

Radii: stickers 8px · cards 12px · CTAs 14px · pills 999px · foil inner 9px.
Shadows (hard offset, no blur): resting `0 2–4px 0 rgba(43,36,23,.25–.3)` · pressed `0 1px 0` · chips `0 2px 0 rgba(43,36,23,.25)`.
Rotation scale: ±0.6° / ±0.7° / ±0.8° / ±0.9° / ±1.1° / ±1.2° / ±1.4° / ±1.5° / ±1.6° / ±2.2° — assign per element, keep stable.
Spacing: section padding 52–64px vertical · grid gaps 26px (52px hero) · card padding 20–26px.

## Copy (final, en-AU — keep honest and warm, no hype, no testimonials)
All copy is in the reference file verbatim; key strings: "They said no." / "You may say: look again." / hero paragraph / "Recommended · start here" / "Find out what you can do" / "Start now →" / "Scan or paste the letter" / card trio / time-limit card / empty-slot card / "Humans: available. Free." / disclaimer / "FREE / NO ACCOUNT / NOTHING STORED".

## Assets
No raster images. Two inline SVGs: padlock (stroke `#8A7A55`, 11–12px) and the hamburger (mobile). Fonts from Google Fonts (self-host in production).

## Files
- `landing-reference.html` — self-contained responsive reference (desktop + mobile behavior, hover/press/focus/reduced-motion states implemented). Open in a browser.
