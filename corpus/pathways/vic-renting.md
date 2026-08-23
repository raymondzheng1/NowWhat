---
id: vic-renting
title: "I'm renting in Victoria and got a notice or a rent increase I disagree with"
jurisdiction: Victoria
status: verified
decisionTypes:
  - notice to vacate
  - notice of rent increase
  - rent increase
  - application for a possession order
  - possession order
  - warrant of possession
  - bond claim
  - eviction
  - notice for repairs
issuers:
  - rental provider
  - landlord
  - real estate agent
  - Consumer Affairs Victoria
  - VCAT
  - Rental Dispute Resolution Victoria
keywords:
  - tenant
  - renter
  - lease
  - rental agreement
  - RTBA
  - bond
  - repairs
  - Tenants Victoria
reviewable:
  value: "yes"
  basis: "Renters can challenge a notice to vacate and an excessive rent increase, and can resolve bond, repairs and compensation disputes for free."
  verified: true
pathways:
  - name: "Challenge a notice to vacate at VCAT"
    body: "VCAT (Residential Tenancies list)"
    deadline: "Apply within 30 days to challenge the notice early. If you miss that, you can still argue the notice is not valid at the possession hearing, and you can ask for more time."
    deadlineDays: 30
    deadlineVerified: true
    howCounted: "from the day the notice to vacate was given to you"
    howToStart: "apply to VCAT to challenge the notice (the case type is 'challenge a notice to vacate')"
    cost: "an application fee may apply, but fee waivers and concessions are available"
    source: "Residential Tenancies Act 1997 (Vic) s 91ZZS; consumer.vic.gov.au — challenging a notice to vacate; vcat.vic.gov.au"
  - name: "Ask Consumer Affairs Victoria to check an excessive rent increase"
    body: "Consumer Affairs Victoria"
    deadline: "Ask within 30 days for a free rent assessment."
    deadlineDays: 30
    deadlineVerified: true
    howCounted: "from the day the rental provider gave you the written rent-increase notice"
    howToStart: "ask Consumer Affairs Victoria for a free rent assessment"
    cost: "free"
    source: "consumer.vic.gov.au — challenging rent increases or high rent"
  - name: "Get free help with a rent, bond, repairs or compensation dispute"
    body: "Consumer Affairs Victoria, or Tenants Victoria"
    deadline: "Time limits can apply. Ask them early rather than later."
    deadlineDays: null
    deadlineVerified: false
    howToStart: "contact Consumer Affairs Victoria or Tenants Victoria and describe the dispute"
    cost: "free"
    source: "consumer.vic.gov.au — renting; tenantsvic.org.au"
rightToReasons:
  available: "sometimes"
  how: "a notice to vacate must be on the correct form and give a valid reason — if it isn't, it may not be valid, and a rent increase must use the correct form"
  provision: "Residential Tenancies Act 1997 (Vic)"
  source: "consumer.vic.gov.au; tenantsvic.org.au"
  verified: true
groundsOrCriteria:
  - "the notice is on the wrong or out-of-date form, or is missing required information"
  - "the notice period is too short for the reason given"
  - "the reason on the notice is not a lawful reason, or is not genuine (for example, a 'sale' notice when there is no real plan to sell)"
  - "the notice was given because you asked for repairs or stood up for your rights"
  - "for a rent increase: it came less than 12 months after the last one, or the rent is high compared with similar nearby homes and the condition of the place"
  - "for a rent increase, the notice may also be too short: from 25 November 2025 the minimum notice period is 90 days, and it was 60 days before that, so an older notice may lawfully use the shorter period"
evidenceChecklist:
  - "the notice or letter itself, so you can check the date, the form and the reason"
  - "your rental agreement (lease) and any condition report"
  - "your rent payment records"
  - "messages with the rental provider or agent, including when you got the notice"
  - "photos of the condition of the place and any repairs needed"
  - "the envelope or postmark showing when the notice arrived"
getHelp:
  - service: "Tenants Victoria"
    who: "free advice for Victorian renters — Rental Support Line"
    phone: "(03) 9416 2577"
    link: "https://tenantsvic.org.au"
  - service: "Rental Dispute Resolution Victoria (RDRV)"
    who: "free help to resolve bond, rent, repairs and compensation disputes"
    phone: "1300 017 378"
    link: "https://www.rdrv.vic.gov.au"
  - service: "Victoria Legal Aid"
    who: "free legal help and duty lawyers — Legal Help line"
    phone: "1300 792 387"
    link: "https://www.legalaid.vic.gov.au/renting"
  - service: "Consumer Affairs Victoria"
    who: "free renting information and rent assessments"
    link: "https://www.consumer.vic.gov.au/housing/renting"
plainLanguageExplainer: "If you rent in Victoria and you got a notice to vacate or a rent increase you think is unfair, you have options. You can ask VCAT to check whether a notice to vacate is valid. You can ask Consumer Affairs Victoria for a free check of a rent increase. Free help with bond, repairs and rent disputes is available too. There are time limits, so it helps to act early."
sources:
  - "Residential Tenancies Act 1997 (Vic) — legislation.vic.gov.au"
  - "Consumer Affairs Victoria — Challenging a notice to vacate; Challenging rent increases or high rent — consumer.vic.gov.au"
  - "VCAT — Residential tenancies — vcat.vic.gov.au"
  - "Rental Dispute Resolution Victoria — rdrv.vic.gov.au"
  - "Tenants Victoria — tenantsvic.org.au"
lastVerified: "2026-06-16"
---

Figures here were checked against the cited Victorian sources on 2026-06-16. The owner
confirmed them on 2026-08-17. The entry is verified on that basis. It stays on the 90-day
review cycle.

The old note said a lawyer should confirm the figures before launch. That clashed with the
verified status. The renting twin in the data layer had already recorded the confirmation.
And the note was not inert. This text feeds the chat grounding set and the safety checker.
So the app read a pre-launch caveat as verified content.

One recent change matters when reading a renter's letter: the rent-increase notice period
changed on 25 November 2025, which is why an older letter may lawfully use a shorter one.

That figure used to live only here, in prose. `entry.body` feeds the verifier's grounded
time-figure set, so a model answer could state it on the strength of a note rather than a sourced
field — the safety check would have accepted a number nothing had verified. It now sits in
`groundsOrCriteria`, which is customer-visible content covered by this entry's sources, with the
before-and-after periods both stated so a reader can tell which one applied to their notice.

The 30-day window to challenge a notice to vacate is the time to challenge it *early* —
it is not the only chance. A renter can still argue a notice is invalid at the
possession hearing, so missing 30 days does not end their options.

**The RDRV route removed 2026-08-23 on the owner's instruction.** The entry sent a rent, bond,
repairs or compensation dispute to Rental Dispute Resolution Victoria, said RDRV could refer it
to VCAT, and gave a trigger counted from a rent assessment report. That is a statement about which
body has jurisdiction and in what order — the kind of claim that sends someone to the wrong place
after they have used the step that could have helped.

It rested on a note about a scheme that changed in June 2025, sourced to two government websites
rather than to the Act, and an external accuracy review asked for it to be checked against the
current RTA and RDRV jurisdiction. We could not check it, so it is gone rather than pending.

What replaces it asserts no forum: free help with a rent, bond, repairs or compensation dispute,
through Consumer Affairs Victoria or Tenants Victoria. RDRV stays in `getHelp` as a free service
a person can ring — a contact is not a jurisdiction claim, and removing a working phone number
would help nobody.
