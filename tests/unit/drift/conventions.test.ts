import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

/**
 * Drift defence (harness §4.3) — structural assertions that pin the safety conventions
 * the type-checker can't see. Add the new route here when you create one.
 */

// Routes that make a model call MUST run the cost guard first (fail-closed).
const MODEL_ROUTES = ["app/api/ask/route.ts", "app/api/decode/route.ts"];
// All API routes that touch the letter/question.
const ALL_ROUTES = [
  "app/api/ask/route.ts",
  "app/api/decode/route.ts",
  "app/api/deadline/route.ts",
  "app/api/draft/route.ts",
];

describe("drift: cost guard on every model route", () => {
  for (const r of MODEL_ROUTES) {
    it(`${r} runs precheck() before generating`, () => {
      expect(read(r)).toContain("precheck");
    });
  }
});

describe("drift: every model output is verified", () => {
  it("the generation runner calls verifyOutput before returning answered", () => {
    expect(read("lib/generation/runner.ts")).toContain("verifyOutput");
  });
});

describe("drift: the letter/question is never persisted or logged", () => {
  for (const r of ALL_ROUTES) {
    it(`${r} writes nothing to disk and does not console-log`, () => {
      const src = read(r);
      expect(src).not.toMatch(/writeFileSync|appendFile|fs\.write|createWriteStream/);
      expect(src).not.toMatch(/console\.(log|info|debug)\(/);
    });
  }
});

describe("drift: the disclaimer is a single product constant", () => {
  it("lib/config.ts defines DISCLAIMER and it mentions 'not legal advice'", () => {
    const cfg = read("lib/config.ts");
    expect(cfg).toContain("export const DISCLAIMER");
    expect(cfg.toLowerCase()).toContain("not legal advice");
  });
});

describe("drift: KV reads both env-name conventions (harness §15)", () => {
  it("lib/kv/redis.ts reads UPSTASH_* and KV_*", () => {
    const kv = read("lib/kv/redis.ts");
    expect(kv).toContain("UPSTASH_REDIS_REST_URL");
    expect(kv).toContain("KV_REST_API_URL");
  });
});
