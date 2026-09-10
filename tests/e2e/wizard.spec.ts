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
  // Scoped to the analysis panel: `li` on its own also matches list items elsewhere on the
  // view. The card title is the process NAME ("Merits review"), or the neutral title where
  // the body is not a tribunal.
  const card = page.locator("#r-analysis li", { has: page.getByRole("heading", { name: which }) }).first();
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
