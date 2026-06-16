# What Now? — Technical Spec (Tier B; SEO + AI-content + i18n tracks on)

Inherits `Harness.md`. **Tier B**, with §8 SEO, §11 AI content pipeline, §10 i18n turned on. Same engine as Adaptive IRAC / AdminLaw Coach; the difference is a **curated, sourced "review-pathway" corpus** + a **letter-intake (OCR)** step + a **published FAQ layer**.

## 0. Knowledge sources
- **Legal substance + citable sources** → the **curated pathway corpus** in `corpus/pathways/*` (authored, sourced, dated). The only source of legal substance. Nothing else.
- **Answer method/format** (decode shape, pathway-answer shape, plain-language Q&A shape) → `KNOWLEDGE/answer-structures.md` + prompts. Method only.
- **Decision-type taxonomy** → defined in the corpus (each pathway entry declares the decision types/issuers it covers); built into `corpus/index.json`.

## 1. Stack (Tier B + tracks)
Next.js (App Router) + TS strict · Vercel Pro `syd1` · localStorage (client state: current session draft/answers, optional reminder prefs) · Upstash Redis (cost meter + rate limit, fail-closed) · Anthropic Claude API server-side (cost-efficient default + small model; prompt caching) · optional BYO key · GA4 (PII-safe) · **OCR** for letter photos (server-side, in-memory) · **i18n** (next-intl or equivalent; English first) · **FAQ pages** as statically-generated MDX (built from approved, grounded answers) for SEO. No Supabase/Auth/Stripe/vector-DB (keyword retrieval first).

## 2. The pathway corpus (the distinctive content asset)
- `corpus/pathways/<id>.md|yml` — one entry per decision type, each with: `decisionTypes[]`/`issuers[]` (for classification), `jurisdiction`, `reviewable` (y/n + basis), `pathways[]` (internal review / merits review body / Ombudsman / court) each with `deadline` (+ how computed) and `howToStart`, `rightToReasons` (provision + how to ask), `groundsOrCriteria[]`, `evidenceChecklist[]`, `getHelp[]` (services), `plainLanguageExplainer`, **`sources[]` (authoritative URL/citation)** and **`lastVerified` date**.
- **Accuracy is safety-critical:** every factual figure (esp. deadlines) MUST carry a source and a `lastVerified` date; the app renders the source and never states a deadline the entry can't source. Seed entries in `corpus/pathways/` ship with `VERIFY:` markers where a human must confirm the current figure before launch (do not assert un-verified deadlines).
- **Build:** `scripts/build-corpus.mjs` → committed `corpus/index.json` (entries + a classification map + a flat authority/source list). `scripts/corpus-check.mjs` (in `verify`): schema valid; every entry has ≥1 source + `lastVerified`; no entry asserts a deadline without a source; flag entries whose `lastVerified` is older than N months.

## 3. Module layout
```
corpus/pathways/      # authored, sourced pathway entries (committed)
corpus/index.json     # built classification + entries + sources (committed, diffable)
content/faq/          # approved, grounded MDX FAQ/article pages (committed → SSG → SEO)
lib/
  intake/        # OCR (image/pdf → text, in-memory), decision-type + issuer classification
  corpus/        # load index, classify→entry, lookups
  retrieval/     # keyword select over corpus
  generation/    # runner, prompts (method from KNOWLEDGE), models
  verification/  # source-allowlist gate, structure gate, jurisdiction gate, NO-ADVICE/NO-PREDICTION gate, source-binding
  deadline/      # compute deadline from decision date + entry rule; reminder (ICS file / email)
  draft/         # build reasons-request / review-application skeletons
  faq/           # generate→gate→review→publish pipeline (§11.1) for FAQ pages
  cost/          # $5/session + IP + global budget meter (Upstash), fail-closed
  byokey/        # optional user key (client-held)
  i18n/          # locale loading; plain-language + translation
  schemas/ services/ storage/
components/ ui/ + <feature>/
scripts/         # build-corpus, corpus-check, faq-build, + named dynamic scripts (§6.8)
KNOWLEDGE/       # answer-structures.md (method)
```

