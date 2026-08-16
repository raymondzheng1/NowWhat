Verification complete. Writing the merged plan.

---

# ONE IMPLEMENTATION PLAN — five owner changes, merged and amended

## 0. What I verified, and what changed as a result

I re-checked every load-bearing claim against the working tree (clean, `main` @ `02e22b1`). Four material corrections:

| Claim in a design | Verdict |
|---|---|
| decode-result A1: "all three attempts send an identical prompt; `runGeneration` does not pass `retryHint`" | **FALSE — already shipped.** `lib/generation/runner.ts:77,85,129` wires `retryHint` through `userPrompt`. Commit `32d9b79`. **Delete A1 from the plan.** |
| decode-result: "`reading-level` is the most likely cause of the fall-through" | **FALSE — already fixed.** `runner.ts:133-142` keeps a `readableEnough` draft and returns `status:"answered"` when *only* reading-level failed. Reading-level can no longer produce a bare help screen. |
| tripwire-value §H: "`reading-level-check` scores `rights.stopUrgentBody`" | **FALSE.** Filter is `/plainLanguageExplainer\|body\|answer\|description/` with **no `i` flag**, tested against the dotted key path. `stopUrgentBody` ≠ `body`. The no-advice lens is right. |
| intake-breadth: `forumName()` discards the data-layer body | **TRUE, and worse than stated — see BLOCKER-0.** |

Confirmed as stated: `no-advice-check.mjs` destructures only `{advice, prediction}` (misses `score`/`satisfies`); `copy-surfaces.mjs` §4 collects only `title`/`deadlineRule`/`avenue.noReviewEndpoint`/`reasonsRequest.how`/`mrCriteria`; `data-check.mjs` applies `hasTimeFigure` to `deadlineRule` only; `vic-generic` contributes 19 corpus classification tokens including `decision`(3), `government agency`(4), `council`(4); corpus entries have **no** `isFallback` field and `build-corpus.mjs` has no fallback skip (`build-data.mjs:62` does); `FALLBACK_ENTRY_ID = "vic-generic"` and there is **no** `cth-generic` in `corpus/`; both classifiers are prefix-anchored (`hay.includes(" " + token)`), so `" fine"` matches "I'm fine"; `privativeClause: false` on all 6 data entries; no caller sets `unclassifiable`; the stop branch renders `trip.reasons` not `stopReasons` (`RightsSaverClient.tsx:591`); `applyDraft` is gated on `corpusEntry` only (`:632`), so **vic-generic renders a merits-review application letter**; `faqLead` (`:1045`) is ungated; the deep link restores `step=result` with `flags={}` and `consent=false` (`:104-118`); `common.getHelp` has zero consumers; `lib/chat/runner.ts:40,42` is Victorian-only and `VALID_AREAS` reads the decode corpus.

**Could not verify** (needs the owner/a live run): which gate actually fires in production; whether `ANTHROPIC_MODEL` is overridden in Vercel; whether `beforeinstallprompt` fires on the deployed site; the measured pixel widths in the nav-copy design (I did not run a browser).

One correction to the nav-copy design's evidence: it says no help service is 24/7. True of `lib/help/services.ts` (the pill's destination), but `lib/tripwire/index.ts:179` describes VALS as "24 hours". The argument for dropping "any time" still holds — the pill points at `/help`, not the tripwire directory — but don't repeat the absolute claim in the commit message.

---

## BLOCKER-0 — fix `forumName()` before anything else

This is not in any of the five requests. It is a live accuracy defect on **lawyer-verified** entries and it invalidates parts of two designs.

`lib/analysis/index.ts:57-63`:
```ts
function forumName(p: Process, jurisdiction: Jurisdiction | undefined, fallback: string): string {
  const body = p.bodies.find((b) => b.jurisdiction === jurisdiction);
  return body?.name ?? fallback;   // ← the data-layer value is the FALLBACK, never reached
}
```
`corpus/legal/index.json` has a body for **both** `Cth` and `Vic` on both processes, so `body` is always found and `avenue.mr.body` is **always** discarded. Verified consequences today:

- `vic-fines` — verified body `"internal review then Magistrates' Court"` → renders **"VCAT (the Victorian Civil and Administrative Tribunal)"** in `rights.pathVia` and `rights.step3` ("Lodge with VCAT, within the time limit").
- `vic-public-housing` — verified body `"Housing Appeals Office, then VCAT where applicable"` → renders **"VCAT"**, dropping the Housing Appeals Office, which is that entry's own first `getHelp` service.
- `buildHandoff` takes `forumNames` from the same plan, so the downloadable matter summary carries the wrong forum into a legal service's hands.

**Fix:** prefer the entry's own `avenue.mr.body` when it is specific; use the corpus name only when the data value is a code (`ADJR/FederalCourt`, `SCV-O56`) or belongs to a fallback entry. The JR codes are the reason `forumName` exists — keep the corpus override for JR, invert it for MR.

