# EXAMPLE entry (SEED — all values to be lawyer-verified before launch; do not rely on as-is)
id: cth-centrelink
title: "Centrelink / social-security decision or debt"
jurisdiction: Cth
decisionMakers: ["Services Australia", "Centrelink"]
decisionTypes: ["debt notice","overpayment","payment cancelled","claim rejected"]
avenue:
  mr: { available: true, body: "ART", source: "VERIFY (art.gov.au + enabling Act)" }
  jr: { available: true, forum: "ADJR/FederalCourt", source: "VERIFY" }
deadlineRule: "An application for review is generally due within a set period of the decision — VERIFY current period + source. (Shown as a rule + verified date + link; never a countdown.)"
verifiedAsAt: 0000-00-00
sourceUrl: "VERIFY"
reviewCadenceDays: 90
reasonsRequest: { how: "ask the agency for written reasons", provision: "VERIFY", extendsMR: "depends — VERIFY", extendsJR: false }
privativeClause: false
forms: [ { name: "VERIFY", link: "VERIFY", fee: "VERIFY (review may be free)", verifiedAsAt: "0000-00-00" } ]
mrCriteria: ["VERIFY against the Social Security Act — real substantive criteria only"]
getHelp: [ { service: "Legal Aid", link: "VERIFY" }, { service: "Economic Justice Australia (welfare rights)", link: "VERIFY" } ]