## 4. Data model
- **Committed:** `corpus/index.json` (read-only at runtime); `content/faq/*.mdx` (published pages).
- **localStorage (Zod-typed):** current draft/answer, reminder prefs, language. **No user letters/answers persisted server-side.**
- **Upstash KV:** `spend:{sessionId}`, `ip:{ip}`, `budget:global:{date}`. No user content.

## 5. API routes (stateless; Zod; rate-limited; cost-guarded; AI key server-side)
- `POST /api/decode` — multipart (image/pdf) or text → OCR (in-memory) → classify → matched entry → plain-language decode + pathway + deadline. **Letter discarded after response.**
- `POST /api/ask` — { question, locale } → grounded plain-language answer + sources (also the FAQ engine).
- `POST /api/deadline` — { entryId, decisionDate } → deadline + optional ICS file.
- `POST /api/draft` — { entryId, context } → reasons-request / application skeleton.
- (Build-time, not user-facing) FAQ pipeline routes/scripts: generate → gates → human-approve → publish MDX.
- All run the **cost guard first** (fail-closed); BYO-key bypasses. No upload-storage, no auth, no DB.

## 6. Pipeline (harness §11) — engine unchanged, plus the no-advice gate
```
request (+ matched corpus entry/context)
  → COST GUARD (fail-closed; or BYO-key)
  → generate (system prompt = plain-language method + HARD-NO: use ONLY the entry/corpus; info not advice; never predict outcome; if not covered, say so + route to help)
  → VERIFY: source-allowlist · structure · jurisdiction · NO-ADVICE/NO-PREDICTION (tone) · source-binding · reading-level
  → pass → render (sources panel; deadline; "get help") + meter usage
  → fail(structural) → small-model envelope repair → re-verify
  → fail(content/advice) → regenerate from CLEAN context, cap N=3
  → exhausted → "I'm not sure about this — here's who can help" (never fabricate, never advise)
```

## 7. Quality gates & tests (harness §4 + §11.2)
- `verify` = `tsc` + `eslint` + `vitest` + linters: `corpus-check` (sources + lastVerified + no unsourced deadline), `no-ai-mentions`, `no-advice` (ban first-person advice/guarantee patterns in any customer-facing string or template), `reading-level` (FAQ/explainer copy ≤ target grade), `tokens`, `links:check`, `seo:check` (FAQ pages have title/meta/canonical/CTA).
- **Drift tests:** every generate route runs `verifyAnswer` (incl. the no-advice gate) before returning; every model call passes the cost guard; FAQ pages all carry a disclaimer + a "get help" CTA + sources.
- **Integration (Tier-B variant):** Anthropic mocked, Upstash via `__setKvForTests`. Must-haves: (a) verifier **rejects** output citing a source not in the corpus; (b) no-advice gate **rejects** "you should sue / you'll win"; (c) cost guard blocks at \$5 / fails closed; (d) "not covered" + escalation path; (e) a letter is never written to storage/logs.
- Clock seam for deadline computation (test the date math).

## 8. Security/privacy (harness §6) — strongest here
- Letters = sensitive PII: OCR + processing **in memory**, discarded on response; **never stored, never logged** (§6.2); no PII in analytics/URLs. Signed nothing (nothing persisted). HTTP security headers + CSP. **Injection defence (§6.5):** treat letter text and user questions as **data, not instructions**.

## 9. Content ops & currency (harness §9 / §11.1)
- The pathway corpus is safety-critical reference data: a documented **review cadence**, `lastVerified` on every entry, `corpus-check` flags stale entries, and a human reviewer signs off changes. The FAQ pipeline is **generate → quality gates (§11.2) → human review (§9.2) → publish** — no auto-publish of legal content.

## 10. Deploy/ops
- §2.2 deploy discipline; env in CLAUDE.md; Upstash fail-closed; FAQ pages SSG (rebuild on publish); no DB backups (no server-side user state; corpus + FAQ in git).
