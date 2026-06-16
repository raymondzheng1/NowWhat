# Design brief — "What Now?" UI uplift

**For:** a professional UI designer / Claude design.
**Goal:** a visual & UX uplift of an existing, working web app — elevate trust, warmth and
clarity without changing the product's safety model. This is a *re-skin and polish*, not a
re-architecture.

---

## 1. What it is (one line)
A free, **login-free** web app that helps ordinary people understand and respond to an
adverse government decision (a Centrelink debt, an NDIS cut, a visa refusal): it decodes
the letter in plain English, finds the **review pathway and the time limit**, drafts the
first document, and routes the advice step to a **real free legal service**.

## 2. Who it's for (design for the vulnerable, not the average)
People who have just received a government "no" and are often **stressed, low-literacy,
non-English-speaking, disabled, elderly, or in financial hardship**. Many are on a phone,
on a slow connection, and feeling powerless or ashamed. The design must make them feel
**calm, capable, and not judged** — the opposite of a cold government portal or a slick
fintech app.

## 3. The feeling we're designing for
- **Calm & reassuring** — trauma-informed. Lower the temperature; never alarm.
- **Trustworthy & grounded** — quietly authoritative. We tell people consequential things,
  so it must feel credible and honest, never gimmicky.
- **Warm & human** — supportive, plain-spoken, dignified. A helpful person, not a machine.
- **Clear above all** — one obvious thing to do on every screen. Generous space, large type.

Think: a trusted community legal centre or a good public-health service — *not* a law firm,
*not* a startup, *not* a chatbot.

## 4. Non-negotiables (these bound the design — please honour them)
1. **Accessibility is a hard requirement, not a nice-to-have.**
   - WCAG 2.1 AA contrast on every text/background pair (we serve people with low vision).
   - **Mobile-first**, must work at **375 × 812**; touch targets ≥ 48 px.
   - Keyboard + screen-reader friendly; visible focus states; respects `prefers-reduced-motion`.
   - Plain-language reading level (~Year 6) — design must not pressure copy to get clever.
2. **The trust surfaces are load-bearing, not decoration.** Every answer shows: a **sources
   panel** ("where this comes from"), a **disclaimer** ("general information, not advice"),
   and a **"get free help"** block. These must be *present and legible*, never hidden behind
   a tab or shrunk to fine print. Design them as first-class, calm components.
3. **The deadline is the single most important element.** When a date is known it must be
   unmissable and clear — *serious but not panic-inducing* (no aggressive red countdowns).
4. **Honest "uncertain" states must feel safe, not like errors.** "We're not sure — here's
   who can help", "a time limit applies but we can't confirm the exact date yet", "please
   paste the text" — these are normal, dignified outcomes, not failures. Design them warmly.
5. **No AI / tech framing anywhere.** No robots, sparkles, "AI" badges, chat bubbles, neon
   gradients. The user sees a helpful service, not the machinery.
6. **Privacy is a headline feature.** "We never keep your letter" should be visible and
   reassuring — a small trust motif, not buried in a policy page.
7. **Multilingual-ready.** English first, but the layout must tolerate **long strings** and
   future locales without breaking (test the longest labels). RTL-friendly is a plus.
8. **One primary action per screen, one destination.** The single conversion action is
   "start the tool" (scan / ask). Don't design competing primary buttons; secondary actions
   (get help, FAQ) are visually subordinate. The landing **section order is a trust funnel**
   (hero → two actions → trust → how-it-works → example → FAQ teaser → get-help → footer) —
   treat it as intentional, not a grid to rearrange.
9. **Define the system once, reuse everywhere.** A single card pattern, one tag/label
   treatment (consistent colour + uppercase, tracked, small-caps), one type scale, serif for
   headings. No bespoke one-off styling that duplicates a primitive.
10. **Mobile is a first-class canvas, not a shrink.** Design every screen *at* 375 px wide.
    Any sheet/modal needs a **visible close "×" in a sticky header** (never backdrop-tap
    alone) and must sit above all content. Plan for **variable-length content**: long agency
    /entity names and long localised strings must wrap or truncate gracefully (specify which)
    without shoving neighbours off-screen, and lists that grow (review pathways, evidence,
    sources) must never push the **deadline, sources, or "get help"** out of view.

## 5. Current foundation (please uplift *with* this, not against it)
Built in **Next.js (App Router) + Tailwind CSS**, themed via CSS-variable design tokens.
The current palette is calm and intentional — refine it, don't discard it unless you have a
strong reason:

