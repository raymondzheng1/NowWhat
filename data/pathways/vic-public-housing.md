---
id: vic-public-housing
title: Public or social housing decision
jurisdiction: Vic
decisionMakers:
  - Director of Housing
  - Homes Victoria
  - 'Department of Families, Fairness and Housing'
  - community housing provider
decisionTypes:
  - public housing application
  - housing transfer
  - housing eligibility
  - priority access
  - housing termination
keywords:
  - public housing
  - social housing
  - housing office
avenue:
  mr:
    available: true
    character: mixed
    body: 'Housing Appeals Office for a housing decision; VCAT for a notice to vacate'
    source: 'housing.vic.gov.au — appeal a decision; Housing Act 1983 (Vic)'
  jr:
    available: true
    conditional: true
    forum: SCV-O56
    source: 'Supreme Court (General Civil Procedure) Rules, Order 56 — supremecourt.vic.gov.au'
  noReviewEndpoint: null
deadlineRule: >-
  A housing review can have a time limit, set by the relevant housing law or
  policy. Check the limit with the Housing Appeals Office or a free service.
  If you are looking at the Supreme Court instead, Victoria has different
  review routes, with different rules and time limits. Order 56 runs 60 days
  from when the grounds first arose. The Administrative Law Act 1978 (Vic)
  runs 30 days. Trying another path first does not restart either clock.
  Choosing the right route can be technical, so get legal help before you file.
verifiedAsAt: '2026-06-30'
sourceUrl: 'https://www.housing.vic.gov.au'
reviewCadenceDays: 90
reasonsRequest:
  how: ask the housing office in writing for the reasons for the decision
  provision: 'Housing Act 1983 (Vic); Residential Tenancies Act 1997 (Vic)'
  extendsMR: 'depends — confirm with the Housing Appeals Office or a free service before relying on it'
  extendsJR: 'depends — confirm with a free legal service before relying on it'
privativeClause: false
forms: []
mrCriteria:
  - >-
    These are two different paths, and which one applies depends on the decision.
  - >-
    For a housing decision — an application, a transfer, a priority category —
    the Housing Appeals Office reviews it. The reviewer considers whether the
    department correctly applied the relevant legislation, policies and
    procedures.
  - >-
    For a notice to vacate, the Housing Appeals Office is not the path. That
    goes to VCAT.
  - For an eviction, VCAT decides whether the notice to vacate is valid.
  - >-
    For an eviction, VCAT also decides whether it is reasonable and proportionate
    to make you leave. It weighs the impact on you and your household.
examples:
  - 'A public housing application refused'
  - 'A transfer or priority access decision'
  - 'An eligibility decision'
  - 'A notice about your public housing'
getHelp:
  - service: Housing Appeals Office
    link: 'https://www.housing.vic.gov.au'
    who: 'free reviews of housing decisions, by an independent reviewer within the housing department'
    phone: '1800 807 702'
  - service: Tenants Victoria
    link: 'https://tenantsvic.org.au'
    who: 'free advice for Victorian renters — Rental Support Line'
    phone: '(03) 9416 2577'
  - service: Victoria Legal Aid
    link: 'https://www.legalaid.vic.gov.au'
    who: 'free legal information and advice — Legal Help line'
    phone: '1300 792 387'
status: verified
isFallback: false
---

Deadline rule lawyer-confirmed (2026-06-30) — shown as a rule + verified-as-at date + official source, never a countdown. Avenue sources and the reasons provision were aligned on 2026-08-17 with the matching verified entry in the decode corpus, so the two knowledge sources now agree. `mrCriteria` was settled by the supervising lawyer on 2026-08-19. The draft put to them said the reviewer checks whether the department applied "its own policies and procedures"; they replaced it with the relevant legislation, policies and procedures, because policy guides a statutory decision rather than supplying the test. The same overstatement was corrected in the decode entry, where it was user-facing.

Routing split 2026-08-23 on the owner's QA decision. This entry's own decisionTypes include
housing termination, and its corpus counterpart already records that public housing splits into two
separate paths with different bodies. The procedural layer blended them into one — "Housing Appeals
Office, then VCAT where applicable" — which reads as a sequence when they are alternatives chosen by
the kind of decision.

