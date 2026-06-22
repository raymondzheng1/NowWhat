# Review Builder — Technical Spec (Tier B; two knowledge sources)

Inherits `Harness.md`. **Tier B.** Same engine as Adaptive IRAC / AdminLaw Coach / What Now? — reuse those packages. Distinctive here: **two knowledge sources** (a grounded legal corpus + a lawyer-verified procedural data layer), a **deterministic-first** flow, and the **no-advice/no-score** verification gate.

## 0. Knowledge sources (governs everything)
- **`corpus/legal/`** — grounds + tests-as-elements + leading cases (pinpointed) + MR/JR triage, built from our materials into committed `corpus/legal/index.json`. Sole source of legal substance + citations. Verifier enforces "cite only from here."
- **`data/pathways/`** — lawyer-verified, dated procedural facts (deadlines/forms/fees/agencies/body/real MR criteria) per decision type, built into committed `data/index.json`. NEVER from the exam corpus, NEVER model-invented. Each item: `value`, `verifiedAsAt`, `sourceUrl`, `reviewCadenceDays`, optional `privativeClause` flag, and a `reasonsRequest` object `{ extendsMR, extendsJR }` (matches `data/pathways/_SCHEMA.md`).
- **Answer method** → `KNOWLEDGE/answer-structures.md` + prompts (method only).

## 1. Stack (Tier B)
Next.js (App Router) + TS strict · Vercel Pro `syd1` · localStorage (single-device only; current session) · Upstash Redis (cost meter + rate limit, fail-closed) · Anthropic Claude API server-side (cost-efficient default + small model; prompt caching) · optional BYO key · GA4 (PII-safe) · STT for voice (server-side, in-memory) · i18n-ready (English first). No Supabase/Auth/Stripe/vector-DB (keyword retrieval first; ask before adding).

## 2. Module layout
```
corpus/legal/         # our materials → grounds/elements/cases/triage (committed source)
corpus/legal/index.json   # built (committed, diffable)
data/pathways/        # lawyer-verified procedural entries (committed source)
data/index.json       # built (committed, diffable)
lib/
  triage/        # deterministic: who-decided → avenue/body/MR-vs-JR/no-review; pulls deadline rule from data/
  deadline/      # render deadline RULE (no countdown) + verifiedAsAt + source link + staleness gate
  reasons/       # deterministic reasons-request template + the corrected clock warning
  learn/         # deterministic render of jurisdictions/remedies/grounds/comparison from corpus/legal
  intake/        # text + voice(STT, in-memory) capture; story length cap
  elements/      # AI: per-ground element-mapping ("relates to", never "satisfies"); neutral, all grounds
  cases/         # retrieval of leading-cases-that-explain-the-ground from corpus/legal (verified, pinpointed)
  draft/         # AI: review-document draft ("the applicant contends"); evidence checklist; where-to-lodge (data-gated)
  handoff/       # structured matter summary for a CLC/lawyer
  verification/  # source-allowlist + structure + jurisdiction + NO-ADVICE/NO-SCORE + relates-not-satisfies + pinpoint-binding
  tripwire/      # deterministic stop-and-route rules (incl. imminent-deadline, family/guardianship/MH, unclassifiable, privative flag)
  cost/          # $5/session + IP + global budget meter (Upstash), fail-closed; per-step token budgets
  byokey/ i18n/ schemas/ services/ storage/
components/ ui/ + <feature>/
scripts/         # build-corpus, build-data, corpus-check, data-check, + named dynamic scripts (§6.8)
KNOWLEDGE/       # answer-structures.md
```

## 3. Builds + linters
- `scripts/build-corpus.mjs` → `corpus/legal/index.json` (grounds, elements, cases+pinpoints, triage). `corpus-check`: every ground has a test+elements; every case resolves to a pinpoint; schema valid.
- `scripts/build-data.mjs` → `data/index.json`. `data-check` (in `verify`): every entry has `verifiedAsAt` + `sourceUrl` + `reviewCadenceDays`; **fail the build if any deadline lacks a source**; **flag (or fail) entries staler than their cadence**; classification map covers declared decision types.

## 4. Data model
- **Committed:** `corpus/legal/index.json`, `data/index.json`, both read-only at runtime.
- **localStorage (Zod-typed):** current story, comments, selected grounds, generated draft (single device). **No user content server-side.**
- **Upstash KV:** `spend:{sessionId}`, `ip:{ip}`, `budget:global:{date}`. No user content.

