# What Now? — Product Requirements (PRD)

**Working title:** "What Now? — your rights when government says no" (brand TBD). **Status:** v1 spec. **Owner:** Raymond. **Date:** 8 June 2026.
**Harness:** Inherits `C:\Users\Ivy\RayTasks\Projects\Harness.md`. **Stack tier: B** (KV-only; no Supabase/Auth/Stripe) — with two opt-in tracks ON: **§8 SEO** and **§11 AI content pipeline** (for the FAQ/article layer), and **§10 i18n** (multilingual, English-first).
**Relationship to the other apps:** same Tier-B engine and the same generation→verification→cost-guard core as Adaptive IRAC and AdminLaw Coach. The corpus here is a **curated knowledge base of review pathways** (authored and sourced by us), not user uploads and not study materials.

> **Core idea:** an ordinary person who has just received an adverse government decision (a Centrelink debt, an NDIS plan cut, a visa refusal, a council/fines notice) opens the app, either **scans/pastes the letter** or **asks a question in plain language**, and gets: what it means, **whether and how they can challenge it, by when** (the deadline), what to do next, a draft they can use, and — for the advice step — a hand-off to a real free service. Everything is **grounded in a curated, sourced rules corpus and verified**, in plain language, free, no login, and **never stored**. The grounded answers also publish as **SEO FAQ/article pages** that bring people in from search.

## 1. One-line product
A free, no-login web app that helps people understand and respond to government decisions — decode the letter, find the review pathway and deadline, draft the next step, escalate to human help — grounded only in a curated, sourced rules corpus, in plain language, with a search-discoverable FAQ library as the front door.

## 2. Why now / the need
- ~half of Australians hit a civil legal problem yearly; "dealing with government" is among the most common. Legal aid reaches ~8% of households; the ART had ~112,000 cases on hand. **Merits review is largely free — but people lose rights because they don't know they can challenge, what their grounds are, or that a short clock (often ~28 days) is running.**
- Generic AI is unsafe here (it hallucinates and gives confident wrong legal info to vulnerable people). Our **grounded-or-silent, verified-citation** engine is the safe alternative. Quebec's JusticeBot (18,000+ uses) proves the "information-not-advice" model works.
- The robodebt aftermath ($1.76bn unlawful debts, ~433,000 people) shows both the scale of harm and the public appetite for knowing their rights against government.

