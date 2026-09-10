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
 * Continue is never disabled, so this clicks straight through without filling anything in.
 */
async function toOptions(page: import("@playwright/test").Page) {
  const next = page.getByRole("button", { name: /next: what you want/i });
  await expect(next).toBeVisible({ timeout: 15_000 });
  await next.click();
  const opts = page.getByRole("button", { name: /see my options/i });
  await expect(opts).toBeVisible({ timeout: 15_000 });
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
  await expect(page.getByRole("heading", { name: /understand these options/i })).toBeVisible();
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
  await expect(internal).toContainText(/usually considered first/i);

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
  // notice to vacate. It is headed "usually considered first", and someone facing eviction
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
  await expect(page.locator("#r-grounds").getByRole("checkbox")).toHaveCount(0);
  const box = page.locator("#cn-internal");
  await expect(box).toBeVisible();
  await box.fill("They never got the medical certificate I sent in March.");

  // The memo follows the approach they chose, in their words.
  await advance(page, /build my memo/i);
  const memo = page.locator("#r-memo textarea");
  await expect(memo).toBeVisible({ timeout: 15_000 });
  await expect(memo).toHaveValue(/They never got the medical certificate I sent in March\./);
  await expect(memo).toHaveValue(/Housing Appeals Office/i);
  await expect(memo, "a tribunal's test has no place in an internal-review memo")
    .not.toHaveValue(/correct or preferable/i);

  // …and so does the letter. Only the one for the chosen approach is offered, and it asks
  // for another look rather than naming a ground or asking for the preferable decision.
  const draft = page.locator("#r-apply textarea");
  await expect(draft).toBeVisible();
  await expect(draft).toHaveValue(/look at the decision described above again/i);
  await expect(draft).toHaveValue(/time limit for any next step/i);
  await expect(draft).not.toHaveValue(/afresh on the facts/i);
  await expect(page.locator("#r-apply").getByRole("button", { name: /^judicial review$/i })).toHaveCount(0);
  // What they typed on the points step reaches the LETTER, not only the memo. It used to
  // reach the memo alone, so the draft they were about to send kept its placeholder.
  await expect(draft).toHaveValue(/They never got the medical certificate I sent in March\./);
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
  await expect(page.locator("#r-apply textarea")).toHaveCount(0);

  // And the memo hands the duty lawyer no tribunal powers for that court either.
  const memo = page.locator("#r-memo textarea");
  await expect(memo).toBeVisible();
  await expect(memo).not.toHaveValue(/correct or preferable/i);
  await expect(memo).toHaveValue(/not a tribunal conducting merits review/i);
});

test("tripwire: a sensitive matter shows the guidance first, and hands over at the end", async ({ page }) => {
  await page.goto("/start");
  const vic = page.getByRole("button", { name: /victorian state body/i });
  await expect(async () => {
    await vic.click();
    await expect(page.getByRole("heading", { name: /what is the decision about/i })).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 15_000 });

  await page.getByRole("button", { name: /notice to vacate|renting/i }).first().click();
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

  // Back on the result, not back at question two.
  await toOptions(page);
  await expect(page.getByRole("heading", { name: /what this means for you/i })).toBeVisible({
    timeout: 15_000,
  });
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
  await expect(page.getByRole("heading", { name: /three ways a decision gets looked at again/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /asking the department to look at it again/i })).toBeVisible();

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
  const memo = page.locator("#r-memo textarea");
  await expect(memo).toBeVisible({ timeout: 15_000 });
  await expect(memo).toHaveValue(/They never showed me the report they relied on\./);

  // And only now, the hand-over to a person.
  await advance(page, /next: talk to a person/i);
  await expect(page.getByRole("heading", { name: /take this to a human service/i }))
    .toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /free help with this decision/i })).toBeVisible();
});
