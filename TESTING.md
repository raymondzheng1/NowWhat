# Testing — What Now?

The whole quality bar is one command: **`npm run verify`**. It must be green before every push.

```
npm run verify
```
chains, in order:

1. `build-corpus` — rebuild `corpus/index.json` from `corpus/pathways/*.md`
2. `corpus-check` — **safety linter**: every entry has a source + help; **no entry asserts a deadline figure that isn't verified + sourced**; flags seed / stale entries
3. `no-advice-check` — bans first-person advice + outcome prediction in all customer copy (shares `lib/safety/no-advice-patterns.json` with the runtime gate)
4. `no-ai-mentions-check` — no AI/model/vendor mentions in customer copy
5. `reading-level-check` — Flesch–Kincaid grade ≤ 11 on prose surfaces
6. `links-check` — every internal link resolves to a real route
7. `seo-check` — sitemap/robots/FAQ template present; every FAQ page has the SEO frontmatter
8. `launch-check` — Tier-B launch deliverables present (PWA manifest + icons, Vercel Analytics + GA loader, sitemap/robots/metadata/JSON-LD, dual KV env-name read, verifier + cost guard + DISCLAIMER)
9. `eslint .` + `tsc --noEmit`
10. `vitest run`

## Test layers (harness §4.4)

- **Unit** (`tests/unit/**`) — pure logic + drift-defence + regression. Covers the verifier, the no-advice gate, deadline math (pinned clock), ICS, the cost guard (incl. fail-closed), the draft builder, retrieval, and corpus validation against the Zod schema.
- **Integration** (`tests/integration/api.test.ts`) — drives the real route handlers with **Anthropic mocked** (`__setModelForTests`) and **Upstash via the memory KV seam** (`__setKvForTests`). This is the **safety contract** (TECHNICAL_SPEC §7):
  - (a) an answer citing a source not in the corpus → rejected → `not-covered`
  - (b) advice / prediction → rejected → `not-covered`
  - (c) cost cap reached → `blocked` (fail-closed)
  - (d) nothing matches → `not-covered` + escalation
  - (e) the letter text is **never echoed back** in the response
- **Drift defence** (`tests/unit/drift/conventions.test.ts`) — structural assertions: every model route runs the cost guard; the runner verifies every output; no route writes to disk or console-logs the letter; the disclaimer is one constant; KV reads both env-name conventions.

## The regression loop (harness §4.5)

Reproduce → write a failing test named after the symptom → fix → the test stays forever. The corpus only grows; never delete a test to go green. Every new/changed function in `lib/` ships with its tests in the same change.

## Seeds are not launch-ready

`corpus-check` **passes with warnings** for `status: seed` entries (45 `VERIFY` markers as of writing). The app builds and runs on seeds, but a human must confirm each figure against its cited source and flip `status: verified` (set `deadlineDays`, `deadlineVerified: true`, the real source, `lastVerified`) **before launch**. Until then the app never states a specific deadline — `deadlineIsRenderable()` guarantees it.
