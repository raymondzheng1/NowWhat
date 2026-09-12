import { test, expect } from "@playwright/test";

// The first-run guided walkthrough dims the screen and would intercept every click here.
// Turn it off for automated runs via its documented kill-switch (harness §14.11 / §14.5).
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("wn:tour:off", "1");
    window.localStorage.setItem("wn:install:off", "1");
  });
});



/**
 * The result is six views — what happened, what you want, your options, the points you
 * raise, your memo, talk to a person — so a test that wants the analysis has to walk to it.
 *
 * The first two steps are ANSWERED here rather than clicked past. Continue used to be
 * enabled unconditionally and a person could walk the whole flow having entered nothing,
 * which made every step behind them do nothing. The account feeds the letter and the memo,
 * and the goal orders the paths, so both are now required — and this helper does what a
 * real person would.
 */
async function toOptions(page: import("@playwright/test").Page) {
  const story = page.locator("#r-account textarea");
  await expect(story).toBeVisible({ timeout: 15_000 });
  await story.fill("They decided against me and I do not think they had the full picture.");

  const next = page.getByRole("button", { name: /next: what you want/i });
  await expect(next).toBeEnabled({ timeout: 15_000 });
  await next.click();

  // Any goal will do; "I am not sure" is a real answer, so nobody is trapped by not knowing.
  const goal = page.locator("#r-goal").getByRole("checkbox").first();
  await expect(goal).toBeVisible({ timeout: 15_000 });
  await goal.check();

  const opts = page.getByRole("button", { name: /see my options/i });
  await expect(opts).toBeEnabled({ timeout: 15_000 });
  await opts.click();
}

/**
 * Choose an approach. Everything after the options view follows from it — which points the
 * person is asked about, which application draft they get, and what the memorandum works
 * through — so a test that walks past the options has to make the choice a person would.
 */
async function chooseApproach(page: import("@playwright/test").Page, which: RegExp) {
  // Direct children of the panel's own list: a card's criteria, remedies and limits are
  // `li` too, as are the four numbered steps below it. The card title is the process NAME
  // ("Merits review"), or a neutral title where the body is not a tribunal.
  const card = page.locator("#r-analysis > ol > li", { has: page.getByRole("heading", { name: which }) }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  await card.getByRole("button", { name: /work through this one/i }).click();
}

/** Walk on from the options to the grounds, the memo, and finally the hand-over. */
async function advance(page: import("@playwright/test").Page, label: RegExp) {
  const b = page.getByRole("button", { name: label });
  await expect(b).toBeVisible({ timeout: 15_000 });
  await b.click();
}

/**
 * The core, keyless M-Lean "Rights Saver" flow: landing → who → what → result.
 * Fully deterministic (no model/keys, nothing sent to the server) and exercises the
 * triage interactivity end-to-end. The result shows the avenue, the time-limit RULE
 * (never a countdown), the reasons draft, and free help.
 */
test("landing CTA leads to the Rights Saver flow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 }).first()).toContainText("They said no.");
  await page.getByRole("link", { name: /start now/i }).first().click();
  await expect(page).toHaveURL(/\/start/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /who made the decision/i })).toBeVisible({ timeout: 15_000 });
});

test("flow: Victorian → renting → consent → result (avenue, time limit, reasons, help)", async ({ page }) => {
  await page.goto("/start");

  // Step 1 — who made the decision. Retry to ride out hydration.
  const vic = page.getByRole("button", { name: /victorian state body/i });
  await expect(async () => {
    await vic.click();
    await expect(page.getByRole("heading", { name: /what is the decision about/i })).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 15_000 });

  // Step 2 — pick the renting area, tick consent, continue.
  await page.getByRole("button", { name: /notice to vacate|renting/i }).first().click();
  const recent = new Date(Date.now() - 16 * 864e5).toISOString().slice(0, 10);
  await page.locator('input[type="date"]').fill(recent);
  await page.getByRole("checkbox", { name: /general information, not legal advice/i }).check();
  await page.getByRole("button", { name: /see my next steps/i }).click();

  // Step 3 — the result + load-bearing trust surfaces.
  await expect(page.getByRole("button", { name: /start over/i })).toBeVisible({ timeout: 15_000 });
  // Step "your options" — the analysis, the time-limit note and the in-flow explainer.
  await toOptions(page);
  await expect(page.getByRole("heading", { name: /what this means for you/i })).toBeVisible();
  await expect(page.getByText(/time limits:/i)).toBeVisible(); // brief generic note, not a headline
  await expect(page.getByRole("heading", { name: /the ways a decision gets looked at again/i })).toBeVisible();
  await expect(page.getByText(/not legal advice/i)).toBeVisible(); // disclaimer
  await expect(page.getByText(/free help/i).first()).toBeVisible();

  // Choosing an approach drives what comes next. Renting is a tribunal path, so the points
  // are what VCAT decides — not seventeen judicial-review grounds, which are not what a
  // person doing merits review is arguing.
  await chooseApproach(page, /^merits review$|having the decision looked at again/i);
  await advance(page, /next: the points you raise/i);
  await expect(page.getByRole("heading", { name: /what the tribunal decides/i })).toBeVisible({
    timeout: 15_000,
  });
  await advance(page, /build my memo/i);
  // Asking for written reasons is opt-in now, so it is a disclosure rather than a section
  // sitting open for everyone.
  await expect(page.getByRole("heading", { name: /^ask for the reasons$/i })).toBeVisible({
    timeout: 15_000,
  });
});

/**
 * Internal review as a real third path (2026-09-10).
 *
 * It used to be buried inside the merits-review body string — "Housing Appeals Office, then
 * VCAT" — which is how a departmental reviewer came to sit under a card headed MERITS REVIEW
 * and inherit a tribunal's question and remedies. For most decisions this service covers it
 * is the first step and the cheapest one, and it was reachable only as an explainer link
 * while the result screen called merits and judicial review "the two paths".
 *
 * Public housing is the entry that shows the whole split: the Housing Appeals Office is the
 * internal path, VCAT (for a notice to vacate) is the tribunal, and the Supreme Court is the
 * conditional court path.
 */