| Token | Value | Use |
|---|---|---|
| `ink` / `ink-soft` / `ink-faint` | `#1a2733` / `#42505c` / `#6b7785` | body / secondary / captions |
| `paper` / `paper-warm` / `paper-sunk` | `#ffffff` / `#f7f5f1` / `#eef1f4` | surfaces; warm page bg |
| `brand` / `dark` / `soft` / `ink` | `#1f6f78` / `#155259` / `#e3f0f0` / `#0d3438` | primary (calm teal) |
| `clock` (deadline) / `soft` / `ink` | `#9a5b00` / `#fdf3e3` / `#5c3700` | the time-limit emphasis (amber, not red) |
| `help` (escalation) / `soft` / `ink` | `#2e6b4f` / `#e6f1ea` / `#173e2c` | "get help" (supportive green) |
| `line` | `#dfe3e8` | hairline borders |

Type: **Georgia / serif for headings** (warmth + authority), system sans for body.
Cards: 14 px radius, soft shadow. Buttons: ≥ 48 px tall. Readable measure: ~42 rem.

**Deliverables ideally map back to Tailwind tokens** (a colour scale, a type scale, spacing,
radii, shadows) so the build can adopt them directly.

## 6. Screens to design (the actual app)
1. **Landing** — trust-first funnel: hero ("Government said no? Find out what you can do") →
   two big entry points (**Scan/paste a letter**, **Ask a question**) → 3 trust cards (Plain
   language / Grounded in the rules / Private by design) → How it works (3 steps) → grounded
   example → FAQ teaser → closing "get help" CTA → footer.
2. **Scan / paste a letter** — file/photo upload **and** a paste-text box; a clear, reassuring
   privacy note ("read on the spot, then discarded").
3. **Ask a question** — a single plain-language question box; optional "use your own key".
4. **The result experience** (shared by both flows, the heart of the product):
   - the plain-English explanation ("what this is" / "what it means" / "what you may be able to do"),
   - the **Pathway + Deadline** block: a date input → the time limit shown per review route,
     with an "add a reminder to my calendar" action,
   - an **editable draft letter** (download / print),
   - the **sources panel** and the **get-help** block.
5. **States to design explicitly:** *answered*, *not covered → get help*, *deadline known*,
   *deadline not yet confirmed*, *photo OCR unavailable → paste instead*, *over free limit*.
6. **FAQ index + FAQ article page** (SEO content; article carries sources + disclaimer + a CTA back into the tool).
7. **Get help**, **About**, **Your privacy** — simple content pages.
8. **Small system pieces:** header/nav, footer, the analytics-consent banner, loading state.

## 7. Where to invest (current weak spots)
- **Identity:** the product currently has no logo/wordmark or real brand — naming is still
  open ("What Now?" is a working title). A warm, trustworthy identity + an OG/social image
  would help (it's a search-discovered product, so the share card matters).
- **The deadline** deserves a signature visual treatment (it's the product's "wow" / value moment).
- **Iconography & illustration:** a small, calm, human (non-techy) icon/illustration set for
  the flow steps, empty/uncertain states, and trust cards.
- **The result page** is information-dense — needs a clear visual hierarchy so a stressed
  person isn't overwhelmed (progressive disclosure is welcome, as long as sources/help/deadline stay visible).
- **Mobile polish** at 375 px across every screen and state.

## 8. Deliverables we'd love
1. A **design system**: colour scale (with AA contrast notes), type scale, spacing, radii,
   shadows, button/field/card specs — expressed so they map to Tailwind tokens.
2. **High-fidelity mockups** (desktop + 375 px mobile) of: landing, the scan & ask inputs,
   the full result experience, and the key states in §6.5.
3. A **logo/wordmark** + favicon/app-icon set + an **OG/social share image**.
4. A small **icon/illustration** set (calm, human, non-techy).
5. **Motion notes** (subtle, purposeful only; must degrade for reduced-motion).
6. For each component, show its **empty / short / long-overflow** states (so the build can
   handle real corpus content and other locales without breaking).

## 9. Out of scope / please don't change
- The flow logic, the safety model (grounded-or-silent, info-not-advice, never-an-unsourced-
  deadline), or the requirement that sources/disclaimer/get-help appear on every answer.
- Anything that adds accounts, logins, data collection, or stores the user's letter.
- Any visual that implies advice, predicts an outcome, or references AI.

---
*One-line summary for the designer: make a stressed person who just got a government "no"
feel calm, capable and safe — warm and human, quietly trustworthy, ruthlessly clear,
accessible to everyone, with the sources, the deadline and free help always in plain sight.*