```ts
/** Internal codes that must never reach a reader; everything else is the lawyer's words. */
const FORUM_CODES = new Set(["ADJR/FederalCourt", "SCV-O56", "ART"]);
function forumName(p, jurisdiction, dataValue, preferCorpus) {
  if (!preferCorpus && dataValue && !FORUM_CODES.has(dataValue.trim())) return dataValue;
  return p.bodies.find((b) => b.jurisdiction === jurisdiction)?.name ?? dataValue;
}
```
Call with `preferCorpus = entry.isFallback` for MR, and `preferCorpus = true` for JR. Note `cleanForDisplay` (`lib/triage/index.ts:36-40`) truncates at the first `(`, so `"ART (where the enabling Act provides)"` arrives as `"ART"` — which is why `ART` is in `FORUM_CODES`, and why the generic entries correctly keep the corpus name.

**Tests:** `tests/unit/analysis/plan.test.ts` — `vic-fines` does NOT render "VCAT"; `vic-public-housing` renders the Housing Appeals Office; `cth-generic`/`vic-generic` still render ART/VCAT.

**This must land before any tile chip is added**, because chips drive more named traffic into the wrong forum name.

---

## Commit order

| # | Commit | Gate |
|---|---|---|
| 1 | `fix(analysis): render the entry's own review body, not the corpus default` | BLOCKER-0 |
| 2 | `fix(safety): close the three linter holes` | prerequisite for 4, 6, 7 |
| 3 | `feat(nav): "Talk to a person"` | ship anytime |
| 4 | `fix(start): deep links must not skip the tripwire; hedge the generic result` | — |
| 5 | `fix(decode): land on a real page when our own gates reject the summary` | — |
| 6 | `feat(start): name the situations inside the verified tiles` | **LAWYER** |
| 7 | `feat(start): preparation layer on the hand-over screen` | **LAWYER** |
| 8 | `feat(pwa): make the app actually installable` | **OWNER** (theme colour) |
| 9 | `feat(start): find-your-situation search` | after 6 |

Items 6, 7 and 9 must not ship before the sign-offs in §9.

---

## 1. `fix(safety): close the three linter holes` — do this second, it gates three later commits

All three designs and four lenses depend on "the linters will catch it". They currently won't.

**`scripts/no-advice-check.mjs:7`** — `const { advice, prediction } = loadPatterns();` → `const { advice, prediction, score, satisfies } = loadPatterns();` and spread all four into `rules`. `score` and `satisfies` are runtime-only today (`checkNoScore`), so authored copy is never checked for ranking or "satisfies an element" language.

**`scripts/reading-level-check.mjs:43`** — add the `i` flag: `/plainLanguageExplainer|body|answer|description/i`. The no-advice lens reports this widens coverage to 72 records, 27 above the ideal of 9 and **zero** above the ceiling of 11, so `verify` stays green. I did not re-run that measurement — **run it before committing**; if anything exceeds 11, simplify the string rather than reverting the flag.

**`scripts/lib/copy-surfaces.mjs` §4** — add `(e.examples ?? []).forEach((x, i) => add(\`examples[${i}]\`, x));`. Must land in the same commit as the schema field (commit 6), not before.

Do **not** also widen the reading-level filter to score every short UI label — the gate deliberately skips labels under 120 chars and `fkGrade` returns `null` under 10 words.

---

## 2. `feat(nav): "Talk to a person"` — ship the design as written

The design is sound and I found nothing to amend. Verified: the string is defined once (`en.json:30`), rendered twice (`SiteNav.tsx:58,69`), no test in `tests/` references it, `nav.help` has exactly one consumer (`SiteNav.tsx:100`; `Footer.tsx:25` reads `footer.help`), and `common.getHelp` has zero consumers.

- `lib/i18n/messages/en.json:30` → `"person": "Talk to a person"`; add `"personSr": " — free, independent services"`; delete `nav.help` and `common.getHelp`.
- `components/site/SiteNav.tsx` — add `gap-2` + `<Icon.People className="h-[18px] w-[18px] shrink-0" strokeWidth={2.2} aria-hidden="true" />` before `{t("person")}` in **both** pills, plus `<span className="sr-only">{t("personSr")}</span>`; line 100 `{t("help")}` → `{t("person")}`; update the doc comment at line 12.
- `components/site/SiteShell.tsx:12` — doc comment.
- `design20260816/README.md:26,48` — update. **Leave `landing-reference.html:58` alone** (frozen handoff artefact).
- `E2E_TEST_SCRIPT.md:189` — the nav checklist is already stale; rewrite it to mention the always-visible pill.

Ship the glyph with the copy — the header pill and `ChatLauncher` are both red pills, and the glyph is the differentiator. The pixel budgets in the design are unverified by me but have ~50px of headroom on the tightest measurement, so the risk is low.

Out of scope but flag to the owner: `home.humansTitle` ("Humans: available. Free.") and `home.humansBody` ("whenever you like") make the same availability claim the pill is losing.

---

## 3. `fix(start): deep links must not skip the tripwire; hedge the generic result`

Two independent safety fixes that both belong before any intake widening.

