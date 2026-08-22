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
 * The result is four steps now — what happened, what you want, your options, next steps —
 * so a test that wants the analysis has to walk to it. Continue is never disabled, so this
 * clicks straight through without filling anything in.
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

  // Step "next steps" — the reasons draft and the grounds people raise.
  await page.getByRole("button", { name: /^next steps/i }).click();
  await expect(page.getByRole("heading", { name: /^ask for the reasons$/i })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("heading", { name: /grounds people raise/i })).toBeVisible();
});

test("tripwire: a sensitive matter leads with a person, and still shows the options", async ({ page }) => {
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

  await expect(page.getByRole("heading", { name: /some extra rules apply/i })).toBeVisible({ timeout: 15_000 });
  // The hand-over LEADS, but it no longer replaces the analysis: the person picked a
  // decision type, and their circumstances are extra context rather than a reason to
  // withhold everything we know about that decision.
  await toOptions(page);
  await expect(page.getByRole("heading", { name: /what this means for you/i })).toBeVisible();
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

  // Urgent banner AND the full result.
  await expect(page.getByRole("heading", { name: /call a human service today/i })).toBeVisible({ timeout: 15_000 });
  await toOptions(page);
  await expect(page.getByRole("heading", { name: /what this means for you/i })).toBeVisible();
  await page.getByRole("button", { name: /^next steps/i }).click();
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

  // The hand-over leads…
  await expect(page.getByRole("heading", { name: /some extra rules apply/i })).toBeVisible({ timeout: 15_000 });
  // …and the analysis and pathway still follow it.
  await toOptions(page);
  await expect(page.getByRole("heading", { name: /what this means for you/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /putting it together/i })).toBeVisible();
});
