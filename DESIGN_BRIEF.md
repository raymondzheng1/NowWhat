# Design brief — "What Now?" UI uplift (v2)

**For:** a professional UI designer / Claude design.
**Goal:** a visual & UX uplift of an existing, working web app — elevate trust, warmth and
clarity without changing the product's safety model or its flow logic. This is a *re-skin
and polish*, not a re-architecture.

> **v2 note:** this supersedes the first brief. Since then the product changed in three
> important ways: (1) the primary flow is now a **step-by-step guided wizard**, not a
> one-shot box; (2) the **time limit is now a real, computed date** (the product's payoff
> moment); (3) scope is **Victoria, Australia only**, so content and examples are Victorian.

---

## 1. What it is (one line)
A free, **login-free** web app that helps ordinary Victorians understand and respond to a
government decision (a notice to vacate, a fine, a public-housing decision, or any state
decision): a few guided questions produce a plain-English explanation, the **review
pathway and the exact time limit**, a draft letter they can use, and a hand-off to **real
free help**. Everything is grounded in a curated, sourced rules base — or it says "I'm not
sure, here's who can help". **Nothing the user enters is stored.**

## 2. Who it's for (design for the vulnerable, not the average)
People who have just received a government "no" and are often **stressed, low-literacy,
non-English-speaking, disabled, elderly, or in financial hardship** — frequently on a
phone, on a slow connection, and feeling powerless or ashamed. The design must make them
feel **calm, capable, and not judged** — the opposite of a cold government portal or a
slick fintech app.

## 3. The feeling we're designing for
- **Calm & reassuring** — trauma-informed. Lower the temperature; never alarm.
- **Trustworthy & grounded** — quietly authoritative. We tell people consequential things.
- **Warm & human** — supportive, plain-spoken, dignified. A helpful person, not a machine.
- **Clear above all** — one obvious thing to do on every screen. Generous space, large type.

Think: a trusted community legal centre or a good public-health service — *not* a law firm,
*not* a startup, *not* a chatbot.

## 4. Non-negotiables (these bound the design — please honour them)
1. **Accessibility is a hard requirement.** WCAG 2.1 AA contrast on every text/background
   pair; **mobile-first**, must work at **375 × 812**; touch targets ≥ 48 px; keyboard +
   screen-reader friendly; visible focus; respects `prefers-reduced-motion`; plain-language
   reading level (~Year 6) — design must not pressure copy to get clever.
