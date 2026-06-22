# Review Builder — Build Plan (Tier B; phased)

> **Gate before any live deploy (incl. M-Lean):** legal sign-off + consent/"not legal advice" gate (PRD §12). **Gate before v2:** the lawyer-verified data layer + review cadence.

**M0 — Scaffold + both knowledge builds.** Next.js+TS strict on Vercel Pro `syd1`; `verify` gate + CI (incl. `corpus-check`, `data-check`, `no-advice`, `reading-level`); design tokens (calm/trust-first §14.1); GA4; Upstash; i18n scaffold (English); localStorage adapters; define the schemas; `scripts/build-corpus.mjs` → `corpus/legal/index.json` (grounds/elements/cases/triage from our materials) and `scripts/build-data.mjs` → `data/index.json` (seed Vic+Cth pathway entries with `verifiedAsAt`/`sourceUrl` + `VERIFY:` markers). Exit: both indexes build + lint; empty app deploys; verify green.

**M-Lean — the "Rights Saver" MVP (steps 0,1,2,9 — deterministic, near-zero UPL).** `lib/triage` (who-decided → avenue/body/MR-vs-JR/no-review, Vic+Cth); `lib/deadline` (rule + verifiedAsAt + source link + **staleness gate; no countdown**); `lib/reasons` (template + corrected MR/JR clock warning); `lib/tripwire` (stop-and-route incl. imminent-deadline, family/guardianship/MH, unclassifiable, privative-flag); `lib/handoff` (matter summary) + find-help directory; consent gate; trust-first landing. Exit: a Vic or Cth user gets correct avenue + deadline rule + reasons template + (where relevant) a clean route-out; integration tests for staleness gate + tripwire + no-PII-stored; **legal sign-off + consent gate in place** → can go live.

**M1 — Engine + cost guard + grounded Ask/elements (v2 begins, behind the data gate).** `lib/cost` ($5/session, IP, global budget, fail-closed); `lib/learn` (deterministic Learn module, step 3, from corpus/legal); `lib/intake` (text + voice STT, in-memory, length-capped); `lib/elements` (per-ground element map, relates-not-satisfies, neutral/all-grounds) with the full verifier incl. no-advice/no-score. Exit: integration tests prove out-of-corpus citation rejected, advice/score/ranking rejected, relates-not-satisfies enforced, spend blocked/fails-closed.

**M2 — Leading cases + draft + evidence/where-to-lodge.** `lib/cases` (leading-cases-that-explain-the-ground, verified, pinpointed); `lib/draft` (review-document draft, "the applicant contends", no outcome claims, user lodges) + evidence checklist + where-to-lodge (data-gated). Exit: full builder produces a grounded draft + a lawyer hand-off pack; data-layer release gate met.

**M3 — MR evidence/submission path + accessibility + i18n + SEO FAQ + hardening.** Distinct MR path (evidence + substantive-criteria submission); screen-reader/mobile pass; launch languages; optional SEO FAQ from grounded Q&A (human-reviewed); rate limits + headers. Exit: launch gates met.

**Post-MVP:** CLC/advocate intake accelerator (same engine, professional user — the commercial path); more states/verticals as the data layer scales.
