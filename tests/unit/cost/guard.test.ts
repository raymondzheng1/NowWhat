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
    expect(estimateCostUsd("claude-sonnet-4-6", 1000, 500)).toBeGreaterThan(0);
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