2. **The trust surfaces are load-bearing, not decoration.** Every result shows, and must
   keep legible: the **time limit / deadline**, a **sources panel** ("where this comes
   from"), a **disclaimer** ("general information, not advice"), and **"get free help"**.
   These are the safety model — design them as first-class, calm components, never hidden.
3. **The deadline is the product's payoff.** It is now a concrete date with days-remaining
   and an "add to calendar" action. It must be unmissable and clear — *serious but not
   panic-inducing* (the palette has a calm amber "clock" tone for exactly this; no harsh
   red countdowns). When the date isn't confirmable, the honest "a time limit applies —
   here's who can confirm it" state must feel equally calm and intentional.
4. **Honest "uncertain" states must feel safe, not like errors.** "We're not sure — here's
   who can help", "we matched this to a general guide", "please paste the text" — these are
   normal, dignified outcomes, not failures.
5. **No AI / tech framing anywhere.** No robots, sparkles, "AI" badges, chat bubbles, neon
   gradients. The user sees a helpful service, not the machinery.
6. **Privacy is a headline feature.** "We never keep your details" should be visible and
   reassuring — a small trust motif, not buried in a policy page.
7. **Multilingual-ready.** English first, but layouts must tolerate **long strings** and
   future locales without breaking (test the longest labels). RTL-friendly is a plus.
8. **One primary action per screen, one destination.** The single conversion action is
   **"Find out what you can do"** (the wizard at `/start`). Don't design competing primary
   buttons; secondary actions (ask a question, get help) are visually subordinate. The
   landing **section order is a trust funnel** (hero → two actions → trust → how-it-works →
   example → FAQ teaser → get-help → footer) — treat it as intentional, not a grid.
9. **Define the system once, reuse everywhere.** A single card pattern, one tag/label
   treatment (consistent colour + uppercase, tracked, small-caps), one type scale, serif
   for headings. No bespoke one-off styling that duplicates a primitive.
10. **Mobile is a first-class canvas, not a shrink.** Design every screen *at* 375 px. Any
    sheet/modal needs a **visible close "×" in a sticky header** (never backdrop-tap alone).
    Plan for **variable-length content**: long agency/entity names and long localised
    strings must wrap or truncate gracefully without shoving neighbours off-screen, and the
    deadline, sources, and "get help" must never be pushed out of view.

## 5. Current foundation (please uplift *with* this, not against it)
Built in **Next.js (App Router) + Tailwind CSS**, themed via CSS-variable design tokens.
The current palette is calm and intentional — refine it, don't discard it without reason:

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
**Deliverables should map back to Tailwind tokens** (a colour scale, a type scale, spacing,
radii, shadows) so the build can adopt them directly.

## 6. The core experience to design (the heart of the product)

### 6.1 The guided wizard (`/start`) — the primary flow
A calm, **step-by-step** intake (designed for a stressed person, one decision at a time):
- **Step 1 — "What is your decision about?"** A short list of clear, tappable **cards**:
  *Renting / notice to vacate · Fines & infringements · Public & community housing · A
  Victorian government decision*. Plus a quieter option: *"None of these — let me paste my
  letter"* (opens a paste box that routes them to the right guide).
- **Step 2 — "When was the decision made?"** A single date input (optional) + an optional
  free-text "anything to add" box. Reassure that it's not stored.
- **Step 3 — the result** (see 6.2).
Design needs: a clear sense of **progress** (where am I, how many steps), easy **back**,
big touch targets, and a calm, unintimidating tone. No dead-ends — every path leads to
either a result or "get help".

### 6.2 The result / answer experience (reached from the wizard, Ask, or Decode)
Information-dense; needs a strong, scannable hierarchy so a stressed person isn't
overwhelmed. In order, it currently shows:
1. **"What this is about"** — a plain-language explanation + the disclaimer.
2. **Pathway + the deadline** — the review route(s); for each, a **deadline card** showing
   the **concrete date, days remaining, how it's counted**, and an **"add a reminder to my
   calendar"** button. This is the signature moment — give it the strongest treatment.
3. **What can help** — grounds + an evidence checklist.
4. **A draft letter** — an editable text block with download / print.
5. **Sources** — the trust panel.
6. **Get help** — the tiered directory (6.3).
Progressive disclosure is welcome **as long as the deadline, sources and get-help stay
visible/obvious**.

**Two content flavours, one page.** The top of the result is either a short *written*
answer (Ask: the question restated → a plain answer → a neutral next step; Decode: "what
this is" / "what it means" / your options) **or**, from the wizard, the pre-written guide.
Both sit above the *same* pathway+deadline, draft, sources and help blocks — design them to
feel like **one consistent page**, not two different ones. The written-answer paths take a
few seconds to produce, so design a **calm loading state** (e.g. "Finding the rules…") —
neutral and reassuring, never "AI is thinking" or any tech framing.

### 6.3 Tiered "get help"
Three visually distinct tiers, in this order: **(1) free government / tribunal** (VCAT, the
Victorian Ombudsman, Fines Victoria, Housing Appeals Office) → **(2) free legal services**
(Victoria Legal Aid, community legal centres, Tenants Victoria, Justice Connect) → **(3) a
private lawyer** (a referral link + a "search for a lawyer" link, clearly marked as paid).
Design the tier hierarchy so "free" reads as the encouraged path and "paid" is clearly
secondary.

## 7. Full screen inventory
1. **Landing** (`/`) — trust-first funnel; primary CTA "Find out what you can do" → wizard;
   secondary "Ask a question". Trust cards, how-it-works, a real grounded example, FAQ
   teaser, get-help, footer.
2. **The wizard** (`/start`) — §6.1, the primary surface + its states.
3. **The result experience** — §6.2 (shared by wizard / ask / decode).
4. **Ask a question** (`/ask`) — secondary: a single plain-language question box → result.
5. **Scan or paste a letter** (`/decode`) — secondary: upload/photo + paste, with a clear
   "read on the spot, then discarded" privacy note.
6. **States to design explicitly:** *result with a confirmed deadline*, *result where the
   deadline can't be confirmed*, *not covered → get help*, *photo OCR unavailable → paste
   instead*, *over the free limit*.
7. **FAQ index + FAQ article** (`/faq`) — Victorian Q&A; the article carries sources +
   disclaimer + a CTA back into the wizard, and cross-links to related questions.
8. **Get help** (`/help`) — the tiered directory (§6.3) as a standalone page.
9. **About** (`/about`) and **Your privacy** (`/privacy`) — simple content pages.
10. **System pieces:** header/nav, footer, the analytics-consent banner, loading states.

## 8. Where to invest (current weak spots)
- **The wizard flow** — make the step-by-step feel effortless and reassuring; this is the
  front door and most of the perceived quality lives here.
- **The deadline card** — now a real date; it deserves a signature, calm-but-prominent
  visual (date, days-left, "add to calendar"), plus a matching calm treatment for the
  "can't confirm yet" variant.
- **Result-page hierarchy** — it's dense; strong sectioning, anchors, and progressive
  disclosure so it never overwhelms while keeping the trust surfaces visible.
- **Tiered help** — a clear, warm visual hierarchy across the three tiers.
- **Identity** — the product still has no logo/wordmark or real brand; naming ("What Now?")
  is a working title. It launches in **Victoria** but the architecture can expand to other
  jurisdictions, so avoid a VCAT-only identity. A warm, trustworthy wordmark + favicon/app
  icons + an OG/social share image would help (it's a search-discovered product).
- **Iconography & illustration** — a small, calm, human (non-techy) set for the wizard
  steps, the area cards, empty/uncertain states, and trust cards.
- **Mobile polish** at 375 px across every screen and state.

## 9. Deliverables we'd love
1. A **design system**: colour scale (with AA contrast notes), type scale, spacing, radii,
   shadows, button/field/card specs — expressed so they map to Tailwind tokens.
2. **High-fidelity mockups** (desktop + 375 px mobile) of: the landing, the **wizard steps**,
   the **result experience** (with the deadline card), the tiered get-help, and the key
   states in §6/§7.
3. A **logo/wordmark** + favicon/app-icon set + an **OG/social share image**.
4. A small **icon/illustration** set (calm, human, non-techy), including an icon per wizard
   area card.
5. **Motion notes** (subtle, purposeful only; must degrade for reduced-motion).
6. For each component, show its **empty / short / long-overflow** states (so the build can
   handle real Victorian content and other locales without breaking).

## 10. Out of scope / please don't change
- The flow logic, the safety model (grounded-or-silent, info-not-advice, never-an-unsourced-
  deadline), or the requirement that the deadline, sources, disclaimer and get-help appear
  on every result.
- Anything that adds accounts, logins, data collection, or stores the user's details.
- Any visual that implies advice, predicts an outcome, references AI, or asks for an API key.

---
*One-line summary for the designer: make a stressed Victorian who just got a government
"no" feel calm, capable and safe — a warm, step-by-step guide that ends in a clear date,
a draft they can use, and free help, with the deadline, the sources and the human help
always in plain sight.*
