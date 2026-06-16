# What Now? — your rights when government says no

A free, **login-free** web app that helps ordinary people understand and respond to an
adverse government decision: it decodes the letter in plain English, finds the **review
pathway and the time limit**, drafts the first document, and routes the advice step to a
**real free service**. Everything is **grounded in a curated, sourced rules corpus and
verified** — or it says "I'm not sure, here's who can help". **Letters are processed in
memory and never stored.**

> Information, not advice. Never predicts outcomes. Grounded-or-silent. See `CLAUDE.md`
> for the non-negotiable safety posture.

## Stack (Tier B — KV-only)

Next.js (App Router) · TS strict · Tailwind · next-intl · Upstash Redis (cost meter +
rate limit, fail-closed) · Anthropic (server-side, prompt-cached) · GA4 + Vercel
Analytics · Vercel Pro `syd1`. No DB / Auth / Stripe / vector-DB.

## Develop

```bash
pnpm install          # or npm install
cp .env.example .env.local   # fill in keys (all optional for local dev)
npm run dev           # http://localhost:3000
npm run verify        # the single quality gate — must be green before push
```

Local dev needs **no keys**: the cost guard uses an in-memory KV fallback and the model
calls degrade gracefully to "not covered → get help" without an `ANTHROPIC_API_KEY`.

## Enabling the model (`/ask` and `/decode` only)

The **wizard** (`/start`) — classify → pathway → computed **deadline** → draft → tiered
help — is fully deterministic and needs **no keys**. The LLM powers ONLY `/ask` (free-text
Q&A) and `/decode` (plain-English explanation of the user's own letter).

To turn those two on:

- **Locally:** set `ANTHROPIC_API_KEY` in `.env.local` and run `npm run dev` (dev uses an
  in-memory KV, so no Upstash needed). `/ask` and `/decode` now return grounded, verified
  answers; without the key they degrade to "not covered → get help".
- **On Vercel:** set **both** `ANTHROPIC_API_KEY` **and** Upstash (`UPSTASH_REDIS_REST_*`
  or `KV_REST_API_*`) — the cost guard fails closed in production, so the model needs a
  metering store. Optionally set `ANTHROPIC_MODEL` to A/B different models. Redeploy after
  changing env vars.

Every model answer still passes the verifier (grounded-or-silent, no advice, no fabricated
deadline) and the $5/session cost guard before it reaches the user.

## Layout

```
corpus/pathways/*.md   curated, sourced review-pathway entries (the ONLY legal substance)
corpus/index.json      built from the above (committed, diffable) — scripts/build-corpus.mjs
content/faq/*.md        published, human-reviewed FAQ pages (SSG, SEO)
lib/                    cost · kv · corpus · retrieval · generation · verification ·
                        deadline · draft · intake(OCR) · safety · faq · i18n · schemas
app/                    landing · /ask · /decode · /faq · /help · /about · /privacy · /api/*
scripts/               build-corpus + the verify-gate linters
tests/                  unit · integration (the safety contract) · drift defence
```

## FAQ content pipeline (generate → review → publish)

Grounded FAQ articles are search front-doors into the tool. The pipeline follows FairGo's
gold-standard process, adapted for Tier B (no DB, no admin login): **a human always
reviews before publish — nothing auto-publishes.**

1. **Queue** a topic in `content/faq/queue.json` (`slug`, `question`, `entryId` it's
   grounded in, `category`, `status: "pending"`).
2. **Draft** locally: `ANTHROPIC_API_KEY=… npm run faq:draft`. It generates the next
   pending topic grounded **only** in its corpus entry, runs pre-gates (no-advice,
   no-fabricated-deadline, structure, /start CTA, dedupe), and writes
   `content/faq/_drafts/<slug>.md` (or `_drafts/REJECTED/<slug>.md` with reasons).
   The article's **sources come from the corpus entry, not the model** (guaranteed provenance).
3. **Review** the draft: read it, edit as needed, set `updated:`, and **move** it to
   `content/faq/<slug>.md`. Drafts in `_drafts/` are never served.
4. **Gate + publish**: `npm run verify` (the authoritative gate — runs no-advice,
   reading-level, links, SEO over the now-published file), then commit + push. Mark the
   queue topic `"published"`.

The gate logic is also a tested TS spec in `lib/faq/validate.ts` (see `tests/unit/faq/`).

## The four invariants (must never regress)

1. Every model output passes `lib/verification` — grounded in the corpus, sourced, **and
   not advice / prediction**.
2. Every model call passes the `lib/cost` guard ($5/session, fail-closed; BYO-key bypasses).
3. The user's letter is **never stored or logged**.
4. When not covered → "I'm not sure — here's who can help", and route to a real service.

## Before launch

Seed corpus entries carry `VERIFY` markers. A human must confirm each figure against its
source and flip `status: verified` before launch (see `TESTING.md`). The app never states
an unsourced deadline until then.
