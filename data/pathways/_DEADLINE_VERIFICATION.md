# Deadline verification worksheet — `data/pathways/` (FOR LAWYER SIGN-OFF)

**Why this exists.** The `/start` Rights Saver deliberately shows *"we can't confirm the
time limit right now"* because **no deadline figure in the procedural data layer is verified
yet** — by design, the build linter (`data-check`) refuses to let an unverified number reach
users. Once a supervising lawyer **confirms the figures + sources below**, those values get
written into the matching `data/pathways/*.md` entry (`deadlineRule` + `verifiedAsAt` +
`sourceUrl`, `status: verified`), and `/start` then shows the **real rule + the official
source + the "checked on" date** — still as a rule, never a computed countdown.

**How to use.** For each pathway: check the *Proposed rule* against the *Official source*,
then write the confirmed wording + a "verified as at" date in the last two columns. **Leave
anything you can't confirm blank** — those pathways simply keep showing "confirm the time
limit," which is safe.

> ⚠️ The *Proposed rule* column is an UNVERIFIED starting point prepared to save time. It is
> **not** legal advice and **not** confirmed. Nothing here is shown to users until you sign it
> off. Where a period depends on the reason or the enabling Act, the cell says *[determine]*.

---

## `vic-renting` — Renting (Residential Tenancies Act 1997)
| Pathway | Official source to check | Proposed rule (DRAFT — confirm) | ✅ Confirmed wording | Verified as at |
|---|---|---|---|---|
| Merits review — VCAT | consumer.vic.gov.au (notice to vacate) · vcat.vic.gov.au | Apply to VCAT to challenge a notice to vacate — generally **before the termination date** in the notice; some reasons have specific windows. *[determine exact "within N days" provision per reason]* | | |
| Repairs dispute | rdrv.vic.gov.au · vcat.vic.gov.au | Urgent repairs: apply to VCAT. Non-urgent: RDRV first; a time limit applies **after a rent assessment report** — *[determine]* | | |

## `vic-fines` — Fines & infringements (Fines Reform Act 2014; Infringements Act 2006)
| Pathway | Official source to check | Proposed rule (DRAFT — confirm) | ✅ Confirmed wording | Verified as at |
|---|---|---|---|---|
| Internal review | fines.vic.gov.au (request a review) | Apply for internal review — **within 28 days** of the infringement notice (extension possible); generally available before the fine is registered (Notice of Final Demand). *[confirm 28 days + extension rule]* | | |
| Person was unaware | fines.vic.gov.au (didn't know) | **Within 14 days** of becoming aware (statutory declaration). *(Already verified in the corpus.)* | within 14 days of finding out | (confirm) |
| Court election | fines.vic.gov.au (go to court) | **Within 28 days** of the notice; for excessive-speed/drink/drug-driving, from the date of the notice. *[confirm]* | | |

## `vic-public-housing` — Public/social housing
| Pathway | Official source to check | Proposed rule (DRAFT — confirm) | ✅ Confirmed wording | Verified as at |
|---|---|---|---|---|
| Housing Appeals Office | housing.vic.gov.au (review a decision) | **No strict statutory deadline** — first ask the local office, then the Housing Appeals Office; apply promptly. *[confirm no hard deadline]* | | |

## `cth-centrelink` — Centrelink / social security (Social Security (Administration) Act 1999)
| Pathway | Official source to check | Proposed rule (DRAFT — confirm) | ✅ Confirmed wording | Verified as at |
|---|---|---|---|---|
| Internal review (ARO) | servicesaustralia.gov.au (reviews and appeals) | **No time limit to ask**, BUT apply **within 13 weeks** of being notified to have a favourable change backdated to the original decision (date-of-effect rule). *[confirm 13-week rule]* | | |
| ART review | art.gov.au (apply for a review) | Apply to the ART within a set period after the internal review decision — *[determine current period + how counted]* | | |

## `vic-generic` / `cth-generic` — fallbacks
| Pathway | Note |
|---|---|
| (any) | Time limits **vary by the enabling Act**; there is no single figure. Recommend these entries **stay non-verified**, so the Rights Saver keeps showing "most reviews have a strict time limit — confirm it for your decision" + routes to help. |

---

### When you've confirmed
Hand this back (or just the confirmed cells). I'll then, per confirmed pathway:
1. Write the confirmed wording into `deadlineRule`, set `sourceUrl` to the official page and
   `verifiedAsAt` to your date, and flip `status: verified`.
2. Run `npm run verify` (the `data-check` gate accepts a numeric figure **only** on a
   verified+sourced entry) and deploy.
3. `/start` then shows the real rule + "checked on {date}" + the official source link.