test("internal review is its own path, and choosing it drives the rest of the flow", async ({ page }) => {
  await page.goto("/start");
  const vic = page.getByRole("button", { name: /victorian state body/i });
  await expect(async () => {
    await vic.click();
    await expect(page.getByRole("heading", { name: /what is the decision about/i })).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 15_000 });

  await page.getByRole("button", { name: /public or social housing/i }).first().click();
  await page.getByRole("checkbox", { name: /general information, not legal advice/i }).check();
  await page.getByRole("button", { name: /see my next steps/i }).click();
  await expect(page.getByRole("button", { name: /start over/i })).toBeVisible({ timeout: 15_000 });
  await toOptions(page);

  // Three cards, not two — and the reviewer is named on its own card rather than inside
  // the tribunal's. Direct children only: a card's own criteria, remedies and limits are
  // `li` too, and so are the four numbered steps under the panel.
  const cards = page.locator("#r-analysis > ol > li");
  await expect(cards).toHaveCount(3, { timeout: 15_000 });
  const internal = cards.filter({ has: page.getByRole("heading", { name: /^internal review$/i }) });
  await expect(internal).toHaveCount(1);
  await expect(internal).toContainText(/Housing Appeals Office/i);
  // "Option 1", NOT "Step 1". Housing's two bodies are chosen by the kind of decision — the
  // lawyer's own criteria say which one applies "depends on the decision" — so the panel
  // numbers them as choices and says plainly that they are not stages.
  await expect(internal).toContainText(/option 1/i);
  await expect(page.locator("#r-analysis")).toContainText(/not steps in order/i);
  await expect(page.locator("#r-analysis")).toContainText(/do not have to do one before another/i);
  await expect(page.locator("#r-analysis")).not.toContainText(/these usually run in order/i);

  // And it claims none of a tribunal's powers. This is the defect that caused the split:
  // "set the decision aside and substitute a new one" is what a tribunal can do, and a
  // departmental reviewer cannot.
  await expect(internal).not.toContainText(/correct or preferable/i);
  await expect(internal).not.toContainText(/substitute/i);
  await expect(internal).not.toContainText(/what it can do/i);
  await expect(internal.getByText(/inside the agency, not by a tribunal/i)).toBeVisible();

  // Meanwhile VCAT keeps everything that IS true of it — the split gave the tribunal its
  // question and remedies back, having lost them while it shared a field with the HAO.
  const tribunal = cards.filter({ has: page.getByRole("heading", { name: /^merits review$/i }) });
  await expect(tribunal).toContainText(/correct or preferable/i);
  await expect(tribunal).toContainText(/what it can do/i);

  // And the judicial-review card must NOT carry the court caution. `planFor` stamps every
  // judicial-review path character:"court", so keying the caution on character alone printed
  // "a court hearing the matter itself, not a review of the decision" on this card — three
  // paragraphs under its own text saying a court looks at HOW the decision was made. It was
  // reaching five of the six entries.
  const court = cards.filter({ has: page.getByRole("heading", { name: /^judicial review$/i }) });
  await expect(court).toHaveCount(1);
  await expect(court).not.toContainText(/hearing the matter itself/i);
  await expect(court).not.toContainText(/not a review of the decision/i);
  // What it should say, and does.
  await expect(court).toContainText(/how the decision was made/i);

  // The Housing Appeals Office card must carry the sentence saying it is NOT the path for a
  // notice to vacate. It is numbered step 1 on the page, and someone facing eviction
  // who follows that loses time they may not have. The line was on the VCAT card only.
  await expect(internal).toContainText(/Housing Appeals Office is not the path/i);
  await expect(internal).toContainText(/goes to VCAT/i);

  await internal.getByRole("button", { name: /work through this one/i }).click();
  await advance(page, /next: the points you raise/i);

  // There is no checklist here, on purpose: our own entry for this step says the rules are
  // different for every department, so there is no list to tick. One open question instead.
  // Housing DOES have lawyer-supplied criteria for the reviewer, so the step shows them and
  // the open box under them. The heading is the reviewer's, never "What the tribunal decides".
  await expect(page.getByRole("heading", { name: /what the reviewer looks at for a decision like yours/i }))
    .toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#r-grounds")).toContainText(/Housing Appeals Office is not the path/i);
  await expect(page.locator("#r-grounds")).not.toContainText(/reasonable and proportionate/i);
  // One tick, for the one answerable point housing carries for the reviewer. The routing
  // lines above it are context and carry no control — there is nothing to answer on them.
  await expect(page.locator("#r-grounds").getByRole("checkbox")).toHaveCount(1);
  const box = page.locator("#cn-internal");
  await expect(box).toBeVisible();
  await box.fill("They never got the medical certificate I sent in March.");

  // The memo follows the approach they chose, in their words.
  await advance(page, /build my memo/i);
  const memo = page.locator("#memo-text");
  await expect(memo).toBeVisible({ timeout: 15_000 });
  await expect(memo).toContainText(/They never got the medical certificate I sent in March\./);
  await expect(memo).toContainText(/Housing Appeals Office/i);
  await expect(memo, "a tribunal's test has no place in an internal-review memo")
    .not.toContainText(/correct or preferable/i);

  // …and so does the letter. Only the one for the chosen approach is offered, and it asks
  // for another look rather than naming a ground or asking for the preferable decision.
  const draft = page.locator("#r-apply .rounded-card");
  await expect(draft).toBeVisible();
  await expect(draft).toContainText(/look at the decision described above again/i);
  await expect(draft).toContainText(/time limit for any next step/i);
  await expect(draft).not.toContainText(/afresh on the facts/i);
  await expect(page.locator("#r-apply").getByRole("button", { name: /^judicial review$/i })).toHaveCount(0);
  // What they typed on the points step reaches the LETTER, not only the memo. It used to
  // reach the memo alone, so the draft they were about to send kept its placeholder.
  await expect(draft).toContainText(/They never got the medical certificate I sent in March\./);
});

