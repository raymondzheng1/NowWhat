---
id: vic-fines
title: Fine or infringement notice
jurisdiction: Vic
decisionMakers:
  - Fines Victoria
  - Victoria Police
  - local council
  - Department of Transport
decisionTypes:
  - infringement notice
  - fine
  - penalty notice
  - toll fine
  - parking fine
  - enforcement
keywords:
  - infringement
  - penalty
  - fines
avenue:
  mr:
    available: true
    character: mixed
    body: "internal review, or the Magistrates' Court instead"
    source: 'fines.vic.gov.au — request a review; Infringements Act 2006 (Vic)'
  jr:
    available: true
    forum: SCV-O56
    source: 'Supreme Court (General Civil Procedure) Rules, Order 56 — supremecourt.vic.gov.au'
  noReviewEndpoint: >-
    If review options have closed, a payment plan or financial-hardship option
    may still be available through Fines Victoria, and a free service can help.
deadlineRule: >-
  Fines have a strict time limit. Check the exact limit with Fines Victoria or a
  free service.
verifiedAsAt: '2026-06-30'
sourceUrl: 'https://www.fines.vic.gov.au'
reviewCadenceDays: 90
reasonsRequest:
  how: ask Fines Victoria or the issuing agency in writing for the reasons
  provision: 'Infringements Act 2006 (Vic)'
  extendsMR: 'depends — confirm with Fines Victoria or a free service before relying on it'
  extendsJR: 'depends — confirm with a free legal service before relying on it'
privativeClause: false
forms: []
mrCriteria:
  - >-
    Internal review and asking for the matter to be heard in court are two
    different choices, not steps in order.
  - The reviewing agency decides whether the fine should stand or be cancelled.
  - >-
    The grounds include a mistake of identity, and a decision that was contrary
    to law.
  - >-
    They also include exceptional circumstances, and special circumstances such
    as mental illness, disability, serious addiction, homelessness, or family
    violence.
  - If the matter goes to court instead, the court decides the charge itself.
examples:
  - 'A parking or speeding fine'
  - 'A toll or public transport fine'
  - 'A council fine'
  - 'Enforcement, or trouble paying'
getHelp:
  - service: Fines Victoria
    link: 'https://www.fines.vic.gov.au'
    who: 'manage, review or get help with a Victorian fine'
    phone: '(03) 9200 8111'
  - service: Victoria Legal Aid
    link: 'https://www.legalaid.vic.gov.au'
    who: 'free legal information and advice — Legal Help line'
    phone: '1300 792 387'
  - service: Community legal centres (Federation of CLCs)
    link: 'https://fclc.org.au'
    who: 'free local legal help — find your nearest centre'
status: verified
isFallback: false
---

Deadline rule lawyer-confirmed (2026-06-30) — shown as a rule + verified-as-at date + official source, never a countdown. Avenue sources and the reasons provision were aligned on 2026-08-17 with the matching verified entry in the decode corpus, so the two knowledge sources now agree. `mrCriteria` was supplied by the supervising lawyer on 2026-08-19, confirmed as drafted from the matching verified decode entry. Note this scheme has no tribunal step — the paths are internal review, or having the matter heard in the Magistrates' Court.

**Act attribution dropped from the deadline rule, 2026-08-23 on the owner's ruling.** The rule named
the Fines Reform Act 2014 (Vic) while this entry's own review source and the decode corpus
counterpart both cite the Infringements Act 2006 (Vic), where the 14-day 'person unaware' and 28-day
court-election limits sit. One attribution was wrong and the app could not settle which.

The sentence states no figure and already sends the reader to Fines Victoria, so the citation was
doing no work for them — dropping it removes the contradiction without needing a legal ruling. If
the supervising lawyer confirms the Infringements Act at the next cadence, it can be named again.

**Court is an alternative, not the next stage, 2026-08-23, from the external legal review.**
`avenue.mr.body` read "internal review then Magistrates' Court", and the note above it said the same.
Both described a sequence. Having the matter heard in court is a separate choice a person makes
under the Infringements Act 2006 (Vic) — this entry's own `mr.source` — not a stage that follows a
review. The old wording could leave someone believing court is still open after a review comes back,
or that they have to ask for a review first. The card now reads "internal review, or the
Magistrates' Court instead".

The chip alone is seven words, so the split is also stated in `mrCriteria`, the way the housing
entry states its own routing split. The line adds no figure and no new provision; it names the shape
of a scheme this entry already cites. It was written editorially, not supplied by the supervising
lawyer like the four beneath it, and it goes on the list for the next cadence.

`tests/unit/analysis/plan.test.ts` pins the old string exactly ("internal review then Magistrates'
Court"). The test's point — fines go to internal review and the Magistrates' Court, never VCAT —
survives this change; its literal needs updating with it.

**Still open after this pass: the stage limits.** The reviewer asked us to verify the repeat-review
exceptions and the stage-specific limits across the Infringements and Fines Reform legislation. That
is new sourced content, not a correction, and it waits on the same lawyer confirmation as the Act
attribution above — the 14-day 'person unaware' and 28-day court-election figures cannot be named
until we can say which Act carries which stage.
