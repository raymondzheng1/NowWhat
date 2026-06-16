import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** WCAG 2 A/AA automated scan of the key surfaces (no serious/critical violations). */
const PAGES = ["/", "/start", "/faq", "/help", "/contact", "/privacy", "/terms"];

for (const path of PAGES) {
  test(`a11y: ${path} has no serious/critical WCAG A/AA violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    if (serious.length) {
      console.log(`axe ${path}:`, serious.map((v) => `${v.id} (${v.impact}) — ${v.nodes.length} node(s)`).join("; "));
    }
    expect(serious, serious.map((v) => v.id).join(", ")).toEqual([]);
  });
}
