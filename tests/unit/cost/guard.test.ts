import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { precheck, record, estimateCostUsd } from "@/lib/cost/guard";
import { __setKvForTests, MemoryKv } from "@/lib/kv/redis";
import { SESSION_CAP_USD, IP_RATE_LIMIT } from "@/lib/config";

beforeEach(() => __setKvForTests(new MemoryKv()));
afterEach(() => __setKvForTests(null));

const ctx = (over = {}) => ({ sessionId: "s1", ip: "1.2.3.4", byoKey: false, ...over });

describe("cost guard", () => {
  it("allows a fresh session", async () => {
    const r = await precheck(ctx());
    expect(r.allowed).toBe(true);
  });

  it("BYO-key bypasses all meters", async () => {
    const r = await precheck(ctx({ byoKey: true }));
    expect(r.allowed).toBe(true);
  });

  it("blocks when the session cap is reached", async () => {
    await record(ctx(), SESSION_CAP_USD);
    const r = await precheck(ctx());
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toBe("cap");
  });

  it("blocks after the per-IP rate limit", async () => {
    let last = await precheck(ctx({ sessionId: "rate" }));
    for (let i = 0; i < IP_RATE_LIMIT.max + 1; i++) {
      last = await precheck(ctx({ sessionId: "rate" }));
    }
    expect(last.allowed).toBe(false);
    if (!last.allowed) expect(last.reason).toBe("rate");
  });

  it("estimates a positive cost from token usage", () => {
    expect(estimateCostUsd("claude-sonnet-5", 1000, 500)).toBeGreaterThan(0);
  });
});

describe("cost guard fail-closed", () => {
  const saved = { env: process.env.NODE_ENV, u: process.env.UPSTASH_REDIS_REST_URL, k: process.env.KV_REST_API_URL };
  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = saved.env;
    process.env.UPSTASH_REDIS_REST_URL = saved.u;
    process.env.KV_REST_API_URL = saved.k;
  });

  it("blocks in production when KV is not configured", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    __setKvForTests(null);
    const r = await precheck(ctx());
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toBe("unconfigured");
  });
});

// The QA review, 2026-11-02.
describe("caps a client cannot shed", () => {
  it("a new session cookie does not reset today's spend for that address", async () => {
    const { IP_DAILY_CAP_USD } = await import("@/lib/config");
    await record(ctx({ sessionId: "first" }), IP_DAILY_CAP_USD);
    const r = await precheck(ctx({ sessionId: "brand-new" }));
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toBe("cap");
  });

  it("their own key skips the meters but not the rate limit", async () => {
    let last = await precheck(ctx({ byoKey: true }));
    for (let i = 0; i < IP_RATE_LIMIT.max + 1; i++) last = await precheck(ctx({ byoKey: true }));
    expect(last.allowed).toBe(false);
  });

  it("only a value shaped like a key counts as their own key", async () => {
    const { getRequestContext } = await import("@/lib/http/request-context");
    const req = (v: string) => new Request("http://x/", { headers: { "x-byo-anthropic-key": v } });
    expect(getRequestContext(req("junk")).guard.byoKey).toBe(false);
    expect(getRequestContext(req("sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123")).guard.byoKey).toBe(true);
  });

  it("one more call is refused once the day's budget is spent mid-request", async () => {
    const { withinBudget } = await import("@/lib/cost/guard");
    const { GLOBAL_DAILY_BUDGET_USD } = await import("@/lib/config");
    expect(await withinBudget(ctx())).toBe(true);
    await record(ctx({ sessionId: "other", ip: "9.9.9.9" }), GLOBAL_DAILY_BUDGET_USD);
    expect(await withinBudget(ctx())).toBe(false);
  });
});

describe("a request from another site's page", () => {
  it("is recognised, and a same-site or headerless one is not", async () => {
    const { isCrossSite } = await import("@/lib/http/request-context");
    const req = (h: Record<string, string>) => new Request("https://now-what.example/api/memo", { method: "POST", headers: h });
    expect(isCrossSite(req({ "sec-fetch-site": "cross-site" }))).toBe(true);
    expect(isCrossSite(req({ origin: "https://evil.example", host: "now-what.example" }))).toBe(true);
    expect(isCrossSite(req({ origin: "https://now-what.example", host: "now-what.example", "sec-fetch-site": "same-origin" }))).toBe(false);
    expect(isCrossSite(req({}))).toBe(false);
  });
});
