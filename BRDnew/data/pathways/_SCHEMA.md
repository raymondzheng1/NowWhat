# Procedural pathway entry schema (LAWYER-VERIFIED data layer — never from the exam corpus, never model-invented)
Per decision type (one file). Fields:
- id, title, jurisdiction (Vic|Cth)
- decisionMakers: []   # agency names used to classify
- decisionTypes: []
- avenue: { mr: { available, body (VCAT|ART), source } , jr: { available, forum (SCV-O56|FederalCourt|HCA|ADJR), source } , noReviewEndpoint? }
- deadlineRule: "<plain rule, e.g. 'generally within N days of the decision'> — VERIFY"   # NEVER a countdown
- verifiedAsAt: YYYY-MM-DD   # REQUIRED
- sourceUrl: "<official source>"   # REQUIRED; build fails if a deadline has no source
- reviewCadenceDays: <int>   # staleness gate uses this
- reasonsRequest: { how, provision, extendsMR: true|false|"depends — VERIFY", extendsJR: false }
- privativeClause: true|false   # tripwire flag (per Act; NOT detected from user text)
- forms: [ { name, link, fee, verifiedAsAt } ]
- mrCriteria: [ "<real substantive criteria for MR — VERIFY against enabling Act>" ]
- getHelp: [ { service, link } ]
RULES: never ship a deadline/form/fee without a source + verifiedAsAt; staleness past reviewCadenceDays => degrade to source+help; a supervising Australian lawyer signs off every entry.
