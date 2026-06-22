# BUILD_INDEX — Review Builder (start here) — Tier B, end-user access-to-justice

Read order:
1. `C:\Users\Ivy\RayTasks\Projects\Harness.md` — global guardrails (**Tier B**).
2. `CLAUDE.md` — operating manual + the **non-negotiable safety posture** and the **two knowledge sources**.
3. `PRODUCT_REQUIREMENTS.md` — what & why. Read **§1 (two knowledge sources)**, **§3 (the flow + tripwire)**, **§5 (deadline safety contract — no countdown)**, **§12 (release gates)**.
4. `TECHNICAL_SPEC.md` — how. Read **§0 (knowledge sources)**, **§6 (pipeline + no-advice/no-score gate)**, **§7 (must-have tests)**.
5. `BUILD_PLAN.md` — M0 → **M-Lean (ship this first)** → M1–M3 (v2, behind the data + legal gates).
6. `corpus/legal/` (our materials → grounds/elements/cases/triage) + `data/pathways/` (lawyer-verified procedural facts) + `KNOWLEDGE/answer-structures.md` (answer method).

**Five invariants that must never regress:** (1) every AI output passes `lib/verification` — grounded in `corpus/legal`, **not advice, no score/ranking, "relates" not "satisfies"**; (2) every model call passes the `lib/cost` guard ($5/session, fail-closed); (3) **no deadline is ever a computed countdown** — rule + verifiedAsAt + source link, staleness-gated; (4) the user's story/letter is never stored or logged; (5) the tripwire stops the builder and routes to a human for the high-harm cases.

**Two ship gates (not optional):** legal sign-off + consent gate before any live deploy; the lawyer-verified data layer + review cadence before v2.
