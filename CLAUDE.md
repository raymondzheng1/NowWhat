# CLAUDE.md — What Now? (operating manual; Tier B; end-user access-to-justice)

**Read `C:\Users\Ivy\RayTasks\Projects\Harness.md` first.** Shares the engine with **Adaptive IRAC** and **AdminLaw Coach** — reuse those packages. Tracks ON: §8 SEO, §11 AI content pipeline, §10 i18n.

## Stack tier
**Tier B — KV-only, no Supabase/Auth/Stripe.** Honour Tier-B trims.

## What this is
A free, **login-free** web app for **ordinary people** facing an adverse government decision. They **scan/paste the letter** or **ask a question**; it decodes it in plain English, finds the **pathway + deadline**, lists next steps, drafts the first document, and **routes the advice step to a real free service**. Everything is grounded in a **curated, sourced rules corpus** and verified, or it says "not sure — here's who can help". Letters are processed **in memory and never stored**. Grounded answers also publish as SEO FAQ pages that funnel people in.

## Non-negotiable safety posture (this serves vulnerable people)
- **Information, NOT advice. Never predict outcomes.** A `no-advice` gate must reject first-person advice and "you'll win/lose" in any output or template.
- **Grounded-or-silent:** cite only the curated corpus + its sources; if not covered, say so and route to human help — never fabricate, never reach outside the corpus.
- **Always offer human help** (CLC/Legal Aid/advocate) in every flow.
- **Never store or log the user's letter/answers or any PII.** OCR + processing in memory; discard on response.
- **Accuracy is safety:** every deadline/figure must carry a source + `lastVerified`; never state an unsourced deadline.
- **No authentication; ephemeral one-off sessions (SETTLED for MVP).** No login/accounts; nothing user-specific stored server-side; no saved matter to resume across devices. The user keeps results via download/print or a no-account deadline reminder; `localStorage` is single-device only. Do NOT add accounts or a resume feature for MVP. (Post-MVP only: harness §18 capability-codes for no-login resume — requires storing the analysis, so revisit deliberately against the no-storage promise.)

## Where knowledge lives
Legal substance + citations → the curated `corpus/pathways/*` (built to `corpus/index.json`); answer method → `KNOWLEDGE/answer-structures.md` + prompts; decision-type taxonomy → declared in the corpus.

## Stack
Next.js (App Router) + TS strict · Vercel Pro `syd1` · localStorage (only client state) · Upstash (cost meter + rate limit, fail-closed) · Anthropic server-side (+ small model; prompt caching) · OCR (in-memory) · i18n (English first) · FAQ as SSG MDX (SEO) · GA4 PII-safe · optional BYO key. No DB/Auth/Stripe/vector-DB (ask first).

## Do
- Route **every** output through `lib/verification` (source-allowlist + structure + jurisdiction + **no-advice/no-prediction** + source-binding + reading-level) before display; reject + regenerate on failure.
- Run the **cost guard** before every model call; fail-closed; BYO-key bypasses.
- Build corpus with `scripts/build-corpus.mjs` → commit `corpus/index.json`; `corpus-check` in `verify`; keep `lastVerified` honest.
- FAQ = generate → quality gates → **human review** → publish (no auto-publish of legal content).
- Plain language (≤ target reading grade), WCAG AA, mobile-first, i18n-ready. Zod everywhere; no `any`.
- Bash hygiene (§6.8): one program per call, no `cd`/inline loops — use `scripts/*.mjs`.

## Don't
- Don't give advice, predict outcomes, or imply we're a lawyer (FTC "DoNotPay" caution).
- Don't store/log letters, answers, or PII. Don't add user accounts/Supabase/Stripe/vector-DB (ask first).
- Don't state a deadline or legal figure without a corpus source; don't let the model go outside the corpus.
- Don't mention AI/LLM/Claude in customer copy.

## Env vars
`ANTHROPIC_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SESSION_CAP_USD` (=5), `GLOBAL_DAILY_BUDGET_USD`, `OCR_*` (provider keys), `APP_BASE_URL`, `RESEND_API_KEY` (optional reminders/alerts), `CRON_SECRET` (if used).

