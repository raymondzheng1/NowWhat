import { defineConfig, devices } from "@playwright/test";

/**
 * E2E + a11y (harness §4.4). Runs the critical, keyless flows (landing → wizard →
 * result) against a local dev server, plus axe-core WCAG 2 A/AA scans. The model-backed
 * routes degrade gracefully without keys, so these tests need no secrets.
 */
const PORT = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
