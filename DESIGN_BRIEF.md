# Design brief — "What Now?" professional design pass (v3)

**For:** a professional UI designer / Claude Design.
**Goal:** a professional design pass over the **complete** What Now? site, and — the headline
addition — a **persistent side chat** (a docked chat launcher + panel on every page, like the
FairGo project). This is a polish + extend pass on an existing, working, on-brand app; keep the
flow logic and safety model intact.

> **v3 note.** This supersedes the earlier briefs. The app is fully built and live in the
> approved **"Chambers"** visual direction (navy + brass + gold + ivory, Libre Baskerville
> headings). All screens below exist and work. Two things are new since v2: (1) the site has
> grown (chat page, contact, terms, a fuller FAQ); (2) we now want the chat available as a
> **persistent side panel across the whole site**, not only on its own page.

---

## 1. What it is (one line)
A free, **login-free** web app that helps ordinary Victorians (Australia) understand and respond
to a government decision — a notice to vacate, a fine, a public-housing decision, or any state
decision. It explains the letter in plain English, finds the **review pathway and the exact time
limit (a real date)**, drafts the first letter, and routes to **free help** — grounded in a
curated, sourced rules base, or it says "I'm not sure, here's who can help." **Nothing the user
enters is stored.**

## 2. Who it's for (design for the vulnerable, not the average)
People who just got a government "no" — often **stressed, low-literacy, non-English-speaking,
elderly, disabled, or in financial hardship**, frequently on a phone. Make them feel **calm,
capable, and not judged**. Tone: a trusted community legal centre / good public service — **not**
a law firm sales site, **not** a startup, **not** a chatbot.

## 3. The feeling
Calm & reassuring (trauma-informed) · trustworthy & grounded · warm & human · ruthlessly clear
(one obvious thing to do per screen, generous space, large type).

## 4. Non-negotiables (these bound the design)
1. **Accessibility is a hard requirement.** WCAG 2.1 AA contrast on every text/bg pair
   (axe-clean today — keep it that way); **mobile-first at 375 px**; touch targets ≥ 48 px; full
   keyboard + screen-reader support; **visible focus**; respects `prefers-reduced-motion`;
   ~Year-6 reading level.
2. **Trust surfaces are load-bearing.** Every result keeps visible: the **deadline**, a
   **sources** panel, a **disclaimer** ("general information, not advice"), and **"get free
   help."** Never hide these behind disclosure.
3. **The deadline is the payoff** — a concrete date + days-remaining + "add to calendar."
   Unmissable, serious-but-not-panic (the gold/amber "clock" tones, **never red**). The
   "can't-confirm" state must feel equally calm and intentional, not like an error.
4. **Honest "uncertain" states feel safe, not failed** ("we're not sure — here's who can help").
5. **No AI / tech framing anywhere.** No robots, sparkles, "AI" badges, neon, typing-bot tropes.
   The chat is a calm, plain helper — never marketed as an "AI assistant."
6. **Privacy is a headline feature.** "We never keep your details" recurs as a small lock motif,
   including inside the chat.
7. **Multilingual-ready.** Tolerate long strings (long agency names, future locales); wrap/
   truncate gracefully; never let the deadline / sources / help / chat controls get pushed off.
8. **One primary action per screen.** The single conversion action is **"Find out what you can
   do"** (the wizard at `/start`); the side chat and "Ask a question" are secondary entries.
9. **Mobile is first-class.** Any sheet/modal/chat panel needs a **visible "×" in a sticky
   header** (never backdrop-tap alone) and a trapped, scrollable body.

