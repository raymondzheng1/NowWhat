import { test, expect } from "@playwright/test";

/**
 * The core, keyless flow: landing → wizard → Result. This is the deterministic path
 * (no model/keys needed) and exercises the wizard interactivity end-to-end.
 */
test("landing CTA leads to the wizard", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Got a government");
  await page.getByRole("link", { name: /find out what you can do/i }).first().click();
  await expect(page).toHaveURL(/\/start/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /what is your decision about/i })).toBeVisible({ timeout: 15_000 });
});

test("wizard: pick renting → date → Result shows deadline, sources, get-help", async ({ page }) => {
  await page.goto("/start");

  // Step 1 — select the renting card. Retry the click until selection registers, to
  // ride out React hydration (a pre-hydration click is otherwise dropped).
  const card = page.getByRole("button", { name: /renting/i }).first();
  await expect(async () => {
    await card.click();
    await expect(card).toHaveAttribute("aria-pressed", "true", { timeout: 1500 });
  }).toPass({ timeout: 15_000 });
  await page.getByRole("button", { name: /continue/i }).click();

  // Step 2 — enter a recent decision date, then continue.
  const recent = new Date(Date.now() - 16 * 864e5).toISOString().slice(0, 10);
  await page.locator('input[type="date"]').fill(recent);
  await page.getByRole("button", { name: /continue/i }).click();

  // Step 3 — the Result, with the load-bearing trust surfaces.
  await expect(page.getByRole("link", { name: /start over/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/your time limit/i)).toBeVisible(); // deadline card
  await expect(page.getByText(/where this comes from/i)).toBeVisible(); // sources
  await expect(page.getByText(/get free help/i)).toBeVisible(); // tiered help
  await expect(page.getByText(/not legal advice/i)).toBeVisible(); // disclaimer
});

test("deep-link handoff (?area=&date=) jumps straight to the Result", async ({ page }) => {
  const recent = new Date(Date.now() - 10 * 864e5).toISOString().slice(0, 10);
  await page.goto(`/start?area=vic-fines&date=${recent}`);
  // The handoff runs in a post-hydration effect — allow time for it.
  await expect(page.getByText(/get free help/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/where this comes from/i)).toBeVisible();
});