**3a. The deep-link bypass (from the harm lens — verified, and pre-existing).** `RightsSaverClient.tsx:118`:
```ts
if (area && getDataEntry(area)) setStep(p.get("step") === "result" ? "result" : "what");
```
`flags` is `{}` and `consent` is `false` at this point, so a bookmarked, shared, chat-handoff or back-navigated `/start?area=…&step=result` renders the **full builder with the tripwire never asked and the consent box never ticked**. Change it to always land on `"what"`, keeping `jur`/`area`/`date` prefilled. Keep writing `step=result` to the URL (it makes Back work within a session); just never *restore* to it. Add an e2e assertion that `/start?area=vic-renting&step=result` shows the consent checkbox.

**3b. The stop-screen bullet source.** `RightsSaverClient.tsx:591` maps `trip.reasons` (stop + urgent), so a person who ticks a stop box *and* a timing box reads `"…your options below will help you explain the matter quickly"` on a screen with no options. Change to `trip.stopReasons` and add the amber timing line (`stopUrgentTitle`/`stopUrgentBody`) when `trip.urgent`. This half of the tripwire design is unambiguously good — ship it here, ahead of the contested parts.

**3c. Hedge the generic result (`planFor` + three surfaces).** Both fallback entries are `status: seed`, `verifiedAsAt: "VERIFY"`, `mr.source: "VERIFY (…)"`, yet `mrAvailable`/`jrAvailable` are `true` — so today they render `rights.analysisLeadBoth` ("**Two paths are open for this decision**") and `rights.step3` ("Lodge with the Administrative Review Tribunal (ART), within the time limit"). `corpus/legal/processes/merits-review.md` contradicts this in its own `limits`: merits review "is only available where a law provides it". This is an over-claim **today, before any tile change**, and all three lenses agree the hedge is grounded.

- `lib/analysis/index.ts` — add `isFallback?: boolean` to the `planFor` argument; widen `ResultPlan["leadKey"]` with `"analysisLeadGeneric"`; return it when `isFallback && mrAvailable && jrAvailable`.
- `RightsSaverClient.tsx:~616` — pass `isFallback: entry.isFallback`.
- `~:768` — render `t("pathGenericNote")` above the `<ol>` when `entry.isFallback`.
- `:876-882` — `entry.isFallback ? t("step3Generic") : t("step3", { body: midSentence(...) })`.

**3d. Suppress the two decision-specific surfaces on fallback entries** — folded in from the no-advice and harm lenses, both correct and verified. `vic-generic` **has** a decode-corpus twin, so `applyDraft` (`:632`) currently builds a ready-to-send VCAT merits-review application, and the FAQ block (`:1042-1064`) renders three articles under `faqLead` = "Plain-English answers written for **this kind of decision**" that state "28 days" and "section 45 of the VCAT Act". Hedging the lead paragraph while handing over a drafted application below it is not a hedge.

- Gate the apply-draft block (`:961`) on `!entry.isFallback`. Keep the reasons-request draft (forum-neutral).
- Gate the grounds checklist (`:1019`) on `!entry.isFallback`.
- Replace `faqLead` with `faqLeadGeneric` for fallbacks: *"General answers about this level of government. The answers for your decision come from the law it was made under."*

I judge the harm lens's further request — hoisting `<HelpList>` above the analysis on fallback results — as **over-correction, do not do it**. It would make the generic result structurally different from every other result for no accuracy gain, and `/start` already carries a help route in the tripwire, the disclaimer and the contents nav. Revisit if user testing says otherwise.

**Copy (all `rights.*` in `en.json`):**
```
analysisLeadGeneric: "We do not have a guide just for this decision yet, so this is the general picture. For many government decisions, a tribunal can look at the decision again, and a court can check that it was made in a lawful way. Which one applies comes from the law for your decision, so it is worth checking with a free service."
pathGenericNote:     "The bodies named below are the usual ones for this level of government. The right body for your decision comes from the law that gives the review right. A free service can confirm which one it is."
step3Generic:        "Lodge with the right body, within the time limit"
faqLeadGeneric:      "General answers about this level of government. The answers for your decision come from the law it was made under."
```
**Test:** `tests/unit/analysis/plan.test.ts` — a fallback entry with both avenues yields `analysisLeadGeneric`. E2E: Cth → "Another Australian Government decision" → result shows the hedged lead and **not** "Two paths are open".

---

## 4. `fix(decode): land on a real page when our own gates reject the summary`