/**
 * The Victorian fines scheme, which is where every "the slot is not the body" defect shows
 * up at once: internal review by the issuing agency, and the Magistrates' Court on election
 * sitting in the merits slot without being merits review.
 */
test("the fines court election is never dressed up as merits review", async ({ page }) => {
  await page.goto("/start");
  const vic = page.getByRole("button", { name: /victorian state body/i });
  await expect(async () => {
    await vic.click();
    await expect(page.getByRole("heading", { name: /what is the decision about/i })).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 15_000 });

  await page.getByRole("button", { name: /fine or infringement/i }).first().click();
  await page.getByRole("checkbox", { name: /general information, not legal advice/i }).check();
  await page.getByRole("button", { name: /see my next steps/i }).click();
  await expect(page.getByRole("button", { name: /start over/i })).toBeVisible({ timeout: 15_000 });
  await toOptions(page);

  const cards = page.locator("#r-analysis > ol > li");
  await expect(cards).toHaveCount(3, { timeout: 15_000 });

  // No card anywhere on this decision may be headed "Merits review" — this scheme has no
  // tribunal step at all, and the entry's own note says so.
  await expect(page.getByRole("heading", { name: /^merits review$/i })).toHaveCount(0);

  // The statutory review grounds belong to the agency that reviews the fine, not to a court
  // hearing the charge. They were captioned "what they decide for a decision like yours"
  // under the court until the criteria were split to follow the avenue.
  const internal = cards.filter({ has: page.getByRole("heading", { name: /^internal review$/i }) });
  await expect(internal).toContainText(/mistake of identity/i);
  await expect(internal).toContainText(/special circumstances/i);
  const courtCard = cards.filter({ has: page.getByRole("heading", { name: /having the decision looked at again/i }) });
  await expect(courtCard).toHaveCount(1);
  await expect(courtCard).not.toContainText(/mistake of identity/i);
  await expect(courtCard).not.toContainText(/correct or preferable/i);
  await expect(courtCard).toContainText(/the court decides the charge itself/i);

  // Choosing the court: the points step must not be headed "What the tribunal decides", and
  // no letter is offered, because electing to go to court is a formal step under the scheme's
  // own Act and we hold no checked form for it.
  await courtCard.getByRole("button", { name: /work through this one/i }).click();
  await advance(page, /next: the points you raise/i);
  await expect(page.getByRole("heading", { name: /what this body decides for a decision like yours/i }))
    .toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /what the tribunal decides/i })).toHaveCount(0);

  await advance(page, /build my memo/i);
  await expect(page.locator("#r-apply")).toContainText(/There is no draft for this path/i);
  await expect(page.locator("#r-apply .rounded-card")).toHaveCount(0);

  // And the memo hands the duty lawyer no tribunal powers for that court either.
  const memo = page.locator("#memo-text");
  await expect(memo).toBeVisible();
  await expect(memo).not.toContainText(/correct or preferable/i);
  await expect(memo).toContainText(/not a tribunal conducting merits review/i);
});

test("tripwire: a sensitive matter shows the guidance first, and hands over at the end", async ({ page }) => {
  await page.goto("/start");
  const vic = page.getByRole("button", { name: /victorian state body/i });
  await expect(async () => {
    await vic.click();
    await expect(page.getByRole("heading", { name: /what is the decision about/i })).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 15_000 });

  // The CATCH-ALL, because that is where "is the decision itself about child protection?" is
  // still an open question. Once someone picks a named area — a fine, a notice to vacate —
  // the answer is already known and cannot be yes, so the question is no longer asked there.
  await page.getByRole("button", { name: /a victorian government decision/i }).first().click();
  await page.getByRole("checkbox", { name: /child protection, family law, guardianship/i }).check();
  await page.getByRole("checkbox", { name: /general information, not legal advice/i }).check();
  await page.getByRole("button", { name: /see my next steps/i }).click();

  // The hand-over used to LEAD the result. It does not any more: a person who came here for
  // guidance gets the guidance first, and is handed to a service as the step after it. What
  // still leads is a one-line urgent banner, because a child-protection or compulsory-
  // treatment matter cannot wait six views for a phone number.
  await expect(page.getByRole("button", { name: /start over/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /some extra rules apply/i })).toHaveCount(0);
  await expect(page.getByText(/may not be able to wait/i)).toBeVisible();

  await toOptions(page);
  await expect(page.getByRole("heading", { name: /what this means for you/i })).toBeVisible();

  // …and the full hand-over is there at the end.
  await advance(page, /next: the points you raise/i);
  await advance(page, /build my memo/i);
  await advance(page, /next: talk to a person/i);
  await expect(page.getByRole("heading", { name: /some extra rules apply/i })).toBeVisible({ timeout: 15_000 });
});

test("urgent timing does NOT dead-end: the person still gets their options", async ({ page }) => {
  // Regression guard for the "it always sends me to a human" failure: the time-limit and
  // hearing flags are the most commonly ticked, and they must warn without withholding.
  await page.goto("/start");
  const vic = page.getByRole("button", { name: /victorian state body/i });
  await expect(async () => {
    await vic.click();
    await expect(page.getByRole("heading", { name: /what is the decision about/i })).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 15_000 });

  await page.getByRole("button", { name: /notice to vacate|renting/i }).first().click();
  await page.getByRole("checkbox", { name: /time limit is very soon/i }).check();
  await page.getByRole("checkbox", { name: /general information, not legal advice/i }).check();
  await page.getByRole("button", { name: /see my next steps/i }).click();

  // Urgent banner AND the full result. Timing is the carve-out from "guidance first": a
  // limit that is imminent or already gone is exactly the case where reading six views
  // before seeing a phone number could cost the person the right. lib/tripwire keeps timing
  // separate from scope, and this banner has always shown on every view.
  await expect(page.getByRole("heading", { name: /call a human service today/i })).toBeVisible({ timeout: 15_000 });
  await toOptions(page);
  await expect(page.getByRole("heading", { name: /what this means for you/i })).toBeVisible();
  await chooseApproach(page, /^merits review$|having the decision looked at again/i);
  await advance(page, /next: the points you raise/i);
  await advance(page, /build my memo/i);
  await expect(page.getByRole("heading", { name: /^ask for the reasons$/i })).toBeVisible({
    timeout: 15_000,
  });
});

