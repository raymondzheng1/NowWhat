# Review Builder — Product Requirements (PRD)

**Working title:** Review Builder (brand TBD). **Status:** v1 spec (finetuned after research + 2 QA loops). **Owner:** Raymond. **Date:** 8 June 2026.
**Harness:** Inherits `C:\Users\Ivy\RayTasks\Projects\Harness.md`. **Stack tier: B** (KV-only; no Supabase/Auth/Stripe). Same engine as our other apps (cite-only-from-corpus, verified, $5/session cap). **This is the flagship end-user product; it absorbs the earlier "What Now?" (its decode/triage is Stage 0–1 here).**

> **What it is:** a guided, mostly-deterministic tool that takes a self-represented person from "I got an adverse government decision" to (1) their avenue + deadline, (2) a request for reasons, (3) a plain-language elements-check of the grounds, (4) the leading cases that explain each ground, (5) a draft review document they lodge themselves, and (6) a hand-off pack for a community legal centre (CLC)/lawyer. **Information, never advice.** Grounded only in our verified materials; procedural facts (deadlines/forms) come from a separately **lawyer-verified, dated data layer**, never invented.

## 1. The two knowledge sources (read first — this governs the whole build)
1. **Legal-substance corpus (`corpus/legal/`):** grounds of review + each ground's test broken into **elements**, the **leading cases** that explain each ground (with pinpoints), and the **merits-review (MR) vs judicial-review (JR) triage** — built from our own admin-law materials (the JR structure, the review notes, the combined MR/JR framework, the model answers). The ONLY source of legal substance and citations. The verifier enforces "cite only from here."
2. **Verified procedural data layer (`data/pathways/`):** real-world **deadlines, forms, fees, agency names, the correct body, and real MR substantive criteria** per decision type. **Authored + verified by a supervising Australian lawyer + dated; NEVER sourced from our exam corpus and NEVER invented by the model.** Every item renders with a "verified-as-at" date + a link to the official source + a staleness gate (below). **This data layer is a release gate** (see §12).
- **Scope:** **Victoria + Commonwealth only** (what our materials support); state this honestly in-product. No other states in v1; migration is out of scope (privative clauses).

## 2. Why this (and why it's more useful than "explain the law")
It ends in **action + correct routing**, not a lecture: the avenue/deadline triage and the protective first step are what self-reps actually lack (most lose on the clock or by picking the wrong avenue, not on the law). It uses our genuine differentiator — grounds-as-elements + verified citations — and produces artefacts (a draft + a lawyer hand-off pack). Two QA passes confirmed the value is real **provided** the safety rails below hold.

## 3. The flow (deterministic unless marked AI)
- **0. "Preserve your rights" 60-sec check** *(deterministic)* — time left? avenue family? reasons requested yet? The highest-value, lowest-risk slice.
- **1. Triage** *(deterministic)* — branch on **who made the decision**: Commonwealth → ART / ADJR Act / Federal Court / s 75(v); Victoria → VCAT (merits) / Supreme Court Order 56 (JR). Output MR vs JR vs **"no review available"** (a dignified endpoint → Ombudsman/complaint/reasons/CLC), the body, and the **deadline rule** (rendered per §5 — no countdown). Standing noted.
- **2. Request reasons** *(deterministic template)* — s 13 ADJR / ART s 28 / s 8 ALA. **Warning (corrected):** clocks are avenue- and Act-specific; a reasons request may extend a *merits-review* period **only if the enabling Act says so** (from the data layer), and does **NOT** pause any *judicial-review* limitation period — do not wait for reasons to protect a JR right.
- **3. Learn** *(deterministic, from `corpus/legal/`)* — jurisdictions, remedies, grounds, plain language, the MR-vs-JR comparison.
- **4. Tell your story** — text or voice (STT).
- **5. Elements-check** *(AI, grounded)* — for each applicable ground show its test as **elements**; map what the user described: "you mentioned X **relating to** element 1; nothing on element 2." **NO score, NO win/lose, NO ranking.** **All applicable grounds shown NEUTRALLY** — none pre-selected, ranked, or visually privileged (selective highlighting = an implicit strength judgment → forbidden). The model may say a fact *relates to* an element, **never** that it *satisfies / is sufficient for* it (output-filtered).
- **6. Per-ground comments** + "information that relates to each element" (what other facts would relate — never "this strengthens your case").
- **7. Leading cases that explain each ground** *(AI/retrieval, grounded, pinpointed)* — labelled "these explain the legal principle; not predictions about your matter; your facts may differ." **Never** "cases like yours."
- **8. Select grounds → draft review document** *(AI, grounded)* — **the user actively selects** (all grounds shown equally; nothing pre-selected) with neutral guidance that a focused letter is usually stronger. The draft uses **"the applicant contends…"** (contentions, not legal conclusions), makes **no outcome/merits claims**, and is a **draft the user lodges themselves** (we never file). Plus an evidence checklist and a where-to-lodge pointer (both **data-layer-gated**).
- **9. Hand-off pack + find-help directory** — a structured matter summary for a CLC/lawyer; always available.
- **Tripwire → STOP and route to a lawyer/CLC** (no builder output): privative clause (flagged per enabling Act in the data layer — not detected from user text), migration, **deadline already passed OR imminent (<~5–7 days)**, detention, criminal element, hearing on foot, **child-protection / family / guardianship / mental-health decisions**, or **any decision the triage cannot confidently classify**.