## 3. Goals & non-goals
**Goals (MVP)**
- No login. Two entry points: **Scan/paste a decision** and **Ask a question**.
- For a covered decision type: explain it plainly; identify the **pathway** (internal review / merits review (ART/VCAT) / Ombudsman / when it's a court matter); state the **deadline**; list **next steps + what evidence helps**; produce a **draft** (request for reasons or review-application skeleton); and **escalate** (find a CLC/Legal Aid/advocate).
- **Grounded + verified:** every statement/citation maps to a curated corpus entry and its authoritative source, or the app says "I'm not sure — here's who can help." Never predict outcomes. Never fabricate.
- **FAQ/SEO layer:** grounded answers to common questions publish as plain-language, search-optimised article pages (human-reviewed before publish), each CTA-ing into the tool.
- Free to the user; **US$5 model-spend cap per session** + optional BYO-key. Responsive, accessible, multilingual-ready (English first). Nothing about the user's letter is stored.

**Non-goals (MVP)**
- Not legal advice; no outcome prediction; no web research beyond the corpus; no accounts/DB/payments; no storage of user documents/answers server-side; not a replacement for legal aid (a bridge to it).

> **Settled MVP decision — no authentication, ephemeral/one-off sessions.** There is no login and no account. Each visit is a single ephemeral session: the user can scan letters, ask follow-up questions and regenerate drafts within that session (bounded by the $5 cap), but **nothing about them or their letter is stored on our servers** and there is **no saved matter to return to** across devices. The result is kept by the user (download/print) and/or a no-account **deadline reminder** (calendar file / optional email); `localStorage` gives single-device continuity only. Not storing the analysis is a deliberate **privacy feature** for sensitive government letters. **Post-MVP option:** if "save and resume without accounts" is later wanted, use the harness **§18 capability-codes** pattern (a private resume code/link, no password) — accepting that resuming requires storing the analysis, which trades against the "we never keep your letter" promise; revisit deliberately.

## 4. Users & JTBD (design for the vulnerable, not the average)
- **Primary:** people facing an adverse government decision — welfare/Centrelink recipients, NDIS participants, visa applicants, renters/public-housing tenants, people with fines/debts — often low-literacy, non-English-speaking, disabled, regional/remote, stressed.
- **JTBD:** "Government said no. Tell me what it means, whether I can do anything, by when, and help me take the first step — in language I understand, for free, without judging me."
- **Design implications:** plain language (target ~Year 6 reading level), multilingual, mobile-first, WCAG AA, trauma-informed tone, zero jargon, no login, no payment, no data kept.

## 5. The unified flow (both entry points converge)
```
[Scan/paste my letter]  or  [Ask a question]
        ↓ classify decision type → match a corpus pathway entry (or "not covered")
   Decode (plain English: what it says, why)
        ↓
   Pathway + Deadline  (which body, by when — the clock front-and-centre)
        ↓
   Next steps + what evidence helps
        ↓
   Draft (request for reasons / review-application skeleton) — download/print
        ↓
   Escalate / find help (nearest CLC, Legal Aid, relevant advocate)  — always available
```

## 6. Functional requirements (MVP)
### 6.1 Start (no login)
- Home with two big actions (Scan a letter / Ask a question) + the FAQ library. Session cookie for spend metering only. Optional BYO-key.
### 6.2 Scan / paste a decision (intake)
- Photo/upload (PDF/image) → OCR → text; or paste text. Classify the **decision type** and **issuing body**; map to a corpus pathway entry. If unmatched → "not covered yet — here's general guidance + who can help." **The letter is processed in memory and discarded; never stored or logged.**
### 6.3 Decode
- Plain-language explanation of what the decision says and means, grounded in the corpus + the letter's own content; no jargon; reading-level-checked.
### 6.4 Pathway + Deadline (the highest-value piece — "Deadline Guardian" built in)
- The review route(s) and the **deadline**, shown prominently with the date computed from the decision date the user gives. Optional reminder (email or calendar file) without an account. Every figure cites its corpus source.
### 6.5 Ask (the grounded Q&A — option #3, folded in)
- Free-text question → plain-language answer grounded only in the corpus, with sources, multilingual-ready; honest "not covered / see a human" states. This is also the engine behind the FAQ pages.
### 6.6 Next steps + draft
- A clear checklist + an editable **draft** (request for reasons under the relevant reasons provision; or a review-application/submission skeleton) the user can download/print. Drafts are scaffolds, not filed for the user.
### 6.7 Escalate / find help
- Always-present "get real help" with the relevant free services (CLC directory, Legal Aid, NDIS appeals advocates, etc.). The advice step is human.
### 6.8 FAQ / article library (SEO front door — option #3 productised)
- Grounded answers to common questions publish as plain-language **article pages**, search-optimised (§8), **human-reviewed before publish** (§9.2/§11.1), each grounded+verified and CTA-ing into the tool. This is the organic discovery channel that brings people in at the moment they Google their problem.
### 6.9 Cost guard
- Hard **US$5/session** model-spend cap (Upstash), per-IP limits, global daily budget kill-switch, fail-closed; **BYO-key bypasses**.

## 7. Grounding engine (the moat + the safety property)
1. **Curated, sourced corpus of review pathways** (authored by us, see `corpus/`), built into a committed `corpus/index.json` (entries + authorities/sources + deadlines + plain-language explainers). The **only** source of legal substance.
2. **Retrieval** over the corpus (keyword/BM-25-lite; embeddings only if needed) — DB-free.
3. **Verification (harness §11/§11.2):** every output's authorities/claims map to a corpus entry + source; structure gate (decode/pathway/answer shapes); jurisdiction gate; **no-advice / no-outcome-prediction gate** (bans first-person advice and "you will win/lose" patterns — §11.2 tone gate); pinpoint/source-binding gate. Fail → regenerate from clean context; exhausted → "not covered — here's who can help." Never fabricate.
4. No AI-mentions in user copy; keys server-side; prompt caching; cache deterministic inputs.

## 8. Non-functional
- **Safety > everything:** wrong legal info harms vulnerable people → grounded-or-silent; always offer human help.
- **Privacy:** government letters are sensitive PII → in-memory, discarded, never logged/stored; a headline trust feature.
- **Accessibility:** WCAG AA, plain language, mobile-first; **i18n** (English first, architecture multilingual).
- **Cost:** \$5/session + global budget; cheap models; caching. **Data residency `syd1`.** **Fail-closed.**

## 9. UX (responsive; §14 trust-first authority model — this IS an authority product)
- **Landing:** hero ("Government said no? Find out what you can do — free, in plain English") → the two actions → how-it-works (transparent) → a real grounded example with sources → FAQ teasers → "get real help" → footer. Calm, non-judgemental, trustworthy. Single primary CTA with tracking (§14.2).
- **App:** the flow in §5 with the **deadline always visible** and **"get help" always one tap away**; a **sources panel** showing what each statement is grounded in (the trust surface).
- **FAQ pages:** clean article template, sources shown, CTA into the tool.

## 10. Analytics & metrics (GA4, PII-safe; never log letter content)
- start → scan/ask → decoded → pathway+deadline shown → draft → escalate/find-help → FAQ→tool conversion.
- North-star: people reaching a pathway+deadline; access metric: % who get a deadline before it lapses; trust: verified pass rate (>99%); reach: organic FAQ traffic → tool conversions.

## 11. Legal / UPL / safety guardrails (strongest of the three apps)
- **Information, not advice; never predict outcomes.** Bans on first-person advice/guarantees enforced by a tone gate. (The US FTC action against "DoNotPay" for over-claiming an "AI lawyer" is the cautionary tale — we under-claim, over-source, and always route advice to humans.)
- **Always escalate** — every flow offers a real free service.
- **Grounded-or-silent**, sources shown, honest "not covered" states.
- **Privacy:** no storage of letters/answers; no PII in logs/analytics.
- **Content currency:** deadlines/pathways change — the corpus has a review/update process (§9 harness) and every entry carries a "last verified" date + source; stale entries flagged.
- **Not a substitute for legal aid;** a bridge that hands off.

## 12. Scope — which decision types first (the key content decision)
- **Recommended MVP verticals (highest volume + most sympathetic + clearest pathways):** (1) Centrelink / social-security decisions & debts; (2) NDIS plan/eligibility decisions; plus a **generic "any Commonwealth decision" fallback** (right to reasons + ART/Ombudsman routing). Add visa/migration, public housing, fines next.
- Jurisdiction: **Commonwealth first** (one tribunal — the ART — and one Ombudsman simplify the corpus), then Victoria (VCAT/ALA) reusing the AdminLaw work.
- **Confirm before content build.** The architecture is identical regardless of which verticals; only the curated corpus content differs.

## 13. Open questions
- Brand/domain. · Exact MVP verticals + jurisdiction (default above). · Multilingual launch languages. · Reminder mechanism without accounts (email vs downloadable calendar file) — note: ephemeral/no-auth is SETTLED for MVP; capability-codes (§18) are a post-MVP option only. · Who curates/QA's the pathway corpus and on what review cadence (accuracy is safety-critical). · FAQ publishing cadence + reviewer.
