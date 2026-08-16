import { test, expect } from "@playwright/test";

/**
 * First-run guided walkthrough (harness §14.11). These tests deliberately do NOT set the
 * kill-switch the other specs use — they are the proof the guide actually paints and
 * behaves. Note the harness trap: tour flags live in localStorage, which survives a
 * "fresh" run, so each test starts from a context with storage cleared by Playwright.
 */

const POPOVER = ".driver-popover";

test("the guide fires on the first /start step and can be dismissed", async ({ page }) => {
  await page.goto("/start");

  // ~1s settle delay before the spotlight, per the implementation.
  await expect(page.locator(POPOVER)).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(POPOVER)).toContainText(/who decided/i);

  // Escapable: the close button dismisses it and leaves the real form usable.
  await page.locator(`${POPOVER} .driver-popover-close-btn`).click();
  await expect(page.locator(POPOVER)).toHaveCount(0);
  await page.getByRole("button", { name: /australian government body/i }).click();
  await expect(page.getByRole("heading", { name: /what is the decision about/i })).toBeVisible();
});

test("each screen's guide shows once — a dismissed guide does not come back", async ({ page }) => {
  await page.goto("/start");
  await expect(page.locator(POPOVER)).toBeVisible({ timeout: 15_000 });
  await page.locator(`${POPOVER} .driver-popover-close-btn`).click();

  // The flag is written at tour START, so a half-dismissed guide stays dismissed.
  await page.reload();
  await page.waitForTimeout(2500);
  await expect(page.locator(POPOVER)).toHaveCount(0);
});

test("advancing the wizard starts the next step's guide", async ({ page }) => {
  await page.goto("/start");
  await expect(page.locator(POPOVER)).toBeVisible({ timeout: 15_000 });
  await page.locator(`${POPOVER} .driver-popover-close-btn`).click();

  await page.getByRole("button", { name: /australian government body/i }).click();

  // Step 2 has its own tour, gated on that step being visible.
  await expect(page.locator(POPOVER)).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(POPOVER)).toContainText(/closest match/i);
});

test("‘Show me how’ replays the guide on demand", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("wn:tour:off", "1");
    window.localStorage.setItem("wn:install:off", "1");
  });
  await page.goto("/start");
  await page.waitForTimeout(1800);
  await expect(page.locator(POPOVER)).toHaveCount(0); // kill-switch honoured

  // Replay is the support answer, so it must work even with the kill-switch set off first.
  await page.evaluate(() => window.localStorage.removeItem("wn:tour:off"));
  await page.getByRole("button", { name: /show me how/i }).click();
  await expect(page.locator(POPOVER)).toBeVisible({ timeout: 15_000 });
});
