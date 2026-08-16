import { test, expect } from "@playwright/test";

// The first-run guided walkthrough dims the screen and would intercept every click here.
// Turn it off for automated runs via its documented kill-switch (harness §14.11 / §14.5).
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => window.localStorage.setItem("wn:tour:off", "1"));
});


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
  await expect(page.getByRole("heading", { name: /who can review this/i })).toBeVisible();
  await expect(page.getByText(/time limits:/i)).toBeVisible(); // brief generic note, not a headline
  await expect(page.getByText(/ask for the reasons/i)).toBeVisible();
  await expect(page.getByText(/not legal advice/i)).toBeVisible(); // disclaimer
  await expect(page.getByText(/free help/i).first()).toBeVisible();

  // In-flow Learn: the options are explained and the grounds can be marked (→ hand-off).
  await expect(page.getByRole("heading", { name: /understand these options/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /grounds people raise/i })).toBeVisible();
});

test("tripwire: a sensitive matter routes straight to a person (no builder output)", async ({ page }) => {
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

  await expect(page.getByRole("heading", { name: /talk to a free legal service/i })).toBeVisible({ timeout: 15_000 });
  // The builder output (avenue / time limit) must NOT appear on a route-out.
  await expect(page.getByRole("heading", { name: /who can review this/i })).toHaveCount(0);
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
  await expect(page.getByRole("heading", { name: /call a free service today/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /who can review this/i })).toBeVisible();
  await expect(page.getByText(/ask for the reasons/i)).toBeVisible();
});