test("a deep link cannot skip the tripwire or the consent gate", async ({ page }) => {
  // Regression guard: mirroring the answers into the URL made /start?area=…&step=result
  // restorable, and restoring it rendered the full builder with no tripwire flags asked and
  // the "not legal advice" box unticked. A bookmark or the Back button was enough.
  await page.goto("/start?jur=Vic&area=vic-renting&step=result");
  await expect(page.getByRole("heading", { name: /what is the decision about/i })).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByRole("checkbox", { name: /general information, not legal advice/i }),
  ).not.toBeChecked();
  // …and the result is definitely not on screen.
  await expect(page.getByRole("heading", { name: /what this means for you/i })).toHaveCount(0);
});

test("leaving to read a Learn page and coming back keeps your place", async ({ page }) => {
  // The consent gate refuses to restore the result on a fresh load, so a shared link can never
  // skip it. But following "Read more about how review works" and pressing Back IS a fresh
  // load, which used to dump people who had already consented back to the questions.
  await page.goto("/start?jur=Vic&area=vic-public-housing");
  await page.getByRole("checkbox", { name: /general information, not legal advice/i }).check();
  await page.getByRole("button", { name: /see my next steps/i }).click();
  await toOptions(page);
  await expect(page.getByRole("heading", { name: /what this means for you/i })).toBeVisible({
    timeout: 15_000,
  });

  await page.goto("/learn");
  await expect(page).toHaveURL(/\/learn/);
  await page.goBack();

  // Back on the result — and on the STEP they left from, not the top of the flow. This used
  // to need walking forward again, because the view was dropped from the URL on every load.
  await expect(page.getByRole("heading", { name: /what this means for you/i })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page).toHaveURL(/view=options/);
});

test("the returning-user restore does not let a shared link skip consent", async ({ page }) => {
  // The other half of the same mechanism. The per-tab flag is what separates "this person
  // already consented here" from "someone opened their link"; without a flag the gate holds.
  await page.goto("/start?jur=Vic&area=vic-public-housing&step=result");
  await expect(page.getByRole("heading", { name: /what is the decision about/i })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("heading", { name: /what this means for you/i })).toHaveCount(0);
});

test("the browser Back button walks back through the steps", async ({ page }) => {
  // Regression: the flow mirrored its state with history.replaceState, which overwrites the
  // current entry instead of adding one — so Back never saw the steps and dropped the person
  // straight out of the flow.
  await page.goto("/start");
  const vic = page.getByRole("button", { name: /victorian state body/i });
  await expect(async () => {
    await vic.click();
    await expect(page.getByRole("heading", { name: /what is the decision about/i })).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 15_000 });

  await page.goBack();
  await expect(page.getByRole("heading", { name: /who made the decision/i })).toBeVisible({ timeout: 10_000 });

  // Forward is not asserted here: Playwright's history driver does not reliably re-fire
  // popstate for a pushState entry, and Back is the behaviour that was broken and reported.
});

test("a ticked tripwire flag no longer withholds the analysis", async ({ page }) => {
  // The tripwire used to REPLACE the result with "talk to a free legal service". The person
  // chose a decision type; the analysis is about that decision type, and their circumstances
  // are extra context, not a reason to withhold everything.
  await page.goto("/start");
  const vic = page.getByRole("button", { name: /victorian state body/i });
  await expect(async () => {
    await vic.click();
    await expect(page.getByRole("heading", { name: /what is the decision about/i })).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 15_000 });

  await page.getByRole("button", { name: /fine or infringement/i }).first().click();
  await page.getByRole("checkbox", { name: /criminal case, a police matter/i }).check();
  await page.getByRole("checkbox", { name: /general information, not legal advice/i }).check();
  await page.getByRole("button", { name: /see my next steps/i }).click();

  // The hand-over no longer leads — an urgent banner does, and the analysis comes first.
  await expect(page.getByRole("button", { name: /start over/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /some extra rules apply/i })).toHaveCount(0);
  await expect(page.getByText(/may not be able to wait/i)).toBeVisible();
  await toOptions(page);
  await expect(page.getByRole("heading", { name: /what this means for you/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /putting it together/i })).toBeVisible();
});

/**
 * The order of the flow is the product argument, so it is worth a test.
 *
 * Someone arrives for guidance. They tell us what happened, say what they want, see their
 * options, mark the points that sound like their situation and write against each one, get a
 * memorandum — and only then are handed to a free service. The hand-over used to lead the
 * result whenever a flag was ticked, and a help list sat in the middle of the options, which
 * told a person to go and ask someone else before we had told them anything.
 */
