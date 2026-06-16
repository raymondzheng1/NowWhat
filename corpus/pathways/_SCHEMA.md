# Pathway entry schema — author one Markdown file per decision type

Each file is **YAML frontmatter** (parsed by `gray-matter`) + an optional Markdown body
(extended plain-language notes). The frontmatter is validated against
`lib/schemas/corpus.ts` (`PathwayEntrySchema`) by `scripts/build-corpus.mjs` and
`scripts/corpus-check.mjs`. **The build fails on any schema violation.**

```yaml
---
id: <kebab-case-unique-id>
title: "<plain-language title a worried person would recognise>"
jurisdiction: Commonwealth            # or a state/territory
status: seed                          # seed | verified  (seeds carry VERIFY markers)
decisionTypes: [ ... ]                # phrases used to classify an incoming letter (≥1)
issuers: [ ... ]                      # agency names that send this decision (≥1)
keywords: [ ... ]                     # extra retrieval terms (optional)
reviewable:
  value: yes | no | sometimes
  basis: "<plain explanation>"
  verified: false                     # true only when a human confirms + sources it
pathways:                             # ≥1 review route
  - name: "<route name>"
    body: "<who reviews it>"
    deadline: "<human-readable; may contain VERIFY>"
    deadlineDays: null                # integer days — ONLY set when verified + sourced
    deadlineVerified: false           # gates whether a concrete date is ever computed
    howCounted: "<from what date>"
    howToStart: "<plain steps>"
    cost: "free"                      # optional
    source: "<authoritative URL/citation or VERIFY(...)>"
rightToReasons:
  available: yes | no | sometimes
  how: "<how to ask>"
  provision: "<provision or VERIFY>"
  source: "<source or VERIFY>"
  verified: false
groundsOrCriteria: [ "<plain> (source)" ]
evidenceChecklist: [ "<plain item>" ]
getHelp:                              # ≥1 real free service
  - { service: "...", who: "...", link: "<URL/phone or VERIFY>" }
plainLanguageExplainer: "<≤ target reading grade; no advice; no prediction>"
sources: [ "<authoritative URL/citation>" ]   # ≥1
lastVerified: null                    # YYYY-MM-DD; null until verified — corpus-check flags
---

<optional Markdown body: extended plain-language notes>
```

## SAFETY (non-negotiable)

- **Never ship a deadline/figure without a verified source.** A concrete date is computed
  and shown to a person **only** when a pathway has `deadlineVerified: true`, a numeric
  `deadlineDays`, and a real (non-`VERIFY`) `source`. Otherwise the app says "a time limit
  applies — here's who can confirm it" and routes to help. (`deadlineIsRenderable()`.)
- **Seed values carry `VERIFY:`** in the relevant string until a human confirms the current
  figure against the cited source and flips `status` → `verified`, sets `deadlineDays`,
  `deadlineVerified: true`, the real source, and `lastVerified`.
- **Never fabricate** a statute number, provision, link, or deadline. Leave `VERIFY` /
  `null` and let the app route to a human. This is the grounded-or-silent guarantee.
