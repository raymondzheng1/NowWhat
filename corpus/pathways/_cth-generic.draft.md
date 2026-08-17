---
# ============================================================================
# DRAFT FOR OWNER / LAWYER REVIEW — NOT LIVE.
#
# The filename starts with "_", and scripts/build-corpus.mjs skips those, so
# nothing in this file reaches /ask or /decode until it is renamed to
# corpus/pathways/cth-generic.md and rebuilt.
#
# WHY IT MATTERS: corpus/ currently has FIVE entries and no Commonwealth
# catch-all. A letter from the NDIA, DVA, the ATO, Home Affairs, Medicare or
# child support classifies to nothing, and the person gets "not covered". This
# entry is the single biggest coverage gain available — far wider than Centrelink.
#
# HOW TO REVIEW: every line below is either (a) sourced, with the source named
# in `sources`, or (b) marked VERIFY. Confirm or correct the VERIFY lines, then
# set status: verified and lastVerified, and rename the file.
#
# NOTE FOR THE ENGINEER: nothing currently gates a corpus entry by `status`, so
# a `seed` entry WOULD be served live the moment it is built. That is the same
# trap that `status: seed` had for grounds. Gate it before renaming this file.
# ============================================================================
id: cth-generic
title: An Australian Government decision
jurisdiction: Commonwealth
status: seed
isFallback: true
decisionTypes:
  - commonwealth decision
  - federal decision
  - notice of decision
  - application refused
  - claim rejected
  - entitlement cancelled
issuers:
  - Australian Government department
  - Commonwealth agency
  - NDIA
  - Department of Veterans Affairs
  - Australian Taxation Office
  - Services Australia
  - Home Affairs
keywords:
  - commonwealth
  - federal
  - ndis
  - veterans
  - tax
  - medicare
  - child support
reviewable:
  value: sometimes
  # Deliberately "sometimes", not "yes". Merits review at the ART exists only where
  # the enabling Act provides for it — this is the single most important limit on
  # this entry, and the one most likely to be over-read.
  basis: >-
    Merits review by the Administrative Review Tribunal is available only where
    the Act the decision was made under provides for it. Judicial review of a
    Commonwealth decision is available more generally.
  verified: false
pathways:
  - name: Ask the decision-maker to give you the reasons in writing
    body: the department or agency that made the decision
    cost: free
    what: >-
      A written statement of reasons tells you what was taken into account. It is
      the cheapest first step and it costs you nothing.
    source: 'ART Act 2024 s 268 — legislation.gov.au'
  - name: Ask the department to look at the decision again (internal review)
    body: the department or agency that made the decision
    cost: free
    what: >-
      Many Commonwealth schemes have their own internal review step before any
      tribunal. It is free and usually much faster.
    # VERIFY: internal review is scheme-specific. Confirm the wording is general
    # enough to be true across NDIS, DVA, ATO, Medicare and child support.
    source: VERIFY (scheme-specific — confirm a general statement is safe)
  - name: Apply to the Administrative Review Tribunal (ART)
    body: Administrative Review Tribunal (ART)
    cost: >-
      A fee may apply, and it can often be reduced or waived in cases of
      financial hardship.
    what: >-
      The ART can look at the decision again on the facts and make the correct or
      preferable decision. It replaced the AAT.
    source: 'art.gov.au — apply for a review'
  - name: Ask a court to check the decision was made lawfully (judicial review)
    body: Federal Court of Australia / Federal Circuit and Family Court
    cost: >-
      Court fees apply and there is a risk of paying the other side's costs.
      Please talk to a free legal service before you file anything.
    what: >-
      A court does not remake the decision. It checks whether it was made in a
      lawful way, and can send it back to be made again.
    source: >-
      VERIFY (ADJR Act 1977 s 5 / Judiciary Act 1903 s 39B / Constitution s 75(v)
      — confirm which to name for a lay audience)
  - name: Complain to the Commonwealth Ombudsman
    body: Commonwealth Ombudsman
    cost: free
    what: >-
      The Ombudsman looks at whether an agency acted properly. It cannot overturn
      a decision, but it is free and it can get things moving.
    source: 'ombudsman.gov.au — making a complaint'