test("the flow gives guidance first and hands over last", async ({ page }) => {
  await page.goto("/start");
  const vic = page.getByRole("button", { name: /victorian state body/i });
  await expect(async () => {
    await vic.click();
    await expect(page.getByRole("heading", { name: /what is the decision about/i })).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 15_000 });
  // Public housing, not renting: this test chooses the court path, and renting deliberately
  // carries no judicial review — a notice to vacate comes from a private rental provider.
  await page.getByRole("button", { name: /public or social housing/i }).first().click();
  await page.getByRole("checkbox", { name: /general information, not legal advice/i }).check();
  await page.getByRole("button", { name: /see my next steps/i }).click();
  await expect(page.getByRole("button", { name: /start over/i })).toBeVisible({ timeout: 15_000 });

  // The first view asks one thing and offers no action on the answer. It used to put a
  // "Put my words into the letter" button directly under the box — before the person had
  // been told what their options were, and before a single point was marked. It could not
  // even work there: it slots the account under the points they marked, and nothing was.
  await expect(page.getByRole("heading", { name: /tell us what happened/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /put my words into the letter/i })).toHaveCount(0);

  await toOptions(page);

  // The options view explains the three approaches BEFORE the person's own paths. Someone
  // who has had a letter does not already know that tribunal, review and court are
  // different things.
  await expect(page.getByRole("heading", { name: /the ways a decision gets looked at again/i })).toBeVisible();
  // Explained IN PLACE, above the cards. This was a second list of the same three approaches
  // whose items were links out of the flow — the same navigation that stranded people.
  await expect(page.locator("#r-learn")).toContainText(/internal review/i);
  await expect(page.locator("#r-learn")).toContainText(/judicial review/i);

  // The options view carries the analysis, and NOT the free-services list.
  await expect(page.getByRole("heading", { name: /what this means/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /free help with this decision/i })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /take this to a human service/i })).toHaveCount(0);

  // Nothing to raise until an approach is chosen: what you argue to a tribunal and what you
  // argue to a court are different questions, so asking first would be asking the wrong one.
  await advance(page, /next: the points you raise/i);
  await expect(page.getByRole("heading", { name: /choose an approach first/i })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: /back to my options/i }).click();

  // Choose the court path, and the points become the grounds of review.
  await chooseApproach(page, /^judicial review$/i);
  await advance(page, /next: the points you raise/i);
  const ground = page.getByRole("checkbox").first();
  await expect(ground).toBeVisible({ timeout: 15_000 });
  await ground.check();
  const note = page.locator('textarea[id^="gn-"]').first();
  await expect(note).toBeVisible();
  await note.fill("They never showed me the report they relied on.");

  // The letter action lives HERE now — after the points exist, which is the only place it
  // can do what it says it does.
  await expect(page.getByRole("button", { name: /put my words into the letter/i })).toBeVisible();

  // Then the memo — carrying the person's own words on that point, verbatim.
  await advance(page, /build my memo/i);
  const memo = page.locator("#memo-text");
  await expect(memo).toBeVisible({ timeout: 15_000 });
  await expect(memo).toContainText(/They never showed me the report they relied on\./);

  // And only now, the hand-over to a person.
  await advance(page, /next: talk to a person/i);
  await expect(page.getByRole("heading", { name: /take this to a human service/i }))
    .toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /free help with this decision/i })).toBeVisible();
});

/**
 * The numbering means different things for different schemes (2026-09-11).
 *
 * The owner asked for the result to read as a linear process followed in sequence. It IS one
 * for Centrelink — that entry's own deadline rule says "The first step is an internal review
 * by Services Australia … The tribunal is a separate step" — and it is NOT one for fines,
 * where the supervising lawyer's own line is that internal review and the court election
 * "are two different choices, not steps in order".
 *
 * Getting this backwards for fines costs someone the court-election window, so both halves
 * are pinned here.
 */
test("Centrelink reads as a sequence; a fine reads as a choice", async ({ page }) => {
  // --- Centrelink: steps, in order.
  await page.goto("/start");
  const cth = page.getByRole("button", { name: /australian government body/i });
  await expect(async () => {
    await cth.click();
    await expect(page.getByRole("heading", { name: /what is the decision about/i })).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 15_000 });
  await page.getByRole("button", { name: /centrelink|social-security/i }).first().click();
  await page.getByRole("checkbox", { name: /general information, not legal advice/i }).check();
  await page.getByRole("button", { name: /see my next steps/i }).click();
  await expect(page.getByRole("button", { name: /start over/i })).toBeVisible({ timeout: 15_000 });
  await toOptions(page);

  const panel = page.locator("#r-analysis");
  await expect(panel).toContainText(/these usually run in order/i);
  await expect(panel).toContainText(/step 1/i);
  await expect(panel).toContainText(/step 2/i);
  await expect(panel).toContainText(/step 3/i);
  await expect(panel, "a sequence must not also deny being one").not.toContainText(/not stages/i);
  // Each step has its own limit — the thing someone walking a sequence most needs to know.
  await expect(panel).toContainText(/its own time limit/i);

  // --- A fine: options, not stages.
  await page.goto("/start");
  const vic = page.getByRole("button", { name: /victorian state body/i });
  await expect(async () => {
    await vic.click();
    await expect(page.getByRole("heading", { name: /what is the decision about/i })).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 15_000 });
  await page.getByRole("button", { name: /fine or infringement/i }).first().click();
  await page.getByRole("checkbox", { name: /general information, not legal advice/i }).check();
  await page.getByRole("button", { name: /see my next steps/i }).click();
  await expect(page.getByRole("button", { name: /start over/i })).toBeVisible({ timeout: 15_000 });
  await toOptions(page);

  // Fines claim NEITHER since 2026-09-12: the one sentence that said the two were "not steps
  // in order" was editorial rather than the lawyer's, and the owner withdrew it as not right.
  // So the panel falls back to the neutral line and asserts nothing about order.
  await expect(panel).toContainText(/the usual order/i);
  await expect(panel).toContainText(/depends on the law/i);
  await expect(panel, "no order is claimed either way").not.toContainText(/these usually run in order/i);
  await expect(panel).not.toContainText(/not stages/i);
  await expect(panel).not.toContainText(/not steps in order/i);
});

/**
 * The points step is about THIS person's matter (2026-09-11). It used to open on a static
 * list with no sign of anything they had said on the two steps before it, so someone who
 * had just written six paragraphs met a bare checklist and had to hold their own account in
 * their head while filling it in.
 */
