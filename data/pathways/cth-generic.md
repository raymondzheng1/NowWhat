---
id: cth-generic
title: A Commonwealth government decision
jurisdiction: Cth
decisionMakers:
  - Commonwealth agency
  - Australian Government department
  - Services Australia
  - Australian Taxation Office
decisionTypes:
  - government decision
  - adverse decision
  - refusal
  - cancellation
  - review
  - debt
keywords:
  - commonwealth
  - federal
  - decision
avenue:
  ir:
    available: true
    conditional: true
    body: the agency that made the decision
    source: 'Owner''s administrative-law knowledge base — internal review (2026-08-22)'
  mr:
    available: true
    conditional: true
    body: ART (where the enabling Act provides)
    source: 'art.gov.au — apply for a review; and the Act your decision was made under'
  jr:
    available: true
    conditional: true
    forum: ADJR/FederalCourt
    source: 'Administrative Decisions (Judicial Review) Act 1977 (Cth) s 5 — legislation.gov.au'
  noReviewEndpoint: >-
    If no review right exists, the Commonwealth Ombudsman can look at how the
    decision was made, and a free legal service can explain your options.
deadlineRule: >-
  Most reviews have a strict time limit, set by the law for your decision. Check
  it with the official body or a free service.
verifiedAsAt: '2026-08-17'
sourceUrl: 'https://www.art.gov.au'
reviewCadenceDays: 90
reasonsRequest:
  how: 'ask the decision-maker in writing for a statement of reasons. The tribunal right only exists where your decision can go to the tribunal; the judicial review right is separate'
  provision: 'Administrative Review Tribunal Act 2024 (Cth) ss 268-269, where the decision is reviewable; and Administrative Decisions (Judicial Review) Act 1977 (Cth) s 13'
  extendsMR: 'depends on the Act your decision was made under — confirm before relying on it'
  extendsJR: 'depends — confirm with a free legal service before relying on it'
privativeClause: false
forms: []
mrCriteria:
  - The criteria come from the Act your decision was made under, not from a general rule.
getHelp:
  - service: Commonwealth Ombudsman
    link: 'https://www.ombudsman.gov.au'
    who: 'free complaints about Australian Government bodies (cannot overturn a decision)'
  - service: Community legal centres (Federation of CLCs)
    link: 'https://fclc.org.au'
    who: 'free local legal help — find your nearest centre'
  - service: Administrative Review Tribunal (ART)
    link: 'https://www.art.gov.au'
    who: 'independent external review of Commonwealth decisions'
status: verified
isFallback: true
---

Lawyer-verified 2026-08-17, when the owner confirmed the figures and sources for the three seed entries and `status` was flipped to `verified`. The SEED note that stood here was never rewritten, so the file contradicted itself until a senior-partner QA pass caught it on 2026-08-22. This is the Commonwealth catch-all: it still says review is only 'sometimes' available, because that is true of a fallback entry and must not be softened.

**Two corrections 2026-08-23, from the external legal review the owner accepted.**

**The official source is no longer the Ombudsman.** `sourceUrl` is not a general citation for the
entry — it is the one link rendered beside the time-limit rule, under the label "official source".
The Commonwealth Ombudsman sets no review time limit and cannot overturn a decision, so it could not
source the rule it was standing next to. It now points at the ART, which is the review body this
entry already names in `avenue.mr.source`. The Ombudsman keeps its correct place under `getHelp`,
where it is labelled for what it does.

**Judicial review is now conditional.** The catch-all offered the ADJR path unconditionally on an
s 5 citation, and this entry covers the decisions we have no specific guide for — including ones
the ADJR Act does not reach, since its Schedule 1 takes classes of decision out. The entry cannot
know which the reader has, so the path takes the shape already approved for the merits path here
and for the housing court path: it still shows, and the condition travels with it.

The condition's wording is not in this file. `AnalysisPanel` renders one string,
`rights.pathConditionalJudicial` in `lib/i18n/messages/en.json`, for every conditional court path,
and it was written for public housing, where the open question is who decided. Here the open
question is which decisions the Act reaches. The string reads "Depends on who made the decision —
check this with a free service" as at 2026-08-23, so the card hedges and routes to a human, which is
short of the point but no longer promises the path outright. A Commonwealth key of its own — plainly,
that some decisions sit outside this court path — would finish the fix.

**Internal review offered, conditionally, 2026-09-11.** The catch-alls covered decisions we
hold no specific guide for, and they showed merits review and judicial review but no internal
review at all — so the people with the least guidance were the only ones never told about the
cheapest step. A person who picked "a Victorian government decision" saw two paths, both of
them slower and harder than asking the decision-maker to look again.

Nothing new is asserted. The corpus entry for the step already says "many schemes let you ask
the department to look at its own decision again" and, for exactly this case, "if the letter
does not mention it, you can ask the department whether an internal review is available". The
body is named no more precisely than we can know it — the agency that made the decision — and
the condition travels with the card, the same shape the merits path on this entry already
uses for the same reason.