Someone facing a notice to vacate who is sent to the Housing Appeals Office first loses time they
may not have.

**Two corrections 2026-08-23 on the owner's ruling.**

**The court sentences no longer contradict themselves.** The rule said Order 56 runs 60 days from
when the grounds first arose, and then that court time runs from the decision. Both cannot be true,
and the app can source neither version. What survives is the part that is sourced and useful:
trying another path first does not restart either clock.

**Judicial review is now conditional, not unconditional.** This entry covers the Director of
Housing, Homes Victoria, the department — and a community housing provider. Judicial review
supervises conferred public power; whether a private provider is amenable to it is not established
anywhere in the owner's materials, and our own decode corpus routes community-housing complaints to
the provider and then the Housing Registrar, not to court.

The owner asked for the card to be hidden for community providers. **It cannot be, and this is
worth knowing**: the flow never learns who made the decision — the person picks an AREA, and the
same entry serves every decision-maker in it. There is no signal to gate on without asking a new
question. So the path takes the shape the owner already approved for conditional merits review: it
still shows, because hiding it would keep a real route from the people who do have it, and the
condition travels with it on the card — "Only where a public body made the decision".

**Three findings from the external review land on this entry, 2026-08-23, and none of them is a
copy change. Recorded here so the next pass does not re-open them looking for one.**

**The Housing Appeals Office inherits the wrong remedies, and the fault is not in this file.**
Because the HAO occupies the `avenue.mr` slot, `planFor` hands its card the merits-review process
entry wholesale — the question "Is this the correct or preferable decision?" and remedies that
include setting aside and substituting the decision. That asserts substitution powers for a
departmental reviewer. This file is already the careful one: `mrCriteria` says only that the
reviewer considers whether the department correctly applied the relevant legislation, policies and
procedures. The looser layer drives the card, so the fix is a third avenue kind — an internal or
administrative appeal with its own question and remedies — or an override of `canDo`/`cannotDo`
from `mrCriteria`, plus the `covVicBody` relabel in `en.json`.

A partial cure was considered and rejected: adding "not a tribunal" to `mrCriteria` would leave one
card saying both things at once, three lines apart. That is a worse defect than the one it patches.

**Director and community provider in one entry** stays as it is. Splitting them is not a content
edit — the intake asks for an AREA, not a decision-maker, so there is no signal to select between
two entries without a new question in the flow. That is the product call the owner already made,
in favour of the travelling condition.

**The HAO and VCAT being typed alike** is the same structural gap seen from the other side. An
administrative appeal inside the housing system and a tribunal exercising tenancy jurisdiction both
sit in `avenue.mr` and are typed identically. The user-facing routing was split on 2026-08-23 and
is correct; what is missing is the legal character in the data, which belongs to the schema.

The court figures in `deadlineRule` carry the same source mismatch corrected in `vic-generic` on
2026-08-23 — Order 56 and the Administrative Law Act stated on an entry whose `sourceUrl` is
`housing.vic.gov.au`. It was not repointed here, because unlike the catch-all this entry's primary
rule is the housing appeal, which that source does carry. Moving it would break the sourcing that
is right to patch the sourcing that is wrong. It needs the per-stage `{provision, url}` source.

**The tribunal's powers deleted from this path, 2026-08-23, on the owner's instruction.** The
Housing Appeals Office sat in the merits-review field, so the result card handed it the tribunal
explainer whole: the question "Is this the correct or preferable decision?" and remedies including
setting a decision aside and substituting a new one. Those are a tribunal's powers. A departmental
reviewer does not have them.

The question went to the supervising lawyer — is the Housing Appeals Office merits review, and what
can it actually do? The owner ruled not to wait for the answer. A non-tribunal path now shows no
question and no remedies at all; `mrCriteria` still says what the reviewer considers, because that
came from the lawyer per scheme and was always the sourced part.

**The path itself stays.** The Housing Appeals Office is free, real, and sourced to housing.vic.gov.au
and the Housing Act 1983 (Vic). What could not be sourced was the claim about its powers, and that is
what came out. Deleting the route instead would have taken a free avenue from the people this entry
exists for.
