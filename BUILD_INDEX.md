# BUILD_INDEX — What Now? (start here) — Tier B, end-user access-to-justice

Read order:
1. `C:\Users\Ivy\RayTasks\Projects\Harness.md` — global guardrails (**Tier B**; tracks §8 SEO, §11 AI content, §10 i18n on).
2. `CLAUDE.md` — operating manual + the **non-negotiable safety posture** (info-not-advice, grounded-or-silent, never store letters, always escalate).
3. `PRODUCT_REQUIREMENTS.md` — what & why (the unified flow §5; grounding engine §7; scope/verticals §12).
4. `TECHNICAL_SPEC.md` — how. Read §0 (knowledge sources), §2 (pathway corpus), §6 (pipeline incl. the no-advice gate) first.
5. `BUILD_PLAN.md` — M0–M4; build in order; verify green at each exit. **M0 defines the corpus schema + seeds verticals.**
6. `corpus/pathways/` — the curated, sourced review-pathway entries. `KNOWLEDGE/answer-structures.md` — answer method.

**MVP scope note:** no authentication; each session is ephemeral/one-off (no accounts, no saved matter, nothing user-specific stored server-side). Capability-code resume (§18) is post-MVP only.

**Four invariants that must never regress:** (1) every output passes `lib/verification` — grounded in the corpus, sourced, **and not advice/prediction**; (2) every model call passes the `lib/cost` guard ($5/session, fail-closed); (3) the user's letter is never stored or logged; (4) when not covered, say "I'm not sure — here's who can help" and route to a real service — never fabricate, never advise.
