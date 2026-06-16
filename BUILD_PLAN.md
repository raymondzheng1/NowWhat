# What Now? — Build Plan (Tier B; end-user)

**M0 — Scaffold + corpus schema + seed verticals.** Next.js+TS strict on Vercel Pro `syd1`; `verify` gate + CI (incl. `corpus-check`, `no-advice`, `reading-level`); design tokens (calm/trust-first); GA4; Upstash; i18n scaffold (English); localStorage adapters; define the pathway-entry schema; author **seed entries** for the MVP verticals with `sources` + `VERIFY:` deadline markers; `scripts/build-corpus.mjs` → committed `corpus/index.json`. Exit: corpus builds + lints; empty app deploys; verify green.

**M1 — Cost guard + grounded Ask + verification (engine + safety).** `lib/cost` ($5/session, IP, global budget, fail-closed); `lib/retrieval`; `/api/ask` with the full verifier **including the no-advice/no-prediction gate**; sources panel; "not covered → get help" state; BYO-key. Exit: integration tests prove (a) out-of-corpus citation rejected, (b) advice/prediction rejected, (c) spend blocked/fails closed, (d) escalation path. Ask works in plain language.

**M2 — Decode a letter + pathway + deadline.** `lib/intake` (OCR in-memory + classify) → match entry → plain-language decode; `lib/deadline` (compute from decision date; ICS reminder); deadline shown front-and-centre; letter never stored/logged (test). Exit: scan a sample decision → correct decode + pathway + deadline + sources.

**M3 — Next steps + draft + escalate.** Evidence checklist; `lib/draft` (reasons-request / application skeleton, downloadable); always-present "get help" with real services. Exit: full flow scan/ask → pathway → draft → escalate.

**M4 — FAQ/SEO layer + i18n + accessibility + landing + hardening.** FAQ pipeline (generate → gates → human review → publish MDX, SSG, §8 SEO) with CTA into the tool; add launch languages; screen-reader/mobile pass; landing (trust-first §14.1); legal/UPL + privacy notices; rate limits + headers. Exit: launch gates met; FAQ pages indexable and converting; near-zero operator cost.

**Post-MVP:** (optional) no-login "save & resume" via harness §18 capability-codes (trades against the no-storage promise — decide deliberately); more verticals (visa, public housing, fines) + Victoria (reuse AdminLaw work); reminder accounts (opt-in); shared engine packages across the three apps; partnerships with CLCs for the escalation directory.
