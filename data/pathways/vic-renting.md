---
id: vic-renting
title: 'Renting decision (notice to vacate, rental dispute)'
jurisdiction: Vic
decisionMakers:
  - rental provider
  - landlord
  - real estate agent
  - Director of Housing
  - owners corporation
decisionTypes:
  - notice to vacate
  - notice to leave
  - rental dispute
  - bond
  - repairs
  - eviction
  - rent increase
keywords:
  - tenant
  - renting
  - lease
  - tenancy
avenue:
  mr:
    available: true
    body: VCAT
    source: 'vcat.vic.gov.au — Residential Tenancies list; Residential Tenancies Act 1997 (Vic)'
  jr:
    available: false
    forum: ''
    source: ''
  noReviewEndpoint: null
deadlineRule: >-
  Renting reviews have a strict time limit, set by the Residential Tenancies
  Act 1997 (Vic). Check the exact limit for your situation with VCAT or a
  free service. Trying something else first does not restart the clock. If
  VCAT decides against you, that is not always the end. A further step to a
  court can be open, and there is more than one kind. Which one applies
  depends on the law that set VCAT up. Those time limits are short, so ask a
  free service in the week the decision arrives.
verifiedAsAt: '2026-08-17'
sourceUrl: 'https://www.vcat.vic.gov.au'
reviewCadenceDays: 90
reasonsRequest:
  how: >-
    check the notice itself first — it must be on the correct form and state a
    valid reason — then ask the rental provider in writing to confirm the reason
    and send anything they relied on
  provision: ''
  extendsMR: 'depends — confirm with VCAT or a free service before relying on it'
  extendsJR: 'depends — confirm with a free legal service before relying on it'
privativeClause: false
forms: []
mrCriteria:
  - >-
    VCAT decides whether the notice is valid and whether it is reasonable and
    proportionate to make a possession order.
getHelp:
  - service: VCAT — Residential Tenancies list
    link: 'https://www.vcat.vic.gov.au'
    who: 'applies to renting disputes, including notices to vacate'
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

Lawyer-verified 2026-08-17: the owner confirmed this entry's figures and sources, and `status` was flipped to `verified` then. The note that stood here still described it as a SEED with placeholder figures, which a senior-partner QA pass on 2026-08-22 correctly flagged as contradicting the entry's own status. The status is right; the note had simply never been rewritten.

Judicial review removed 2026-08-23 on the owner's ruling. This layer asserted a Supreme Court
pathway for renting, which made every renting result open with "Two paths are open for this
decision."

A notice to vacate comes from a private rental provider. There is no public decision to review, and
the corpus entry for this decision type has always, deliberately, carried no judicial-review
pathway — a Fable QA pass called that omission "a virtue" and used it as the yardstick for the
others. The two layers now agree.

**Two corrections 2026-08-23 on the owner's ruling, completing the judicial-review removal made a
day earlier.**

**The reasons step follows the Act's actual mechanism.** `provision` held a description, not a
provision — "the reasons a notice must state — Residential Tenancies Act 1997 (Vic)" — and
`lib/reasons` interpolates that field straight into a letter the person sends: "Under the reasons a
notice must state — Residential Tenancies Act 1997 (Vic), I ask for...". Garbled, and it asked a
private landlord for a statement of reasons the RTA does not provide.

The decode corpus counterpart gets this right and is the yardstick the owner chose for renting: the
notice itself must be on the correct form and state a valid reason. `how` now says that first, then
asks the rental provider in writing to confirm the reason. `provision` is empty, so the letter reads
plainly with no section number in it.

**The Supreme Court sentences are gone from the deadline rule.** They were left behind when `jr` was
set to unavailable, so the entry warned about Order 56 and Administrative Law Act clocks for a path
it no longer offers.

**Two further corrections the same day, 2026-08-23, from the external review the owner accepted.**

**The last of the judicial-review residue is gone.** `jr.source` still held the Order 56 citation
for a path this entry stopped offering the day before — dead metadata, and the kind that gets read
back out as a source. Cleared, matching `forum`, which was emptied at the same time.

**A renter who loses at VCAT is no longer left at a dead end.** With one path on the result and
nothing said about what follows it, the entry read as though VCAT was the end of the road. It is
not, and the gap sat in the worst possible place: the routes that follow a tribunal have their own
clocks, and they are short.

The substance comes from `corpus/legal/processes/judicial-review.md`, which is lawyer-verified and
already publishes it — a tribunal decision can be appealed to a court on a question of law, that is
separate from judicial review of the tribunal's own decision, and the windows are shorter than
people expect. Nothing new is asserted here.

Two things were done deliberately. The phrase "judicial review" is kept out: this entry says
judicial review is unavailable, because a private rental provider's notice is not a public decision,
and reusing the term four sentences later would read as a contradiction rather than the different
thing it is. And availability is not promised — which route is open, and to which court, depends on
the law that set VCAT up, so the line says that and sends the person to a free service. Tenants
Victoria and Victoria Legal Aid are already in `getHelp`.
