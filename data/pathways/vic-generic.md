---
id: vic-generic
title: A Victorian government decision
jurisdiction: Vic
decisionMakers:
  - Victorian government agency
  - Victorian department
  - statutory authority
  - local council
decisionTypes:
  - government decision
  - adverse decision
  - refusal
  - cancellation
  - review
keywords:
  - victoria
  - decision
  - review
avenue:
  ir:
    available: true
    conditional: true
    body: the agency that made the decision
    source: 'Owner''s administrative-law knowledge base — internal review (2026-08-22)'
  mr:
    available: true
    conditional: true
    body: VCAT (where the enabling Act provides)
    source: 'vcat.vic.gov.au — review of a decision; and the Act your decision was made under'
  jr:
    available: true
    forum: SCV-O56
    source: 'Supreme Court (General Civil Procedure) Rules, Order 56 — supremecourt.vic.gov.au'
  noReviewEndpoint: >-
    If no review right exists, the Victorian Ombudsman can look at how the
    decision was made, and a free legal service can explain your options.
deadlineRule: >-
  Most reviews have a strict time limit, set by the law for your decision.
  Check it with the official body or a free service. If the time has already
  passed, a free service can tell you whether anything can still be done. If
  you are looking at the Supreme Court instead, Victoria has different review
  routes, with different rules and time limits. Order 56 runs 60 days from
  when the grounds first arose. The Administrative Law Act 1978 (Vic) runs 30
  days. Trying another path first does not restart either clock. Choosing the
  right route can be technical, so get legal help before you file.
verifiedAsAt: '2026-08-17'
sourceUrl: 'https://www.supremecourt.vic.gov.au'
reviewCadenceDays: 90
reasonsRequest:
  how: 'ask the decision-maker in writing for a statement of reasons. Whether you have a right to them depends on the kind of decision, so check which law applies to yours'
  provision: 'Victorian Civil and Administrative Tribunal Act 1998 (Vic) ss 45-46, where the decision can go to VCAT; and Administrative Law Act 1978 (Vic) s 8'
  extendsMR: 'depends on the Act your decision was made under — confirm before relying on it'
  extendsJR: 'depends — confirm with a free legal service before relying on it'
privativeClause: false
forms: []
mrCriteria:
  - The criteria come from the Act your decision was made under, not from a general rule.
getHelp:
  - service: Victorian Ombudsman
    link: 'https://www.ombudsman.vic.gov.au'
    who: 'free complaints about Victorian government bodies (cannot overturn a decision)'
  - service: Victoria Legal Aid
    link: 'https://www.legalaid.vic.gov.au'
    who: 'free legal information and advice — Legal Help line'
    phone: '1300 792 387'
  - service: Community legal centres (Federation of CLCs)
    link: 'https://fclc.org.au'
    who: 'free local legal help — find your nearest centre'
status: verified
isFallback: true
---

Lawyer-verified 2026-08-17, when the owner confirmed the figures and sources for the three seed entries and `status` was flipped to `verified`. The SEED note that stood here was never rewritten, so the file contradicted itself until a senior-partner QA pass caught it on 2026-08-22. This is the Victorian catch-all: it still says review is only 'sometimes' available, because that is true of a fallback entry and must not be softened.

**Two corrections 2026-08-23 on the external review the owner accepted.**

**The official source now carries the rule it is shown beside.** `sourceUrl` is not a general
citation — it is the single link rendered next to the time-limit rule, labelled "official source".
It pointed at the Victorian Ombudsman, which sets neither of the two figures this entry states. The
Ombudsman handles complaints about how a decision was made and cannot overturn one; it sources
nothing about Order 56 or the Administrative Law Act. It now points at the Supreme Court of
Victoria, which is the forum for both court routes named here and is already this entry's cited
source for Order 56 under `avenue.jr`. The Ombudsman stays in `getHelp`, where it belongs and where
it is correctly described.

One URL cannot source two instruments. The 30-day Administrative Law Act figure is still only
named in the prose, not linked. That needs the per-stage `{provision, url}` source the schema does
not have yet, and it is carried as a schema item rather than fixed by pointing this field at a
second-best page.

**Someone already past the limit is no longer told nothing.** The rule said to check the limit and
said the clocks do not restart, then stopped — so a person reading it after the date had passed
learned only that they were late. The new sentence sends them to a person instead: a free service
can tell them whether anything can still be done. It deliberately does not say an extension exists
or how to ask for one. Naming an extension power needs the provision and its statutory test, which
this layer does not hold, and "apply for an extension" would be a step we recommended rather than
information. Record the power itself when a lawyer verifies one.
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
