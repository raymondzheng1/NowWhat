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

describe("drift: the composer's copy never asks a formatter for a value it cannot give", () => {
  // THE BUG THIS PINS, found in the live app and not by any test.
  //
  // `composeMemo` is handed a `t` that takes a key and NOTHING ELSE. That signature is the
  // rule that keeps every line of customer prose in the i18n layer. But the real `t` is
  // next-intl's, and next-intl parses its values as ICU messages: a value containing {n} is
  // a message with a REQUIRED argument, so calling it with no arguments does not interpolate
  // — it fails, and the page prints the key instead. Anyone who marked more than one point
  // read "rights.memoSummaryPoints" in the middle of their analysis.
  //
  // No unit test could see it, because a test `t` is a plain record lookup and never runs a
  // formatter. So the convention is asserted on the copy itself: a value read through a
  // single-argument `t` carries no braces at all. Where the composer substitutes something,
  // the placeholder is %n — meaningless to a formatter, so the stored value and the
  // formatted value are the same string, and this test can prove the whole path.
  const KEY = /t\("([A-Za-z0-9_]+)"\)/g;
  const copy = (JSON.parse(read("lib/i18n/messages/en.json")) as { rights: Record<string, string> })
    .rights;

  it("the memo composer reads no message that needs an argument", () => {
    const keys = [...read("lib/memo/compose.ts").matchAll(KEY)].map((m) => m[1]!);
    expect(keys.length).toBeGreaterThan(10);
    const bad = keys.filter((k) => copy[k] !== undefined && /[{}]/.test(copy[k]!));
    expect(bad, `these need a value this \`t\` cannot pass: ${bad.join(", ")}`).toEqual([]);
  });

  it("the count still reaches the reader, with nothing left over", () => {
    expect(copy.memoSummaryPoints).toContain("%n");
    expect(copy.memoSummaryPoints!.replace("%n", "2")).toBe("It works through 2 points you marked.");
  });
});