rightToReasons:
  available: true
  how: >-
    ask the decision-maker, in writing, for a statement of reasons for the
    decision
  # Researched, and it corrects the placeholder that guessed "s 28 ART Act" — that
  # was the OLD AAT Act. Under the ART Act 2024 the request provision is s 268,
  # and s 271 lets a person ask the Tribunal whether a statement is adequate.
  provision: 'ART Act 2024 s 268 (and s 271 on adequacy)'
  source: 'legislation.gov.au — Administrative Review Tribunal Act 2024'
  # VERIFY: whether asking for reasons affects any time limit is scheme-specific.
  extendsTimeLimit: VERIFY (scheme-specific — do not state a general rule)
groundsOrCriteria: []
evidenceChecklist:
  - The decision letter itself, and the envelope it came in
  - The date on the letter, and the date you received it
  - Any reference or file number
  - Anything you sent them, and when you sent it
  - Any notes of phone calls, with names and dates
getHelp:
  - service: Administrative Review Tribunal (ART)
    who: independent external review of Australian Government decisions
    link: 'https://www.art.gov.au'
  - service: Commonwealth Ombudsman
    who: >-
      free complaints about Australian Government bodies (cannot overturn a
      decision)
    link: 'https://www.ombudsman.gov.au'
  - service: Community legal centres
    who: free local legal help — find your nearest centre
    link: 'https://www.fclc.org.au'
  - service: Legal aid in your state or territory
    who: free legal information and advice, wherever you live
    link: 'https://www.nationallegalaid.org'
plainLanguageExplainer: >-
  This is a decision by an Australian Government department or agency. Most of
  these decisions can be looked at again. There are usually two different paths.
  A tribunal can look at the decision again on the facts. A court can check that
  the decision was made in a lawful way. Which path applies comes from the law
  your decision was made under, so it is worth checking with a free service.
  Asking for the reasons in writing is a good first step, and it is free.
sources:
  - 'Administrative Review Tribunal — art.gov.au'
  - 'Administrative Review Tribunal Act 2024 (Cth) — legislation.gov.au'
  - 'Administrative Decisions (Judicial Review) Act 1977 (Cth) — legislation.gov.au'
  - 'Commonwealth Ombudsman — ombudsman.gov.au'
lastVerified: null
---

## What a reviewer needs to decide

**1. Is `reviewable.value: sometimes` right, and is the wording safe?**
Merits review at the ART exists only where the enabling Act provides for it. This entry is
the catch-all, so it cannot promise the ART for every Commonwealth decision. The current
wording says so — please confirm it says so clearly enough.

**2. The judicial-review source line.** Three provisions could be named: ADJR Act s 5,
Judiciary Act s 39B, or Constitution s 75(v). Naming all three is accurate and useless to a
lay reader. Which one should the entry carry?

**3. Internal review.** Most Commonwealth schemes have one, but they differ (NDIS internal
review, DVA review, ATO objection, child support objection). Is a single general statement
safe, or should this pathway be dropped from the catch-all and left to per-scheme entries?

**4. The reasons provision.** Researched as **s 268 of the ART Act 2024**, with s 271 on
adequacy. This corrects the existing placeholder in `data/pathways/cth-generic.md`, which
guessed "s 28 ART Act" — s 28 was the *old* AAT Act. Please confirm.

**5. Cost and costs risk.** The judicial-review pathway warns about paying the other side's
costs. Confirm that is the right thing to tell a self-represented person here.

**6. What this entry must NOT say.** No time limit appears anywhere in it, deliberately —
limits are set by each enabling Act and there is no general Commonwealth figure. Please keep
it that way.