test("the points step carries forward what you already told us", async ({ page }) => {
  await page.goto("/start");
  const vic = page.getByRole("button", { name: /victorian state body/i });
  await expect(async () => {
    await vic.click();
    await expect(page.getByRole("heading", { name: /what is the decision about/i })).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 15_000 });
  await page.getByRole("button", { name: /public or social housing/i }).first().click();
  await page.locator('input[type="date"]').fill("2026-08-04");
  await page.getByRole("checkbox", { name: /general information, not legal advice/i }).check();
  await page.getByRole("button", { name: /see my next steps/i }).click();
  await expect(page.getByRole("button", { name: /start over/i })).toBeVisible({ timeout: 15_000 });

  // Step 1 asks for the account, and no longer opens by telling them to write less.
  await expect(page.getByRole("heading", { name: /tell us what happened/i })).toBeVisible();
  await expect(page.getByText(/can count against you if you write them down/i)).toHaveCount(0);
  await expect(page.getByText(/leave it out and ask a human service first/i)).toHaveCount(0);

  const story = "They never told me the transfer was refused until I rang in August.";
  await page.locator("#r-account textarea").fill(story);

  await advance(page, /next: what you want/i);
  // Say what they are hoping for, so the points step can carry it.
  await page.locator("#r-goal").getByRole("checkbox").first().check();
  await advance(page, /see my options/i);
  await chooseApproach(page, /^internal review$/i);
  await advance(page, /next: the points you raise/i);

  const ctx = page.locator("#r-grounds");
  await expect(ctx).toContainText(/what you have told us so far/i);
  await expect(ctx).toContainText(/Public or social housing decision/i);
  await expect(ctx).toContainText(/2026-08-04/);
  await expect(ctx).toContainText(/Housing Appeals Office/i);
  // Their own account is to hand, verbatim, without leaving the step.
  await expect(ctx).toContainText(/read back what you wrote/i);
  await expect(ctx.getByText(story)).toBeAttached();
});

/**
 * You cannot walk past a step you have not answered (2026-09-11).
 *
 * Continue used to be enabled unconditionally, so someone could reach "your options" having
 * typed nothing — and every step behind them then did nothing, because the letter, the memo
 * and the ordering of the paths are all built from those two answers.
 *
 * Only the first two steps are gated. The points are optional by design.
 */
test("the first two steps must be answered, and say why", async ({ page }) => {
  await page.goto("/start?jur=Vic&area=vic-renting");
  await page.getByRole("checkbox", { name: /general information, not legal advice/i }).check();
  await page.getByRole("button", { name: /see my next steps/i }).click();
  await expect(page.getByRole("button", { name: /start over/i })).toBeVisible({ timeout: 15_000 });

  // Nothing written: Continue is off, and it says what is needed rather than sitting dead.
  const next = page.getByRole("button", { name: /next: what you want/i });
  await expect(next).toBeDisabled();
  await expect(page.getByText(/write a little about what happened first/i)).toBeVisible();

  // Whitespace is not an answer.
  const story = page.locator("#r-account textarea");
  await story.fill("     ");
  await expect(next).toBeDisabled();

  await story.fill("They cut my payment and never told me why.");
  await expect(next).toBeEnabled();
  await next.click();

  // Same again on the goal step, where "I am not sure" is itself a valid answer.
  const opts = page.getByRole("button", { name: /see my options/i });
  await expect(opts).toBeDisabled();
  await expect(page.getByText(/pick what you are hoping for first/i)).toBeVisible();
  await page.locator("#r-goal").getByRole("checkbox").last().check();
  await expect(opts).toBeEnabled();
  await opts.click();

  // And the steps AFTER the choice are not gated — the points are optional.
  await chooseApproach(page, /^merits review$/i);
  await advance(page, /next: the points you raise/i);
  await expect(page.getByRole("button", { name: /build my memo/i })).toBeEnabled();
});

/**
 * Leaving to read an explainer and coming back (2026-09-11).
 *
 * On the judicial-review step every ground's heading links to its own page. Tapping one —
 * which is what the page invites — was a full load, and the flow came back at the top with
 * the approach unchosen and every note gone. Per-tab only, and never for someone opening the
 * same link fresh.
 */