## 5. API routes (stateless; Zod; rate-limited; cost-guarded; AI key server-side)
- `POST /api/triage` — { decisionMaker, jurisdiction, decisionType, decisionDate } → avenue/body/MR-or-JR/no-review + **deadline rule (no countdown)** + tripwire check. *Deterministic; no model spend.*
- `POST /api/reasons` — { entryId } → reasons-request template + corrected clock warning. *Deterministic.*
- `POST /api/elements` *(v2, AI)* — { story, applicableGrounds } → per-ground element map (relates-not-satisfies; neutral; all grounds).
- `POST /api/cases` *(v2, retrieval; if it uses a model it passes the cost guard)* — { groundId } → leading cases that explain the ground (verified, pinpointed).
- `POST /api/draft` *(v2, AI)* — { selectedGrounds, comments } → draft review document (contends; no outcome claims) + evidence checklist + where-to-lodge (data-gated).
- `POST /api/handoff` — { matter } → structured summary for a CLC/lawyer.
- AI routes run the **cost guard first** (fail-closed) + the full verifier before returning; BYO-key bypasses the meter. No upload-storage, no auth, no DB.

## 6. Generation + verification pipeline (harness §11) — engine + the no-advice/no-score gate
```
AI request (+ grounded context from corpus/legal)
  → COST GUARD (session<$5 & global budget ok, or BYO-key) — fail-closed
  → generate (system prompt = method + HARD-NO: use ONLY corpus/legal; INFORMATION not advice; no score/likelihood/ranking; a fact may only "relate to" an element, never "satisfy" it; if not covered, say so + route to help)
  → VERIFY (deterministic): source-allowlist · structure · jurisdiction · NO-ADVICE/NO-SCORE (ban likelihood/score/ranking + "you should/will") · RELATES-NOT-SATISFIES · pinpoint-binding
  → pass → render (sources panel; data-layer facts with verifiedAsAt+link; "get help") + meter usage
  → fail(structural) → small-model envelope repair → re-verify
  → fail(content/advice) → regenerate from CLEAN context, cap N=3
  → exhausted → "I can't give you this from the materials — here's who can help" (never fabricate, never advise)
```

## 7. Quality gates & tests (harness §4)
- `verify` = `tsc` + `eslint` + `vitest` + linters: `corpus-check`, `data-check` (sources + verifiedAsAt + no unsourced deadline + staleness), `no-ai-mentions`, `no-advice` (ban first-person advice/guarantee/score/ranking patterns in any customer string/template), `reading-level`, `tokens`, `links:check`.
- **Drift tests (§4.3):** every AI route runs `verifyAnswer` (incl. no-advice/no-score + relates-not-satisfies) before returning; every AI call passes the cost guard; **no deadline ever rendered as a computed countdown**; every customer string free of AI-mentions; story/letter never written to storage or logs.
- **Integration (Tier-B variant; Anthropic mocked, Upstash via `__setKvForTests`).** Must-have tests: (a) verifier **rejects** output citing a source not in `corpus/legal`; (b) no-advice gate **rejects** a strength/likelihood/ranking output and "you should sue/you'll win"; (c) relates-not-satisfies gate rejects "this fact satisfies element 1"; (d) cost guard blocks at \$5 / fails closed; (e) **staleness gate**: a data entry past its cadence degrades to source+help, never shows the stale value; (f) tripwire (imminent deadline / family/guardianship/MH / unclassifiable) **stops** the builder and routes out; (g) a user story is never persisted/logged.
- Clock seam for any date logic.

## 8. Security/privacy (harness §6) — strongest tier
- Story/voice/letter = sensitive PII: STT + processing **in memory**, discarded on response; **never stored, never logged**; no PII in analytics/URLs. HTTP security headers + CSP. **Injection defence (§6.5):** the user's story and any letter text are **data, not instructions**.

## 9. Content ops & currency (harness §9/§11.1)
- `data/pathways/` is safety-critical: documented **review cadence**, `verifiedAsAt` on every entry, `data-check` enforces sources + flags staleness, **a supervising Australian lawyer signs off** changes. The legal corpus build is reviewed in the diff. (No auto-publish of any legal/procedural content.)

## 10. Deploy/ops
- §2.2 deploy discipline; env in CLAUDE.md; Upstash fail-closed; rebuild+commit indexes when sources change; no DB backups (no server-side user state; corpus+data in git). **Do not deploy v2 (steps 4–8) until the data layer + legal sign-off gates (PRD §12) are met.**