**Drop A1 entirely** (already shipped) and **drop the reading-level diagnosis** (already fixed by `32d9b79`'s `readableEnough` fallback). The remaining live causes are two, both verified:

1. **`no-fabricated-deadline` is unwinnable for Centrelink.** I ran the verifier's own `groundedTimeFigures()` algorithm over the committed index: `cth-centrelink → []`. Every other entry has figures (`vic-fines → 14/28 day`, `vic-generic → 28 day, 12 months`, `vic-public-housing → 30 day`, `vic-renting → 30 day`). So **any** number of days in a Centrelink decode — including the "28 days" printed on the person's own letter — is fatal, and this is a *safety* gate, so `readableEnough` does not rescue it.
2. **The generic entry hijacks specific letters.** `vic-generic` contributes 19 classification tokens (`decision`/3, `notice of decision`/3, `government agency`/4, `council`/4, `review`/1) because `build-corpus.mjs` has no fallback skip. A Centrelink letter scores `vic-generic` over `cth-centrelink`, the route then builds a Victorian VCAT context for a Commonwealth letter, and the model correctly returns `covered:false` — a fast, explanation-free help screen, exactly what the owner reported.

**Ship, in this order:**

**4a. Stop the hijack.** Add `isFallback: z.boolean().default(false)` to `PathwayEntrySchema`; set `isFallback: true` in `corpus/pathways/vic-generic.md`; in `scripts/build-corpus.mjs` `buildClassification()` add `if (e.isFallback) continue;` mirroring `build-data.mjs:62`; rebuild and commit `corpus/index.json`. Also move `vcat` out of `vic-renting`'s `issuers` (weight 4) into `keywords` — VCAT does not issue notices to vacate.

**4b. Never end on a bare help screen when we had the right guide.** `app/api/decode/route.ts` already returns `why`/`gates` (95aa833). Split the branch: `why !== "gates-rejected"` stays `not-covered`; `gates-rejected` returns a new `status: "grounded-only"` carrying `toEntrySummary(entry)` + `isFallback`. Withhold our unverifiable summary of the letter; keep everything the corpus already verifies. Extend the `DecodeResponse` union in `components/feature/api.ts` and widen `DecodeClient`'s answered early-return to handle both.

**4c. Never ground a Commonwealth letter in Victorian law.** New `lib/corpus/jurisdiction.ts` with `guessJurisdiction(text)` — two multi-word marker tables, majority wins, ties `null`, **bare `"victoria"` deliberately excluded** (it appears in the postal address on Commonwealth letters). Replace `FALLBACK_ENTRY_ID` with a jurisdiction-aware pair; `classifyForDecode` returns `null` when Commonwealth is detected and no Commonwealth generic exists, which routes to an honest not-covered with `helpForJurisdiction(...)` rather than to VCAT.

**4d. Harden the prompt.** `HARD_NO` rule 4 → "Never write any number of days, weeks, months or years — not even one taken from the letter." The retry machinery to carry this on attempt 2 already exists.

**AMENDED — A7 is decided, not open.** Do **not** implement the "allow figures that appear verbatim in the letter" loosening, and **delete that case from `tests/unit/verification/decode-realistic.test.ts` if it is ever re-added**. A letter's "28 days" is usually a *payment* deadline; restated beside review options it reads as a review deadline. Keep the gate absolute. This is consistent with the site-wide decision in `02e22b1` to drop computed time limits.

**Defer to a separate task, needs a lawyer:** authoring `corpus/pathways/cth-generic.md` (§9). Until it exists, an NDIS/DVA/ATO letter gets an honest "not covered + Commonwealth help services" — worse than an explanation, far better than today's Victorian misrouting.

**Part B (the analysis layer on the decode result)** — ship as designed, *after* BLOCKER-0, with two amendments:
- `lib/analysis/for-corpus.ts` must pass `isFallback` into `planFor` so a decode result gets the same `analysisLeadGeneric` hedge as `/start`.
- `AnalysisPanel` extraction from `RightsSaverClient.tsx:765-901` must keep `data-tour="avenue" data-tour-alt="analysis"` when `tour` is true, or `TOUR_START_RESULT` step 1 silently no-ops with no test failure. Pin it with an assertion.
- Keep the in-place render (no new route). The reasoning is right: a URL cannot carry letter-derived content without logging it, and there is no store to restore from.
- `decode.analysisScopeNote` is load-bearing, not decoration — the path cards describe the decision *type*, not the letter.

**Also:** add `modelId: MODELS.primary` to `/api/health`. It is a config value, not a secret, and it is the only way to see an `ANTHROPIC_MODEL` override.

**Before starting:** post one real Centrelink letter to `/api/decode` in production and read the `gates` array. Everything above is worth doing; that measurement decides the order.

---

## 5. `feat(start): name the situations inside the verified tiles` — heavily amended

The recognition problem is real (a Commonwealth user sees two tiles, one of which is a shrug). The design's core insight — keep the tile = the verified entry, list decision types as `examples` chips inside it — is right. But all three lenses independently found the same defect, and they are correct: **the design exempts the two generic entries from its own MAPPING RULE on the theory that they "assert nothing decision-specific", and that premise is false.** Verified above (§3d): `vic-generic` renders a merits-review application draft and FAQ articles stating "28 days" and "section 45 of the VCAT Act".

**Amendment 1 — withdraw the exemption. `examples` ship only on `status: verified` entries in this commit.** That is `cth-centrelink`, `vic-fines`, `vic-public-housing`. Both generic entries and `vic-renting` (seed) get **no chips** until the sign-off in §9. Enforce it in code, not by reviewer memory — `scripts/data-check.mjs`:
```js
if ((e.examples ?? []).length && !(verified && realSource && realDate))
  hard.push(`${id}: declares examples but is not verified+sourced — an example is a coverage claim`);
if ((e.examples ?? []).some(hasTimeFigure))
  hard.push(`${id}: an example must not state a time figure`);
```
Say plainly to the owner: **this defers the entire Commonwealth recognition benefit to Phase 3.** That is the honest cost of the sign-off gate, and it should be surfaced rather than engineered around.

**Amendment 2 — drop these chips outright**, each for a verified reason:
- `"WorkSafe or the TAC"` — WIRC Act conciliation then the Magistrates'/County Court, not VCAT; common-law limitation periods a self-help detour can burn.
- `"A school or disability service decision"` — "disability service decision" routinely means guardianship, administration, or restrictive-practice authorisation, which is precisely the `family-guardianship-mental-health` STOP cohort. Naming it is an affirmative claim we cover it.
- `"Child support"` — different Act, its own objection process to the Registrar, heavy family-violence co-occurrence, and `cth-generic.getHelp` contains no child-support service.
- `"Veterans' payments or entitlements"`, `"Aged care fees or an assessment"`, `"Medicare or paid parental leave"`, `"A tax debt or another ATO decision"`, `"An NDIS decision"`, `"A council decision (permits, rates, planning)"` — same "wrong first door" shape the design already correctly held FOI back for. Apply the test consistently.
- `"a family payment"` — split out of the `cth-centrelink` chip. Family assistance is not under the Social Security (Administration) Act 1999 (Cth) that this tile's verified `deadlineRule` names. The design excludes paid parental leave for exactly this reason.

**Amendment 3 — the surviving chip set** (all grounded in their entry's own `decisionTypes`/`decisionMakers`/`keywords`):
```
cth-centrelink: "A debt or overpayment notice" · "A payment cancelled or reduced" ·
                "A claim that was rejected" · "JobSeeker, Age Pension or DSP"
vic-fines:      "A parking or speeding fine" · "A toll or public transport fine" ·
                "A council fine" · "Enforcement, or trouble paying"
vic-public-housing: "A public housing application refused" · "A transfer or priority access decision" ·
                "An eligibility decision" · "A notice about your public housing"
```
Two caveats to resolve with the lawyer before the housing chips ship: `Director of Housing` is a `decisionMaker` on **both** `vic-public-housing` and `vic-renting`, so a public tenant given a notice to vacate matches two entries with different doors and different named Acts; and `"rebate"` does not appear in `data/pathways/vic-public-housing.md` (only in the corpus twin), so I dropped it from the chip above.

**Amendment 4 — the uncovered branch must route to a person, not into the builder.** `rights.whatHelp`'s proposed "— it still works" is an unsourced efficacy claim about a seed entry. Replace:
```
whatHelp:   "Pick the closest one. Each one lists the kinds of decision it covers. If none of these fit, we may not have a guide for your decision — a free service can point you the right way."
outOfScope: "We cannot help with visas, criminal matters, child protection, family law, guardianship, or compulsory mental-health treatment. Those need a person — tap Free help."
```
Render `rights.outOfScope` **above** the tile grid. Today that information exists only as checkbox labels below the fold. This is the harm lens's best contribution and it costs nothing.

**Amendment 5 — no `.tsx` prose.** `{t("tileExamples")}: {e.examples.slice(0,4).join(" · ")}` puts the `":"` and `" · "` in the component. Use one message: `tileExamplesList: "Such as {list}"`.

**Mechanics (unchanged from the design):** `examples: z.array(z.string()).max(8).default([])` in `lib/schemas/data.ts`; `e.examples = asArray(e.examples)` in `build-data.mjs` `normalise()`; **do not** feed examples into `buildClassification()`; the `copy-surfaces.mjs` edit lands in this same commit. Tile heading stays `e.title` for real entries and comes from i18n for fallbacks (`tileOtherCth`/`tileOtherVic`) — leave the data `title` alone, it is also the result H1 and the reasons-letter noun phrase. Cap the chips at 4 inside the `<button>`, **not** `aria-hidden` (that would give sighted users a cue and deny it to screen-reader users).

**Test/selector updates:** `tests/e2e/wizard.spec.ts:35,62,82` selects `/notice to vacate|renting/i` — still matches once chips are inside the button, but re-run it; the accessible name grows. `tests/unit/data/data.test.ts`: every verified entry declares ≥1 example; no example contains a time figure; no example string appears in `index.classification`.

---

## 6. `feat(start): preparation layer on the hand-over screen` — heavily amended

The owner is right that a dead end is bad, and the prep/questions/notes layer is genuinely valuable and asserts no legal proposition. But all three lenses converged on the same two objections and both are correct.

**Amendment 1 — `reasonsLetter: false` for `family-guardianship-mental-health`.** The design's own harm test is *"could writing to a government body unsupervised hurt this person?"* It answers **no** for criminal/detention/migration and **yes** for family, with no source for the distinction. A written statement to a child-protection department or a treating authority is evidence in the Children's Court, the Mental Health Tribunal or the VCAT guardianship list. I confirmed no knowledge source covers any of those forums.

**Consequence, and it simplifies the commit a lot:** with `privative-clause` false on all six entries and `unclassifiable` never set by any caller, `reasonsLetter` and `generalPublicLaw` then fire for **nothing in production**. So:

- **Do not build blocks 10 and 11** (the reasons draft and the background-reading explainers).
- **Do not build `genericReasonsRequestTemplate`** or the `lib/reasons/index.ts` refactor.
- **Do not thread `meritsReview`/`judicialReview` into `StopHandover`.**
- Keep `capabilitiesForStop()` and the `STOP_CAPABILITIES` table — they are the right structure and cheap — but with `reasonsLetter`/`generalPublicLaw` false for every reason that can fire. Delete `rights.stopReasonsTitle/Lead/Caution` and `rights.stopLearnTitle/Lead` from the copy list.

This also disposes of the grounded lens's objection to `stopReasonsCaution` (which borrowed a judicial-review-bound proposition) and to `genericReasonsRequestTemplate` retaining the s 13 ADJR / s 28 ART statutory formula while suppressing the citation.

**Amendment 2 — put the phone number first.** `GetHelp` is currently block 5, roughly two screens down at 375px. On the product's highest-stakes surface the route to a human must be the first tap target. Render a `CallButton` for `servicesForStop(trip.stopReasons)[0]` **inside** the green hand-over card, above the bullets. Move `rights.stopStillHelpful` out of that card and use it as the divider lead-in. E2E assertion: on a family stop, a `tel:` link is visible and precedes the "Before you call" heading in DOM order.

**Amendment 3 — do NOT downgrade `unclassifiable`.** Three lenses agree. URGENT renders the *full* builder, so "we could not work out what this decision is" would produce a confident review path on a seed entry. The design's safeguard ("any future caller must also land on a fallback entry") is prose with no test. Since no caller sets it today, the only effect of downgrading is to arm a trap for whoever wires the `/chat` handoff later. **Delete the reason** (`TripwireInput.unclassifiable`, its `TRIPWIRE_MESSAGES`/`TRIPWIRE_SERVICES` entries, `mlean.test.ts:87`) — the `/start` fallback-entry + `fallbackNote` path already covers "we could not match this". Keep `privative-clause` in STOP; it is lawyer-set, structural, and costs nothing.

**Amendment 4 — the `TRIPWIRE_MESSAGES` catalog move is MANDATORY, not "recommended".** `stopNotesFile` interpolates those strings into a document handed to a legal service; they are customer prose in `lib/tripwire/index.ts:106-122` and `copy-surfaces.mjs` never opens `lib/*.ts`. Move the eight values into `rights.tripwire.*`, keep `TRIPWIRE_MESSAGE_KEYS: Record<TripwireReason, string>`, render via `t()`. While there, fix two ungrounded claims the grounded lens caught: delete **"Missing a limit does not always end things"** (no field or source anywhere supports an extension-of-time proposition — `DataPathwaySchema` has no such field), and drop "your options below will help you…" from both timing messages.

**Amendment 5 — the notes file must not launder our characterisation as the person's account.** Change the attribution to *"(Prepared with a free self-help tool, using the answers I gave it. General information only, not legal advice.)"*; retitle the block to **"WHAT I TICKED IN THE TOOL"**; build `{reasons}` from the **flag labels the person selected** (`rights.flagFamily` etc.), not from `TRIPWIRE_MESSAGES`. And change `{about}`: `areaId` is frequently *not* the person's choice — it arrives from `?area=`, from `useChat.ts:70`, from `ResultView.tsx:311` and from `app/faq/[slug]/page.tsx:140` — so label it *"The area this tool was set to: {about}"*, never "What I chose". Filename → `notes.txt`, and the lead must say it saves onto the device: *"We do not keep a copy. It will save onto this device, so if you share this phone or computer with someone, printing it or writing it out by hand may be safer."*

**Amendment 6 — `rights.stopCallNowNote` must not assert a characterisation.** `urgentPerson` is set by `criminal` alone in the proposed table, so a person who ticked only "criminal" would read "This one is about someone being held". Reword: *"You told us this involves a criminal matter or someone being held. Talking to a lawyer today matters more than anything else on this page."*

**Where I disagree with a lens:** the harm lens asks for `urgentPerson: true` on `family-guardianship-mental-health` **and** for blocks 7–9 to be collapsed in a `<details>` when `urgentPerson`. Take the first (a child-protection matter is routinely listed within days), **reject the second** — collapsing the prep checklist behind a disclosure control is exactly the dead end the owner asked us to fix, and Amendment 2 already guarantees the phone number is first. The two changes together were designed to solve the same problem twice.

**On `flagCriminal`/`flagDetention` rewording — the design is WRONG and must be inverted.** The design proposes narrowing hints ("If you have a criminal matter but this decision is about Centrelink… leave this blank"). Centrelink debt decisions routinely carry live criminal exposure through fraud referral and prosecution; that hint instructs precisely that person to leave the flag blank and then hands them a copy-ready draft to the department that refers prosecutions. **Hints on stop flags must widen, never narrow:**
```
flagCriminal:     "This decision is connected to a criminal case, a police matter, or a possible prosecution"
flagCriminalHint: "Tick this if police, a prosecutor or a court is involved in this decision in any way, including if you have been asked to attend an interview, or you have been told a debt may be referred."
flagDetention:    "The decision affects someone who is in prison, immigration detention, or locked care"
flagDetentionHint:"Tick this if the person this decision is about is being held, or is about to be released."
```

**Surviving copy** (`rights.*`): `stopStillHelpful`, `stopUrgentTitle`, `stopUrgentBody`, `stopCallNowNote` (amended), `stopMoreTitle`, `stopMoreLead`, `stopPrepTitle/Lead/1..6`, `stopPrepNote` ("You do not have to write anything down that is hard to write. You can tell the service out loud instead."), `stopAskTitle/Lead/1..5`, `stopNotesTitle/Lead/Download/Blank/JurCth/JurVic/File`, the four flag strings, and `rights.tripwire.*`.

**Do not use `buildHandoff` here.** Add the doc comment, and record the stronger reason: beyond `triage.avenue` and `deadlineRuleView`, `forumNames` flows from `planFor`, so pre-BLOCKER-0 it hands a legal service "VCAT" for a fines matter.

**Tests:** `capabilitiesForStop(["criminal"])` → all gates off, `urgentPerson` true; `["family-guardianship-mental-health"]` → `reasonsLetter: false`, `urgentPerson: true`; mixed → most-restrictive wins. A static test that `TRIPWIRE_MESSAGE_KEYS` resolves for every `TripwireReason` against `en.json`. E2E: family stop shows **no** "Ask for the reasons in writing" heading and **no** copy-draft button; the existing `/what this means for you/ → count 0` guard stays unchanged.

---

## 7. `feat(pwa): make the app actually installable`

Verified: `app/manifest.ts` has **no 192×192 icon** (only `favicon.svg` + one 512 PNG, with that same rounded 512 reused as `maskable`), `public/` contains no 192px asset, colours are stale K2 teal (`#10363d`/`#e8ddc7`) against a live paper token of `#f6edd9`, and there is no service worker anywhere in source. The app may not be installable at all today.

Ship §1–§5 of that design as written: fix the manifest (add `id`, `scope`, `lang`, `dir`, the 192 PNG, a real full-bleed `maskable-512.png`), generate the icons with a new `scripts/make-pwa-icons.mjs` built on `next/og` + `ogFonts()` + `CrestEl` (**do not** touch the stale `scripts/make-favicon.mjs`), capture `beforeinstallprompt` in an inline snippet in `app/layout.tsx` before hydration, keep the decision logic pure in `lib/pwa/install.ts`, and gate the card on `consentPending` so it can never cover the consent banner.

**Two things must not be done:**
- **No service worker.** Not in this commit, not as a follow-up without measurement. It is a permanent origin-scoped interceptor sitting in front of `POST /api/decode`, which carries the person's letter — the single highest-risk artefact available in this codebase, added to chase an event that *might* fire. If measurement later proves it necessary, it is a no-op pass-through **enforced by `scripts/sw-check.mjs` in `verify`**, and removing it later requires a tombstone calling `unregister()`, not a file deletion.
- **No re-prompt window.** One permanent dismissal, footer link as the only way back. Resist any later "re-ask after 30 days".

Add `window.localStorage.setItem("wn:install:off", "1")` to the existing `beforeEach` init scripts in `a11y.spec.ts:6`, `wizard.spec.ts:6` and `tour.spec.ts`, mirroring `wn:tour:off`.

Flag to the owner: an installed iOS home-screen app gets a **separate storage container**, so the consent banner reappears once and the first-run tour replays inside the installed copy. Decide whether to suppress the tour when `display-mode: standalone`.

---

## 8. `feat(start): find-your-situation search` — after §5, with guardrails

Build it as a search over the **curated example list only** (`lib/data/examples.ts`), never a call to `classifyData`. That distinction is the whole safety argument, and it is well founded: I verified both classifiers are prefix-anchored (`hay.includes(" " + t.token)`), so `" fine"` matches "I'm fine", `local council` (weight 4) drags every council decision to `vic-fines`, `pension` (weight 1) pulls DVA matters to `cth-centrelink`, and `Child Support` is a `decisionMaker` on `cth-centrelink` whose `deadlineRule` names the wrong Act. `classifyData` is currently **dead code in the UI** — a naive free-text box would ship all four defects into production at once.

**Required guardrails:**
- Add a curated `OUT_OF_SCOPE` term list (visa, migration, detention, prison, bail, police, charged, child protection, custody, family violence, intervention order, guardianship, compulsory treatment…). A hit renders the existing route-to-human panel (`TRIPWIRE_MESSAGES` + `servicesForStop`) and **must not select a tile**. This routes only *toward* a human, so it classifies nobody's matter.
- Enforce the privacy promise in `rights.findHint`: input outside any `<form>`, `onSubmit` preventDefault, `autoComplete="off"`, `name` omitted, query cleared on step change, and **never** written to the URL (`RightsSaverClient.tsx:121-135`), to GA4, or to Vercel Analytics. Add an assertion that `window.location.search` never contains the typed text.
- Remove "NDIS" from `rights.findHint` — naming it is itself a coverage claim for a term with zero hits in any knowledge source. Use `fine, rent, debt, housing`.
- `rights.findNone` must route to a person, not to the last tile: *"We do not have a guide for that. A free service can help you work out the right path — see Free help at the top of this page."*
- Prepend `{ el: "find-decision", … }` to `TOUR_START_WHAT` (`lib/tour/steps.ts:36`), or the tour's first step-2 anchor points past the new control.

**Do not ship the `/chat` link from step 2 (2e/2f) in this commit.** `lib/chat/runner.ts` has **no tripwire** — I verified its system prompt (`:40,42`) describes a "Victorian (Australia) service", lists only four Vic area ids, and `VALID_AREAS` (`:69`) reads the decode corpus, so a Centrelink user is routed to `vic-generic` today. Widening it to Commonwealth also widens it to migration narratives, which the tripwire treats as out of scope entirely. Fix the Commonwealth blindness **and** add a deterministic pre-model out-of-scope check first. When the link does ship, the copy must disclose the change in property — placing "Talk it through with us" beside "This runs on your device and is not sent anywhere" is a false adjacency:
```
findChatQ:    "Not sure which one fits?"
findChatLink: "Answer a few questions instead"
findChatSend: "This one sends what you type to us, so we can point you to the right guide."
```

---

## 9. Decisions that are not the engineer's

**Lawyer sign-off required before the commit ships:**
1. **The example→entry mapping**, as its own signed artefact, against the four-part test: the Act named in `deadlineRule` governs it; `avenue.mr.body` is the right review body; `reasonsRequest.how` addresses the right decision-maker; every `getHelp` service actually helps with it. Blocks commit 6. The `data-check` rule in §5 enforces it in code so it cannot be forgotten.
2. **The `Director of Housing` collision** between `vic-public-housing` and `vic-renting` — blocks the two housing/renting chips.
3. **`corpus/pathways/cth-generic.md`** — content, source-checked by a human, never model-written. Ship as `status: seed`, `isFallback: true`, every `deadlineDays: null` and `deadlineVerified: false`. It will ground answers for NDIS, DVA, ATO and Home Affairs letters — a much wider surface than Centrelink.
4. **Whether `family-guardianship-mental-health` may ever receive a reasons draft.** I have set it to `false`; reversing that is a legal call, not an engineering one.

**Owner decisions:**
5. PWA `theme_color`: keep K2 teal `#10363d` (matches nothing on screen) or move to paper `#f6edd9`? Also changes `viewport.themeColor` and the Android status-bar tint.
6. `display: "standalone"` (more reading height) vs `display_override: ["minimal-ui"]` (origin bar stays visible — a real anti-phishing signal for an audience being targeted by scams).
7. Whether to fix the same "any time" implication in `home.humansTitle`/`home.humansBody`, or scope commit 3 strictly to the pill.
8. Whether `/ask` gets the analysis layer too, or `/decode` only.
9. Whether result-page links to `/learn` and `/faq` should open in a new tab. Leaving the decode result destroys it — by design, since there is nothing to restore from. There is no third option.
10. Accept that commit 6 delivers **no Commonwealth recognition benefit** until the sign-off lands. That is the honest cost of the data-layer release gate.

---

## 10. Must NOT be done

1. **No service worker** on this origin to chase an install prompt (§7).
2. **No loosening of `no-fabricated-deadline`** to admit figures copied from the person's letter (§4, A7 — decided, not open).
3. **No `examples` chips on `seed` or fallback entries**, and none naming a specific scheme or agency (WorkSafe, TAC, NDIS, child support, veterans, aged care, ATO, FOI) until each has its own verified entry (§5).
4. **No downgrade of `unclassifiable` to URGENT** (§6).
5. **No `buildHandoff` on the hand-over screen** (§6).
6. **No narrowing hints on stop flags** (§6) — invert them.
7. **No `classifyData` fallback** from the search box (§8).
8. **No prose in `.tsx`** — `copy-surfaces.mjs` reads `lib/i18n/messages`, `content/faq` and the three built indexes, and never opens `lib/*.ts` or `components/*.tsx`. Note `ChatLauncher.tsx:78` ("Work it out with us") and several `ResultView.tsx` strings are already leaking; do not copy that pattern, and consider a follow-up to close it.
9. **No blanket find-and-replace** of "A person, any time" — `design20260816/landing-reference.html:58` is a frozen handoff artefact.
10. **No accounts, no resume, no `sessionStorage` of letter-derived content** to make the decode result survive navigation. `ResultView`'s own rail promises "Nothing on this page was saved."