test("going out to a ground explainer and pressing Back keeps your place", async ({ page }) => {
  await page.goto("/start?jur=Vic&area=vic-public-housing");
  await page.getByRole("checkbox", { name: /general information, not legal advice/i }).check();
  await page.getByRole("button", { name: /see my next steps/i }).click();
  await expect(page.getByRole("button", { name: /start over/i })).toBeVisible({ timeout: 15_000 });

  const story = "They never showed me the report they relied on.";
  await page.locator("#r-account textarea").fill(story);
  await advance(page, /next: what you want/i);
  await page.locator("#r-goal").getByRole("checkbox").first().check();
  await advance(page, /see my options/i);
  await chooseApproach(page, /^judicial review$/i);
  await advance(page, /next: the points you raise/i);

  const ground = page.locator("#r-grounds").getByRole("checkbox").first();
  await ground.check();
  const note = page.locator('textarea[id^="gn-"]').first();
  await note.fill("It was a report about my rent arrears.");

  // Follow a ground's own explainer, the way the heading invites.
  await page.goto("/learn/grounds/procedural-fairness-hearing");
  await expect(page).toHaveURL(/\/learn\/grounds\//);
  await page.goBack();

  // Back on the SAME step, with the approach and the notes intact.
  await expect(page.getByRole("heading", { name: /the points you raise|grounds/i }).first())
    .toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#r-grounds")).toBeVisible();
  await expect(page.locator('textarea[id^="gn-"]').first())
    .toHaveValue(/It was a report about my rent arrears\./);
  // And their account is still there, on the step that reads it back. Attached rather than
  // visible: it sits inside a collapsed <details>, so it is deliberately not on screen until
  // the reader opens it.
  await expect(page.locator("#r-grounds").getByText(story)).toBeAttached();
});

/**
 * The points step asks questions that can be answered (2026-09-11).
 *
 * It put an open text box under EVERY criterion, including lines there is nothing to answer
 * — "internal review and asking for the matter to be heard in court are two different
 * choices, not steps in order" is orientation, not a question. Every box also carried the
 * same placeholder, about figures, under a fines point about mistaken identity.
 */
test("routing lines are shown as context, not as questions", async ({ page }) => {
  // Housing, since 2026-09-12: the fines routing line was withdrawn as not right, so housing
  // is where a genuine routing statement still lives — and it is the one that matters most,
  // because it tells someone facing eviction that the Housing Appeals Office is not the path.
  await page.goto("/start?jur=Vic&area=vic-public-housing");
  await page.getByRole("checkbox", { name: /general information, not legal advice/i }).check();
  await page.getByRole("button", { name: /see my next steps/i }).click();
  await expect(page.getByRole("button", { name: /start over/i })).toBeVisible({ timeout: 15_000 });
  await toOptions(page);
  await chooseApproach(page, /^internal review$/i);
  await advance(page, /next: the points you raise/i);

  const step = page.locator("#r-grounds");
  // The routing line is context, and carries no box.
  await expect(step).toContainText(/worth knowing before you start/i);
  await expect(step).toContainText(/Housing Appeals Office is not the path/i);

  // The answerable points are ticks, and nothing is asked until one is ticked.
  await expect(step).toContainText(/correctly applied the relevant legislation/i);
  await expect(step.locator('textarea[id^="icn-"]')).toHaveCount(0);
  await expect(step.getByText(/what happened on this point/i)).toHaveCount(0);

  const point = step.getByRole("checkbox", { name: /correctly applied the relevant legislation/i });
  await point.check();
  await expect(step.getByText(/what happened on this point/i)).toBeVisible();
  const box = step.locator('textarea[id^="icn-"]').first();
  await expect(box).toBeVisible();
  // The placeholder is no longer the one about figures, which made no sense here.
  await expect(box).toHaveAttribute("placeholder", /what happened, and anything you have/i);

  // Unticking takes the box away again — we do not keep asking.
  await point.uncheck();
  await expect(step.locator('textarea[id^="icn-"]')).toHaveCount(0);
});

/** Internal review belongs in the explainer list too — it listed two of the three. */
test("the options explainer covers all three approaches", async ({ page }) => {
  await page.goto("/start?jur=Cth&area=cth-centrelink");
  await page.getByRole("checkbox", { name: /general information, not legal advice/i }).check();
  await page.getByRole("button", { name: /see my next steps/i }).click();
  await expect(page.getByRole("button", { name: /start over/i })).toBeVisible({ timeout: 15_000 });
  await toOptions(page);

  const learn = page.locator("#r-learn");
  await expect(learn).toContainText(/internal review/i);
  await expect(learn).toContainText(/merits review/i);
  await expect(learn).toContainText(/judicial review/i);
  await expect(learn.locator("details")).toHaveCount(3);
});

/**
 * The seven fixes from walking the live flow (2026-09-11).
 */
test("a result link opens at the top, and the counter covers the whole journey", async ({ page }) => {
  // Landing mid-page: browsers restore the previous scroll position for a URL, so a link
  // straight to a result step dropped people under the heading, the disclaimer and the step
  // nav that say what they are looking at.
  await page.goto("/start?jur=Vic&area=vic-generic&step=result");
  await page.getByRole("checkbox", { name: /general information, not legal advice/i }).check();
  await page.getByRole("button", { name: /see my next steps/i }).click();
  await expect(page.getByRole("button", { name: /start over/i })).toBeVisible({ timeout: 15_000 });
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(50);

  // "Step 3 of 3" on the FIRST of six result steps told people they had finished. Two
  // questions plus six result steps is eight.
  await expect(page.getByText(/step 3 of 8/i)).toBeVisible();
  await expect(page.getByText(/of 3\b/i)).toHaveCount(0);
  await page.locator("#r-account textarea").fill("They refused my application.");
  await page.getByRole("button", { name: /next: what you want/i }).click();
  await expect(page.getByText(/step 4 of 8/i)).toBeVisible();
});

test("a Victorian decision is never offered the visa flag", async ({ page }) => {
  // Migration is a Commonwealth matter. A Victorian state body cannot decide a visa, so
  // offering the flag there invites a tick that routes someone away for no reason.
  await page.goto("/start?jur=Vic&area=vic-generic");
  await expect(page.getByRole("checkbox", { name: /visa or migration/i })).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: /criminal case, a police matter/i })).toBeVisible();

  await page.goto("/start?jur=Cth&area=cth-generic");
  await expect(page.getByRole("checkbox", { name: /visa or migration/i })).toBeVisible();
});

test("the catch-alls offer internal review, with its condition attached", async ({ page }) => {
  // They showed merits and judicial review but no internal review at all, so the people with
  // the least guidance were the only ones never told about the cheapest step.
  await page.goto("/start?jur=Vic&area=vic-generic");
  await page.getByRole("checkbox", { name: /general information, not legal advice/i }).check();
  await page.getByRole("button", { name: /see my next steps/i }).click();
  await expect(page.getByRole("button", { name: /start over/i })).toBeVisible({ timeout: 15_000 });
  await toOptions(page);

  const cards = page.locator("#r-analysis > ol > li");
  await expect(cards).toHaveCount(3, { timeout: 15_000 });
  const internal = cards.filter({ has: page.getByRole("heading", { name: /^internal review$/i }) });
  await expect(internal).toHaveCount(1);
  await expect(internal).toContainText(/the agency that made the decision/i);
  // Conditional, because for an unknown decision we cannot say the scheme has one.
  await expect(internal).toContainText(/ask whether this scheme offers one/i);
});

test("the memo leads its step, regenerates, and is what the hand-over gives", async ({ page }) => {
  await page.goto("/start?jur=Cth&area=cth-centrelink");
  await page.getByRole("checkbox", { name: /general information, not legal advice/i }).check();
  await page.getByRole("button", { name: /see my next steps/i }).click();
  await expect(page.getByRole("button", { name: /start over/i })).toBeVisible({ timeout: 15_000 });
  await toOptions(page);
  await chooseApproach(page, /^merits review$/i);
  await advance(page, /next: the points you raise/i);
  await advance(page, /build my memo/i);

  // The analysis comes FIRST. It used to be last, under the reasons draft, the application
  // letter and a list of FAQ links.
  const memoTop = await page.locator("#r-memo").evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  const applyTop = await page.locator("#r-apply").evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  expect(memoTop).toBeLessThan(applyTop);

  // It lists every avenue, which is the first thing a duty lawyer asks.
  const memo = page.locator("#memo-text");
  await expect(memo).toContainText(/Internal review: /);
  await expect(memo).toContainText(/Judicial review: /);

  // Adding more re-composes it live — no model call, nothing sent.
  await expect(memo).not.toContainText(/a letter they sent in June/i);
  await page.locator("#memo-more").fill("There was a letter they sent in June I never saw.");
  await expect(memo).toContainText(/a letter they sent in June I never saw/i);

  // And the hand-over gives the SAME document, on screen, not a second thinner one.
  await advance(page, /next: talk to a person/i);
  const handoff = page.locator("#r-handoff [data-memo]");
  await expect(handoff).toBeVisible({ timeout: 15_000 });
  await expect(handoff).toContainText(/a letter they sent in June I never saw/i);
  await expect(handoff).toContainText(/MEMOPATHSTITLE|Every path open/i);
  // …and the print button is gone from it.
  await expect(page.locator("#r-handoff").getByRole("button", { name: /print/i })).toHaveCount(0);
});