## Launch gates
`verify` green (incl. `corpus-check`, `no-advice`, `reading-level`, `seo:check`, `links:check`, `launch:check`) · verifier rejects out-of-corpus citation AND advice/prediction (integration tests) · cost guard blocks at \$5 / fails closed · "not covered → get help" path works · no letter ever persisted/logged (verified) · mobile 375×812 + screen-reader pass · every FAQ page grounded + disclaimer + sources + "get help" CTA.

## Implementation notes (read before changing the engine)
- **Run it:** `npm run verify` is the single gate (build-corpus → corpus-check → no-advice → no-ai-mentions → reading-level → links → seo → launch → eslint → tsc → vitest). `npm run dev` needs no keys (KV falls back to in-memory; model calls degrade to "not covered"). See `TESTING.md` and `README.md`.
- **Corpus format:** entries are YAML-frontmatter Markdown (`corpus/pathways/*.md`), parsed by `scripts/build-corpus.mjs` → `corpus/index.json` (committed). The Zod `PathwayEntrySchema` (`lib/schemas/corpus.ts`) is authoritative; a vitest test re-validates the built index (no drift).
- **The deadline guarantee in code:** `deadlineIsRenderable()` — a concrete date is computed/shown ONLY when `deadlineVerified && deadlineDays && source` (non-VERIFY). All seeds are non-renderable, so the app shows "a time limit applies — confirm it" + help, never an unsourced number. The verifier's `no-fabricated-deadline` gate independently rejects any day/month figure the entry doesn't verify.
- **Seeds → launch:** all 3 seed entries are `status: seed` with 45 `VERIFY` markers. A human must confirm each figure against its source and flip to `verified` (set `deadlineDays`, `deadlineVerified`, real `source`, `lastVerified`) before launch. `corpus-check` warns (doesn't fail) on seeds so the app builds during MVP.
- **No-advice SoT:** `lib/safety/no-advice-patterns.json` is read by BOTH the runtime gate (`lib/safety/no-advice.ts`, applied to every model output via the verifier) and the `no-advice-check` linter (static copy). Edit patterns there only.
- **OCR (photo/PDF → text):** provider-pluggable, IN MEMORY, never stored (`lib/intake/ocr.ts`). **Default = the configured vision model (Anthropic, transcription-only)** — works whenever `ANTHROPIC_API_KEY` is set, same trust boundary as the decode call, and **metered by the same cost guard** (`/api/decode` runs OCR *after* `precheck` and records its tokens). `OCR_PROVIDER=gcv`+`OCR_API_KEY` uses Google Cloud Vision; `OCR_PROVIDER=none` (or no model + no GCV) disables it and the upload path returns `ocr-unavailable` (paste always works). Transcribed text flows through the same classify→grounded-decode→verifier pipeline as pasted text; the image is never echoed back.
- **Cost guard / KV:** `lib/kv/redis.ts` reads BOTH `UPSTASH_REDIS_REST_*` and `KV_REST_API_*` (harness §15). `lib/cost/guard.ts` fails closed (denies) when KV is unconfigured/erroring in production; BYO-key (`x-byo-anthropic-key` header, in-memory, never stored) bypasses all meters.
- **FAQ pipeline:** published pages live in `content/faq/*.md` (SSG); drafts in `content/faq/_drafts/` are never served (structural review gate). `NEXT_PUBLIC_SITE_URL` is the SoT base URL for canonical/sitemap/robots/JSON-LD. (CLAUDE env note: code uses `NEXT_PUBLIC_SITE_URL`, not `APP_BASE_URL`.)
- **Brand assets (Chambers crest):** favicon is `app/icon.svg`; the app icons (`/icon-192`, `/icon-512`, `/apple-icon`) and the 1200×630 OG/Twitter share image (`app/opengraph-image.tsx` + `twitter-image.tsx`) are generated by `next/og` from `CrestEl` in `lib/og/render.tsx`, using the Libre Baskerville `.woff` in `assets/` (read at build, never served). No image dependency.
