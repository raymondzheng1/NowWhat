# CLAUDE.md — Review Builder (operating manual; Tier B; end-user, access-to-justice)

**Read `C:\Users\Ivy\RayTasks\Projects\Harness.md` first.** Shares the engine with Adaptive IRAC / AdminLaw Coach / What Now? — reuse those packages.

## Stack tier
**Tier B — KV-only, no Supabase/Auth/Stripe.** Honour Tier-B trims. Tracks on: §10 i18n (English first), §8 SEO (later), §9/§11 content ops for the data layer.

## What this is
A guided, **deterministic-first**, login-free web app that takes a self-represented person from an adverse government decision to: avenue + deadline → request reasons → (v2) plain-language elements-check of the grounds → leading cases that explain each ground → a draft review document they lodge themselves → a CLC/lawyer hand-off pack. **Information, never advice.**

## TWO knowledge sources (do not confuse them)
1. **`corpus/legal/`** (our materials → grounds, tests-as-elements, leading cases, MR/JR triage) → built to `corpus/legal/index.json`. ONLY source of legal substance + citations.
2. **`data/pathways/`** (lawyer-verified, dated deadlines/forms/fees/agencies/MR criteria) → built to `data/index.json`. NEVER from the exam corpus; NEVER model-invented. Every item shows `verifiedAsAt` + source link + obeys the staleness gate.
Answer method → `KNOWLEDGE/answer-structures.md` + prompts.

## Non-negotiable safety posture (this serves vulnerable people)
- **Information, NOT advice. No score, no likelihood, no ranking of grounds, no outcome prediction.** A `no-advice/no-score` gate enforces this on every output and template.
- **Elements-check is "relates to", never "satisfies".** Show all applicable grounds **neutrally** — never pre-select, rank, or visually privilege "strong" ones (that is an implicit strength score).
- **Cases = "leading cases that explain this ground", never "cases like yours".**
- **Never compute a deadline countdown.** Show the rule + `verifiedAsAt` + official source link; staleness gate degrades to source+help if stale.
- **Draft, not filing.** "The applicant contends…"; the user lodges it; we never file or act for them.
- **Tripwire stops the builder** (privative-flag, migration, deadline passed/imminent, detention, criminal, hearing on foot, family/guardianship/mental-health, unclassifiable) → route to a lawyer/CLC.
- **Always offer human help.** Never imply we are/replace a lawyer (LPUL; ACL s18; FTC DoNotPay).
- **Never store or log the user's story/letter or any PII.** In memory; discard on response.
- **Scope: Victoria + Commonwealth only.** Migration excluded.

## Stack
Next.js (App Router) + TS strict · Vercel Pro `syd1` · localStorage (single-device only) · Upstash (cost meter + rate limit, fail-closed) · Anthropic server-side (+ small model; prompt caching) · STT (in-memory) · i18n (English first) · GA4 PII-safe · optional BYO key. No DB/Auth/Stripe/vector-DB (ask first).

## Do
- Steps 0–3 (triage/deadline/reasons/learn) are **fully deterministic — no model spend** (lean MVP ships 0,1,2,9; the Learn module, step 3, ships with v2). Model spend occurs only in steps 5 (elements) and 8 (draft); step 7 (cases) is retrieval and only incurs/guards cost if it calls a model — pass the cost guard whenever a model is used.
- Route every AI output through `lib/verification` (source-allowlist + no-advice/no-score + relates-not-satisfies + pinpoint-binding) before display; reject + regenerate on failure.
- Run the cost guard before every model call; fail-closed; BYO-key bypasses.
- Render every procedural fact with `verifiedAsAt` + source link; honour the staleness gate; **never a countdown**.
- Build corpus + data with their scripts → commit indexes; `corpus-check` + `data-check` in `verify`.
- Plain language (≤ ~Year 6), WCAG AA, mobile-first, i18n-ready. Zod everywhere; no `any`.
- Bash hygiene (§6.8): one program per call, no `cd`/inline loops — use `scripts/*.mjs`.

## Don't
- Don't give advice, score/rank prospects, predict outcomes, or imply lawyer status.
- Don't pre-select/rank grounds; don't say a fact "satisfies" an element; don't compute a countdown.
- Don't source deadlines/forms from the exam corpus or let the model invent them.
- Don't store/log the user's story/letter or PII. Don't add accounts/Supabase/Stripe/vector-DB (ask first).
- Don't ship v2 (steps 4–8) before the data-layer + legal-sign-off gates are met (PRD §12).
- Don't mention AI/LLM/Claude in customer copy.

## Env vars (placeholders in repo; secrets never committed)
`ANTHROPIC_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SESSION_CAP_USD` (=5), `GLOBAL_DAILY_BUDGET_USD`, `STT_API_KEY`, `APP_BASE_URL`, `RESEND_API_KEY` (optional alerts), `CRON_SECRET` (optional).

## Launch gates
- **Lean MVP (steps 0,1,2,9):** `verify` green (incl. `data-check`, `no-advice`, `reading-level`); triage correct for Vic+Cth; deadline shown as rule+verifiedAsAt+source (never countdown); staleness gate works; tripwire routes out; reasons-clock warning correct (MR-maybe / JR-not); nothing stored/logged; **legal sign-off + consent gate in place**; mobile/screen-reader pass.
- **v2 (steps 4–8):** all of the above + verifier rejects out-of-corpus citation AND advice/score/ranking AND relates-not-satisfies (integration tests) + cost guard blocks/fails-closed + **data-layer release gate met (lawyer-verified + cadence)**.