/**
 * The questions fit the decision (2026-09-12).
 *
 * "Does any of these apply?" was one fixed list, so someone who had picked a fine was asked
 * whether their decision was about child protection, guardianship or a visa. None can be true
 * of a fine, and a page of questions that obviously do not fit teaches the reader the form is
 * not about them — on the step where we most need a careful answer.
 */
test("the tripwire questions fit the decision that was chosen", async ({ page }) => {
  await page.goto("/start?jur=Vic&area=vic-fines");
  const fits = page.getByRole("checkbox", { name: /criminal case, a police matter/i });
  await expect(fits, "a fine can become a prosecution, so this one stays").toBeVisible();
  await expect(page.getByRole("checkbox", { name: /time limit is very soon/i })).toBeVisible();
  // Impossible for a fine, and gone.
  await expect(page.getByRole("checkbox", { name: /child protection, family law, guardianship/i })).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: /visa or migration/i })).toHaveCount(0);

  // Someone in prison can have a Centrelink debt, so that one is NOT narrowed away.
  await page.goto("/start?jur=Cth&area=cth-centrelink");
  await expect(page.getByRole("checkbox", { name: /prison, immigration detention/i })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /child protection, family law, guardianship/i })).toHaveCount(0);

  // The catch-all does not know what the decision is, so every question is still live there.
  await page.goto("/start?jur=Cth&area=cth-generic");
  await expect(page.getByRole("checkbox", { name: /child protection, family law, guardianship/i })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /visa or migration/i })).toBeVisible();
});

/**
 * The memo and the letters are documents, not textareas (2026-09-12).
 */
test("the memo renders as a document with live links, and the letter marks its blanks", async ({ page }) => {
  await page.goto("/start?jur=Vic&area=vic-public-housing");
  await page.getByRole("checkbox", { name: /general information, not legal advice/i }).check();
  await page.getByRole("button", { name: /see my next steps/i }).click();
  await expect(page.getByRole("button", { name: /start over/i })).toBeVisible({ timeout: 15_000 });
  await toOptions(page);
  await chooseApproach(page, /^judicial review$/i);
  await advance(page, /next: the points you raise/i);
  await page.locator("#r-grounds").getByRole("checkbox").first().check();
  await advance(page, /build my memo/i);

  // Not a textarea any more, and the links are real links that open in a new tab.
  await expect(page.locator("#memo-text textarea")).toHaveCount(0);
  const link = page.locator("#memo-text a").first();
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);
  await expect(link).toHaveAttribute("href", /\/learn\//);
  // Structure survived: headings and the person's own words are distinguishable.
  await expect(page.locator("#memo-text h3").first()).toBeVisible();

  // The letter marks what the person still has to fill in, rather than hiding brackets in a
  // monospace box — sending it with the brackets still in is the common way to get it wrong.
  await expect(page.locator("#r-apply mark").first()).toBeVisible();
  await expect(page.locator("#r-apply")).toContainText(/is something you fill in before you send it/i);
  await expect(page.locator("#r-apply textarea")).toHaveCount(0);
});

/**
 * Scheme-specific intake questions (2026-09-12).
 *
 * The generic intake was enough to route someone and not enough to write a memo. Twenty-six
 * questions were drafted against the corpus and three survived three-lens adversarial review;
 * a scheme with none grounded asks nothing extra, which is the right default.
 */
test("a fine is asked what stage it has reached, and the answer reaches the memo", async ({ page }) => {
  await page.goto("/start?jur=Vic&area=vic-fines");
  await page.getByRole("checkbox", { name: /general information, not legal advice/i }).check();
  await page.getByRole("button", { name: /see my next steps/i }).click();
  await expect(page.getByRole("button", { name: /start over/i })).toBeVisible({ timeout: 15_000 });

  await page.locator("#r-account textarea").fill("I was not the driver that day.");
  await advance(page, /next: what you want/i);

  // The question is on the goal step, where the rest of the context is gathered.
  const stage = page.locator("#sq-notice-stage");
  await expect(stage).toBeVisible();
  await expect(page.locator("#r-goal")).toContainText(/penalty reminder notice/i);
  await stage.fill("Notice of final demand");
  await page.locator("#r-goal").getByRole("checkbox").first().check();
  await advance(page, /see my options/i);

  await chooseApproach(page, /^internal review$/i);
  await advance(page, /next: the points you raise/i);
  await advance(page, /build my memo/i);

  // It lands in the memo, under the question that was asked, in their words.
  await expect(page.locator("#memo-text")).toContainText(/Notice of final demand/i);
  await expect(page.locator("#memo-text")).toContainText(/What is your notice called/i);
});

test("a scheme with nothing grounded asks nothing extra", async ({ page }) => {
  // Public housing drafted four questions and none survived review, so the step stays clean
  // rather than carrying a question we cannot justify.
  await page.goto("/start?jur=Vic&area=vic-public-housing");
  await page.getByRole("checkbox", { name: /general information, not legal advice/i }).check();
  await page.getByRole("button", { name: /see my next steps/i }).click();
  await expect(page.getByRole("button", { name: /start over/i })).toBeVisible({ timeout: 15_000 });
  await page.locator("#r-account textarea").fill("They refused my transfer.");
  await advance(page, /next: what you want/i);
  await expect(page.locator("#r-goal")).not.toContainText(/a few things about this kind of decision/i);
});
