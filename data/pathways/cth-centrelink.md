---
id: cth-centrelink
title: Centrelink / social-security decision or debt
jurisdiction: Cth
decisionMakers:
  - Services Australia
  - Centrelink
  - Child Support
  - Department of Social Services
decisionTypes:
  - debt notice
  - overpayment
  - payment cancelled
  - payment reduced
  - claim rejected
  - social security
keywords:
  - centrelink
  - welfare
  - pension
  - jobseeker
avenue:
  mr:
    available: true
    body: internal review by Services Australia, then the ART
    source: 'art.gov.au — apply for a review; Social Security (Administration) Act 1999 (Cth)'
  jr:
    available: true
    forum: ADJR/FederalCourt
    source: 'Administrative Decisions (Judicial Review) Act 1977 (Cth) s 5 — legislation.gov.au'
  noReviewEndpoint: null
deadlineRule: >-
  Centrelink reviews have a time limit, set by the Social Security
  (Administration) Act 1999 (Cth). Check the exact limit with Services Australia
  or a free service.
verifiedAsAt: '2026-06-30'
sourceUrl: 'https://www.servicesaustralia.gov.au/reviews-and-appeals'
reviewCadenceDays: 90
reasonsRequest:
  how: ask Services Australia for a written statement of reasons
  provision: 'Social Security (Administration) Act 1999 (Cth); Administrative Review Tribunal Act 2024 (Cth) ss 268-269; Administrative Decisions (Judicial Review) Act 1977 (Cth) s 13'
  extendsMR: 'depends — confirm with Services Australia or a free service before relying on it'
  extendsJR: 'depends — confirm with a free legal service before relying on it'
privativeClause: false
forms: []
mrCriteria:
  - The tribunal decides whether the rules were applied correctly to your situation.
  - >-
    It decides whether the facts relied on were right, such as the income and
    dates used.
  - Where there is a debt, it decides whether the debt is owed and how much it is.
  - It decides whether your circumstances were properly taken into account.
examples:
  - 'A debt or overpayment notice'
  - 'A payment cancelled or reduced'
  - 'A claim that was rejected'
  - 'JobSeeker, Age Pension or DSP'
getHelp:
  - service: Economic Justice Australia (welfare rights centres)
    link: 'https://www.ejaustralia.org.au'
    who: 'free, independent help with Centrelink decisions and debts'
  - service: National Debt Helpline
    link: 'https://ndh.org.au'
    who: 'free, independent financial counselling'
    phone: '1800 007 007'
  - service: Administrative Review Tribunal (ART)
    link: 'https://www.art.gov.au'
    who: 'independent external review of Commonwealth decisions'
status: verified
isFallback: false
---

Deadline rule lawyer-confirmed (2026-06-30) — shown as a rule + verified-as-at date + official source, never a countdown. Avenue sources and the reasons provision were aligned on 2026-08-17 with the matching verified entry in the decode corpus, so the two knowledge sources now agree. `mrCriteria` was supplied by the supervising lawyer on 2026-08-19, confirmed as drafted from the matching verified decode entry.

**Two corrections 2026-08-23 on the owner's ruling, both from the Fable QA.**

**The review step now names the internal review.** `avenue.mr.body` was the bare acronym "ART",
which sits in `NOT_A_FORUM_NAME`, so the result card fell back to the corpus' general tribunal name
and step 3 sent people straight to the tribunal. This app's own lawyer-confirmed decode entry says
the first step is usually an internal review by an Authorised Review Officer at Services Australia,
with the ART after it. The two layers disagreed about the sequence, which is different from
deliberate silence. The correction is extracted from our own verified corpus, not from outside
knowledge, and the fines entry already showed this field can carry a sequence.

**`extendsJR` is no longer a flat false.** The schema comment asserted that a reasons request NEVER
pauses a judicial-review period. Some statutory schemes run the period from when the requested
statement arrives, so that was a rule the app could not source. It now takes the same three-state
shape as `extendsMR` and says it depends, naming who to ask. The old value erred in the safe
direction — a reader acting earlier — but an unsourceable rule on a deadline is the thing this
corpus exists to prevent.
