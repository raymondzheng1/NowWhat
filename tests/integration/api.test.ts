import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as askPost } from "@/app/api/ask/route";
import { POST as decodePost } from "@/app/api/decode/route";
import { __setKvForTests, MemoryKv } from "@/lib/kv/redis";
import { __setModelForTests, type ModelFn } from "@/lib/generation/anthropic";
import { record } from "@/lib/cost/guard";
import { SESSION_CAP_USD } from "@/lib/config";

/**
 * The safety contract (TECHNICAL_SPEC §7). Anthropic mocked, Upstash via the memory
 * KV seam. Proves: (a) out-of-corpus source rejected, (b) advice rejected, (c) cost
 * blocked, (d) not-covered + escalation, (e) the letter is never echoed back.
 */

const GOOD_SOURCE = "VERIFY: servicesaustralia.gov.au — reviews and appeals";

const askModel = (over: Record<string, unknown> = {}): ModelFn => async (call) => ({
  text: JSON.stringify({
    covered: true,
    restated: "You asked about a Centrelink decision.",
    answer: "You may be able to ask for a review. The review is free.",
    nextStep: "A free legal service can help with your situation.",
    sources: [GOOD_SOURCE],
    ...over,
  }),
  inputTokens: 50,
  outputTokens: 50,
  model: call.model,
});

const throwingModel: ModelFn = async () => {
  throw new Error("model should not be called");
};

function jsonReq(url: string, body: unknown, cookie?: string): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "9.9.9.9",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => __setKvForTests(new MemoryKv()));
afterEach(() => {
  __setKvForTests(null);
  __setModelForTests(null);
});

describe("/api/ask", () => {
  it("returns a grounded answer for a covered question (happy path)", async () => {
    __setModelForTests(askModel());
    const res = await askPost(jsonReq("http://t/api/ask", { question: "Centrelink says I owe a debt, can I ask for a review?", locale: "en" }));
    const body = await res.json();
    expect(body.status).toBe("answered");
    expect(body.entry.id).toBe("centrelink-debt");
  });

  it("(a) rejects an answer that cites a source not in the corpus → not-covered", async () => {
    __setModelForTests(askModel({ sources: ["Totally Made Up Authority 2099"] }));
    const res = await askPost(jsonReq("http://t/api/ask", { question: "Centrelink debt, can I get a review?", locale: "en" }));
    const body = await res.json();
    expect(body.status).toBe("not-covered");
  });

  it("(b) rejects advice / prediction → not-covered", async () => {
    __setModelForTests(askModel({ answer: "You should appeal and you will win." }));
    const res = await askPost(jsonReq("http://t/api/ask", { question: "Centrelink debt, can I get a review?", locale: "en" }));
    const body = await res.json();
    expect(body.status).toBe("not-covered");
  });

  it("(c) blocks when the session cost cap is reached (fail-closed posture)", async () => {
    await record({ sessionId: "capper", ip: "9.9.9.9", byoKey: false }, SESSION_CAP_USD);
    __setModelForTests(throwingModel);
    const res = await askPost(jsonReq("http://t/api/ask", { question: "Centrelink debt review?", locale: "en" }, "wn_sid=capper"));
    const body = await res.json();
    expect(body.status).toBe("blocked");
  });

  it("(d) routes to not-covered + help when nothing matches", async () => {
    __setModelForTests(throwingModel); // must not be called
    const res = await askPost(jsonReq("http://t/api/ask", { question: "zxqw qwzx flarn blibble", locale: "en" }));
    const body = await res.json();
    expect(body.status).toBe("not-covered");
    expect(Array.isArray(body.getHelp)).toBe(true);
    expect(body.getHelp.length).toBeGreaterThan(0);
  });
});

describe("/api/decode", () => {
  it("(e) never echoes the letter text back in the response", async () => {
    const SECRET = "SECRETTOKEN_DO_NOT_LEAK_42";
    __setModelForTests(async (call) => ({
      text: JSON.stringify({
        covered: true,
        whatItIs: "A debt notice from Services Australia.",
        whatItMeans: "It says you may owe money. You can ask them to look at it again.",
        options: ["You may be able to ask for a review."],
        sources: [GOOD_SOURCE],
      }),
      inputTokens: 50,
      outputTokens: 50,
      model: call.model,
    }));
    const letter = `Services Australia debt notice overpayment. Reference ${SECRET}.`;
    const res = await decodePost(jsonReq("http://t/api/decode", { text: letter, locale: "en" }));
    const raw = JSON.stringify(await res.json());
    expect(raw).not.toContain(SECRET);
  });
});