## 4. Functional requirements (MVP = the lean "Rights Saver"; full builder = v2)
- **Lean MVP (steps 0,1,2,9 + find-help):** no login; triage + deadline rule + reasons-request template + dignified "no review" endpoint + hand-off/find-help. Deterministic/templated; near-zero UPL risk; safe for free public **and** as a CLC/advocate intake tool.
- **v2 (steps 3–8, behind the §12 release gate):** the Learn module (step 3) plus tell-your-story (text/voice), elements-check, per-ground comments, leading cases, draft document + evidence checklist + where-to-lodge. (Step 3 Learn is deterministic but ships with v2, not the lean MVP.)
- **Cost guard:** hard **US$5/session** model-spend cap (Upstash), per-IP limits, global daily budget kill-switch, fail-closed; optional **BYO-key** bypasses. (Lean MVP is mostly deterministic → minimal spend.)

## 5. Deadlines & procedural facts — the safety contract (non-negotiable)
- **Never compute a countdown** ("you have X days left") — it's a representation we're liable for. Show the **rule** ("an application is generally due within N days of the decision — VERIFY against the source"), the **"verified-as-at" date**, and a **link to the official source**, every time.
- **Staleness gate:** if a data-layer item is older than its review cadence, the flow **degrades** to "we can't confirm this deadline right now — here's the official source + urgent-help route." Never show a stale value.
- Every deadline/form/fee/criterion is data-layer-sourced; the legal corpus is never the authority for a real-world deadline.

## 6. Non-functional
- **Safety > everything:** grounded-or-silent; always offer human help; info-not-advice; no outcome/prospects framing anywhere.
- **Privacy:** the user's story/letter is processed in memory and **never stored or logged**; no PII in analytics/URLs (a trust feature; also see §12 consent/incident).
- **Accessibility:** plain language (~Year 6 reading level), WCAG AA, mobile-first; voice as a mode.
- **Tier B:** no DB/accounts; localStorage single-device only; data residency `syd1`; fail-closed.

## 7. UX (responsive; harness §14.1 trust-first authority model)
- Calm, non-judgemental. **Deadline rule + "get help" persistently visible.** A **sources panel** shows what each statement is grounded in (corpus pinpoint) and every procedural fact's verified-as-at date + source link (the trust surface).
- Lean MVP is a short, reassuring path: "here's your avenue, here's the deadline rule, here's how to ask for reasons, here's who can help."

## 8. Analytics (GA4, PII-safe; never log story/letter)
- start → triage outcome → deadline-rule shown → reasons-request generated → hand-off/find-help → (v2) elements-check → draft. North-star: people reaching a correct avenue + deadline; trust: verified pass rate (>99%); safety: zero stored PII (verified).

## 9. Legal / regulatory guardrails (locked)
- **Information, not advice; never predict outcomes or rank prospects.** A `no-advice / no-score` gate rejects strength/likelihood language, ranking, and "fact satisfies element" phrasing.
- **Never imply we are or replace a lawyer** (LPUL unqualified-practice; ACL s 18 misleading conduct; FTC "DoNotPay" caution). Always route advice to a human service.
- **Draft, not filing:** the user lodges; we never file or act for them.
- **Vic + Cth scope stated; migration excluded.**

## 10. Use cases served (kept from the finetune)
- Reasons-request first (the smart, low-risk first step — promoted into the core flow). · Distinct MR evidence/submission path vs JR grounds/letter. · "Information that relates to each element" (renamed from "strengthen"). · Lawyer/CLC hand-off pack. · Voice-first accessible mode. · (Deferred, commercial) CLC/advocate intake accelerator — same engine, professional user.

## 11. Out of scope / future
- Other states (NSW/QLD/etc.), migration, accounts/persistence/resume (capability-codes §18 only if ever needed), filing-on-behalf (never). Future: the CLC B2B accelerator; more verticals once the data layer scales.

## 12. Release gates & open decisions (must be answered before the relevant phase ships)
- **Data layer (release gate for v2 and for any real deadline/form):** who authors it, which **supervising Australian lawyer verifies** it, and the **review cadence** (drives the staleness gate). v2 cannot ship until answered.
- **Legal sign-off + liability posture (gate for going live at all, incl. lean MVP):** named supervising lawyer signing the templates + data layer; PI insurance / liability-limiting structure.
- **Consent + incident handling:** the "not legal advice" acknowledgement gate, and the process when a user reports a missed deadline (note: Tier B no-login/in-memory means no audit trail — decide deliberately).
- **Settled defaults (change only if you decide otherwise):** phased MVP (lean first); Vic+Cth only; grounds shown neutrally (user selects); elements-check only (no score); lean slice serves both public + CLC, with the full builder's analysis pointed at CLCs first.
