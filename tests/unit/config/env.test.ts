import { describe, it, expect, afterEach, vi } from "vitest";

/**
 * The two ways a hosting dashboard silently breaks the cost guard.
 *
 * Both of these used to get through, because the old expression was
 * `Number(process.env.X ?? "50")` and `??` only catches a variable that is UNSET:
 *
 *   · a variable created and LEFT BLANK is "", and Number("") is 0 — the guard compares
 *     `spent >= cap`, so a blank box denied every model call from the first request of the
 *     day while telling the visitor we had reached today's limit;
 *   · "$50" or "50 USD" is NaN, and `spent >= NaN` is false forever — the kill switch never
 *     fired at all.
 *
 * One costs availability, the other costs money, and neither announces itself. These tests
 * exist because both are one keystroke away from someone wiring this up for the first time.
 */

const KEYS = ["SESSION_CAP_USD", "GLOBAL_DAILY_BUDGET_USD"] as const;
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.resetModules();
});

/** Re-import config with the environment as set — the values are read at module load. */
async function loadConfig(env: Partial<Record<(typeof KEYS)[number], string>>) {
  for (const k of KEYS) delete process.env[k];
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  vi.resetModules();
  return import("@/lib/config");
}

describe("cost caps read from the environment", () => {
  it("uses the defaults when the variables are unset", async () => {
    const c = await loadConfig({});
    expect(c.SESSION_CAP_USD).toBe(5);
    expect(c.GLOBAL_DAILY_BUDGET_USD).toBe(50);
  });

  it("uses a good value", async () => {
    const c = await loadConfig({ GLOBAL_DAILY_BUDGET_USD: "15", SESSION_CAP_USD: "2.5" });
    expect(c.GLOBAL_DAILY_BUDGET_USD).toBe(15);
    expect(c.SESSION_CAP_USD).toBe(2.5);
  });

  // THE AVAILABILITY TRAP. Without the fix this is 0, and 0 >= 0 blocks the first call.
  it("treats a variable that exists but is blank as unset, not as zero", async () => {
    const c = await loadConfig({ GLOBAL_DAILY_BUDGET_USD: "", SESSION_CAP_USD: "   " });
    expect(c.GLOBAL_DAILY_BUDGET_USD).toBe(50);
    expect(c.SESSION_CAP_USD).toBe(5);
    // Spelling out what the old code did, so the reason this test exists survives it.
    expect(Number("")).toBe(0);
  });

  // THE SPEND TRAP. Without the fix this is NaN, and `spent >= NaN` is never true.
  it("falls back rather than becoming NaN when money is written the way people write money", async () => {
    for (const written of ["$50", "50 USD", "50.00 AUD", "fifty"]) {
      const c = await loadConfig({ GLOBAL_DAILY_BUDGET_USD: written });
      expect(c.GLOBAL_DAILY_BUDGET_USD).toBe(50);
      expect(Number.isFinite(c.GLOBAL_DAILY_BUDGET_USD)).toBe(true);
      expect(Number(written)).toBeNaN();
    }
  });

  it("ignores a negative cap", async () => {
    const c = await loadConfig({ SESSION_CAP_USD: "-1" });
    expect(c.SESSION_CAP_USD).toBe(5);
  });

  // The one case where zero is meant: switching model spend off without a redeploy. Guarding
  // the typo must not take the deliberate lever away.
  it("honours an explicit zero", async () => {
    const c = await loadConfig({ GLOBAL_DAILY_BUDGET_USD: "0" });
    expect(c.GLOBAL_DAILY_BUDGET_USD).toBe(0);
  });
});

describe("the guard behaves correctly under a blank budget variable", () => {
  it("still allows a fresh session (a blank variable must not read as a spent budget)", async () => {
    const { __setKvForTests, MemoryKv } = await import("@/lib/kv/redis");
    await loadConfig({ GLOBAL_DAILY_BUDGET_USD: "", SESSION_CAP_USD: "" });
    const { precheck } = await import("@/lib/cost/guard");
    __setKvForTests(new MemoryKv());
    const r = await precheck({ sessionId: "blank-env", ip: "9.9.9.9", byoKey: false });
    expect(r.allowed).toBe(true);
    __setKvForTests(null);
  });

  it("an explicit zero budget does block, so the off switch still works", async () => {
    const { __setKvForTests, MemoryKv } = await import("@/lib/kv/redis");
    await loadConfig({ GLOBAL_DAILY_BUDGET_USD: "0" });
    const { precheck } = await import("@/lib/cost/guard");
    __setKvForTests(new MemoryKv());
    const r = await precheck({ sessionId: "zero-env", ip: "9.9.9.8", byoKey: false });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toBe("budget");
    __setKvForTests(null);
  });
});

describe("/api/health reports what actually took effect", () => {
  const kvKeys = [
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "KV_REST_API_URL",
    "KV_REST_API_TOKEN",
  ] as const;
  const savedKv = Object.fromEntries(kvKeys.map((k) => [k, process.env[k]]));
  afterEach(() => {
    for (const k of kvKeys) {
      if (savedKv[k] === undefined) delete process.env[k];
      else process.env[k] = savedKv[k];
    }
    vi.resetModules();
  });

  // The bug this replaces: health checked only the URL, while the cost guard needs a URL AND
  // a token. A deployment missing the token was told it was healthy while the fail-closed
  // guard denied every model call — the exact situation health exists to reveal.
  it("reports kv false when the token is missing, not just the url", async () => {
    for (const k of kvKeys) delete process.env[k];
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    vi.resetModules();
    const { GET } = await import("@/app/api/health/route");
    const body = await GET().json();
    expect(body.kv).toBe(false);
  });

  it("reports kv true only when both halves are present", async () => {
    for (const k of kvKeys) delete process.env[k];
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "t";
    vi.resetModules();
    const { GET } = await import("@/app/api/health/route");
    const body = await GET().json();
    expect(body.kv).toBe(true);
  });

  it("exposes the effective caps so a typo is visible from outside", async () => {
    process.env.GLOBAL_DAILY_BUDGET_USD = "15";
    vi.resetModules();
    const { GET } = await import("@/app/api/health/route");
    const body = await GET().json();
    expect(body.effective.globalDailyBudgetUsd).toBe(15);
    expect(body.effective.primaryModel).toBeTruthy();
    // Never a secret, only presence.
    expect(JSON.stringify(body)).not.toMatch(/sk-ant|UPSTASH|token/i);
  });
});
