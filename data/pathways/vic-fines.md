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
  ir:
    available: true
    body: the agency that issued the fine, or Fines Victoria
    source: 'fines.vic.gov.au — request a review; Infringements Act 2006 (Vic)'
  mr:
    available: true
    character: court
    body: "the Magistrates' Court, if you elect to have it heard there"
    source: 'fines.vic.gov.au — go to court; Infringements Act 2006 (Vic)'
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
irCriteria:
  - The reviewing agency decides whether the fine should stand or be cancelled.
  - >-
    The grounds include a mistake of identity, and a decision that was contrary
    to law.
  - >-
    They also include exceptional circumstances, and special circumstances such
    as mental illness, disability, serious addiction, homelessness, or family
    violence.
mrCriteria:
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

**Internal review became a path of its own, 2026-09-10.** It was buried inside the
merits-review body string, which is how a departmental reviewer came to inherit a
tribunal's card. For most decisions this service covers it is the first step and the
cheapest, and it was reachable only as an explainer link while the result screen called
merits and judicial review "the two paths".

The body and source come from this entry's own verified decode counterpart, so nothing new
is asserted — the fact was already published, in the wrong field.

**And the court election is typed as a court, not as merits review.** "Internal review, or
the Magistrates' Court instead" sat under a card headed MERITS REVIEW. Neither half was:
the first is internal, and a court hearing a fine on election is not reviewing an
administrative decision on its merits. The internal half is now its own path and the court
half carries `character: court`, so the card takes a neutral title and claims no tribunal
powers.

**The criteria were split to follow the avenue, 2026-09-10.** When internal review became its
own path, `mrCriteria` stayed where it was — so the four lines the supervising lawyer supplied
on 2026-08-19 about what the ISSUING AGENCY decides on a review (the fine stands or is
cancelled; mistake of identity; a decision contrary to law; exceptional and special
circumstances such as mental illness, disability, serious addiction, homelessness or family
violence) were captioned "what they decide for a decision like yours" under a card naming the
Magistrates' Court. A court hearing a fine on election decides the charge; it does not apply
the statutory review grounds. The same lines appeared nowhere on the internal-review card,
which is the card of the body that does apply them.

Nothing was rewritten to split it, and no line was added or dropped. Every line names the body
it is about, so each was filed under the body it names. The ROUTING line — that internal review
and electing to go to court are two different choices, not steps in order — appears on both,
because a person reading either card needs it. It is the sentence that stops someone believing
they must be refused a review before they can elect to go to court.

**The routing line is withdrawn, 2026-09-12, on the owner's ruling.** It read "Internal review
and asking for the matter to be heard in court are two different choices, not steps in order",
and it sat on both criteria lists and in the "worth knowing" box above the points.

It was never the supervising lawyer's — the note of 2026-08-23 above records it as written
editorially, and put it on the list for the next cadence. The owner's view is that it is not
right, and that is the better reading of this entry's own source: under the Infringements Act
2006 (Vic) a person refused an internal review may still elect to have the matter heard in
court while time remains, so "not steps in order" overstates a relationship the app cannot
source either way.

`avenue.pathsAre` went with it. It was set to "alternatives" on the strength of that sentence
and nothing else, so with the sentence withdrawn the entry claims neither order nor
alternation, and the panel falls back to saying only that the paths are listed in the order
people usually consider them. The housing entry keeps its own "alternatives", which rests on
the lawyer's line that which body applies "depends on the decision".