## 5. Foundation — the established "Chambers" system (build within this)
Next.js + Tailwind, themed by CSS-variable tokens (already in code; refine, don't discard).

| Token | Hex | Use |
|---|---|---|
| `ink` / `ink-soft` / `ink-faint` | `#14253a` / `#44566b` / `#5f6b78` | body / secondary / meta (faint is AA-tuned) |
| `paper` / `paper-warm` / `paper-sunk` | `#ffffff` / `#f7f4ee` / `#eef0f2` | surfaces; ivory page bg |
| `navy` / dark / soft / ink | `#1b3a5b` / `#122a44` / `#e7edf3` / `#102744` | primary action, links, tier-2 |
| `brass` / text | `#b08d57` / `#6f5527` | hairline rules, eyebrows (text-tone for labels) |
| `gold` (clock) + soft/line | `#8a5a14` / `#f6edda` / `#e6d5ab` | the deadline (amber, never red) |
| `help` / soft / ink | `#2c5544` / `#e4ede7` / `#173e2c` | get-help / tier-1 |
| `line` / `line-card` | `#dde1e6` / `#e2e5ea` | hairlines, card borders |

Type: **Libre Baskerville** (700) for the wordmark + all headings; system sans for body. One card
pattern, one tag/label treatment, squarer radii (button 8, card 10, panel 12), soft shadows.
Wordmark: a navy "WN" crest with a brass inset frame; "What Now?" with the "?" in brass.

## 6. The persistent side chat (NEW — the headline ask)
A calm, **always-available chat** the way FairGo docks one — a launcher on every page that opens a
side panel. The chat is an **intake helper**: it talks the person through their situation in plain
language and routes them to their guide; it does **not** dispense detailed law (the verified Result
does). **Ephemeral — the conversation is never stored.**

**Launcher (closed state):** a small, calm, fixed control at the **bottom-right** (respecting
mobile safe-areas), present site-wide. A speech-bubble or "Chat with us" pill in navy/brass — **no
robot/sparkle/AI iconography.** Dismissible; remembers dismissal for the session only.

**Panel (open state):**
- **Desktop:** a docked panel on the right, ~**380–420 px** wide, near-full height (or a tall
  bottom-right card), above content with a subtle scrim. Sticky header: a short title (e.g. "Work
  it out with us") + a visible **×**. Scrollable message list. Sticky composer (textarea + Send) at
  the bottom with a small **privacy line** ("Not stored").
- **Mobile (375):** opens as a **full-screen sheet** with a sticky header + visible ×; the composer
  pinned to the bottom above the keyboard.
- **Messages:** assistant turns left (ivory/paper card, hairline), user turns right (navy). A calm
  **"thinking" indicator** (never "AI is typing"). `aria-live` so screen-readers hear new replies.
- **Handoff:** when the chat has understood the matter, show a prominent **"See your guide →"**
  action (and the captured matter/date) that opens the verified Result. This is the chat's goal.
- **States to design:** launcher (idle / attention nudge) · empty/greeting · in-conversation ·
  thinking · handoff-ready · **unavailable** (a calm "chat isn't available right now — use the
  step-by-step guide or see free help") · error.
- **A11y:** the open panel is a focus-trapped dialog (`role="dialog"`, labelled), Esc closes,
  focus returns to the launcher; reduced-motion disables the slide-in.

**Where it appears:** site-wide on content/marketing pages (landing, FAQ, help, about, etc.). On the
**focused tool surfaces** (the wizard steps and the Result) recommend **suppressing or minimising**
the launcher so it doesn't compete with the task — designer's call, but keep those surfaces calm.
There is also a dedicated **`/chat` full-page** experience that shares the same engine; the side
panel is the primary, ever-present entry, and the page is the deep-linkable/full-screen version —
design them to feel like one thing.

## 7. The result experience (two flavours, one page)
Reached from the wizard, `/ask`, `/decode`, or the chat handoff. The top is either a short **written
answer** (ask/decode/chat) **or** the pre-written **guide** (wizard) — both above the **same**
blocks: "what this is about" + disclaimer → the **deadline card** → "what can help" → an editable
**draft letter** → **sources** rail → **tiered get-help** → privacy line. Two-column main + sticky
rail on desktop; stacked on mobile. The written paths take a few seconds → a **calm loading state**
(neutral, never "AI is thinking").

## 8. Full screen inventory (all live today)
1. **Landing** (`/`) — trust funnel: hero + payoff teaser → trust band → how-it-works → navy
   get-help strip → footer.
2. **Wizard** (`/start`) — focused 3-step intake (area cards → date → Result); own header with a
   brass progress rule + close ×.
3. **Result** — §7 (shared).
4. **Side chat** (every page) + **`/chat`** full page — §6.
5. **Ask a question** (`/ask`) and **Scan/paste a letter** (`/decode`) — secondary tool inputs +
   their states (answered / not-covered / OCR-unavailable / over-limit).
6. **FAQ** index (`/faq`) + **article** (`/faq/[slug]`) — Victorian Q&A; sources + disclaimer + CTA.
7. **Get help** (`/help`) — the three tiers (free govt/tribunal → free legal → private lawyer).
8. **Contact** (`/contact`), **About** (`/about`), **Your privacy** (`/privacy`), **Terms**
   (`/terms`) — content/form pages.
9. **System pieces** — header/nav, footer, analytics-consent banner, loading & error states, 404.

## 9. Where to invest
- **The persistent side chat** — the headline new surface; make it inviting yet calm, and flawless
  on mobile.
- **The deadline card** — the signature moment (date + days-left + add-to-calendar) and its calm
  can't-confirm variant.
- **Result-page hierarchy** — dense; strong sectioning so it never overwhelms while trust surfaces
  stay visible.
- **Brand** — "What Now?" is the working name (no custom domain yet); a refined wordmark/crest +
  a calm, human (non-techy) icon set would help.
- **Mobile polish** at 375 px across every screen, the chat sheet, and every state.

## 10. Deliverables we'd love
1. A **design system** refresh expressed as Tailwind-mappable tokens (colour scale with AA notes,
   type scale, spacing, radii, shadows, component specs).
2. **High-fidelity mockups** (desktop + 375 px) of: landing, wizard steps, the Result (with the
   deadline card), the **side chat** (launcher + open panel + mobile sheet + thinking/handoff/
   unavailable states), the tiered get-help, and the FAQ article.
3. A **logo/wordmark** + favicon/app-icon refinement + social/OG treatment.
4. A calm **icon/illustration** set (incl. a non-techy chat launcher glyph and wizard-area icons).
5. **Motion notes** (subtle, purposeful; must degrade for reduced-motion) — esp. the chat open/close.
6. For each component, show its **empty / short / long-overflow** states (real Victorian content +
   long agency names + future locales).

## 11. Out of scope / please don't change
- The flow logic + safety model: **grounded-or-silent, info-not-advice, never an unsourced
  deadline**; deadline + sources + disclaimer + get-help on **every** result; the chat **routes,
  it doesn't give detailed legal answers**.
- Anything that adds accounts, logins, data collection, or stores the user's details (incl. chat
  history).
- Any visual that implies advice, predicts an outcome, references AI, or asks for an API key.

---
*One-line summary for the designer: give a stressed Victorian a calm, trustworthy place — with a
warm chat always one tap away on the side of the page — that turns a government "no" into a clear
date, a draft they can send, and free help, with the deadline, the sources, and the human help
always in plain sight.*
