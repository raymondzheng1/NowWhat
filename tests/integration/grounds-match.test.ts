import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/grounds-match/route";
import { __setKvForTests, MemoryKv } from "@/lib/kv/redis";
import { __setModelForTests, type ModelFn } from "@/lib/generation/anthropic";

/**
 * The first cut at which grounds an account may relate to (owner's ruling, 2026-11-01). What
 * is proved: a suggestion rests on the person's own words, names only a ground we offered, and
 * its "why" passes the same no-advice / no-prediction gates as every other output of ours.
 */
const ACCOUNT =
  "The council cancelled my permit without telling me first. I never got a chance to reply to the complaint. The officer said \"we have decided already\".";
const body = {
  entryId: "vic-generic",
  account: ACCOUNT,
  groundIds: ["procedural-fairness-hearing", "no-evidence", "relevant-considerations"],
};
const req = (b: unknown) =>
  new NextRequest("http://x/api/grounds-match", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "9.9.9.8" },
    body: JSON.stringify(b),
  });
const model = (matches: unknown[]): ModelFn => async (call) => ({
  text: JSON.stringify({ covered: true, matches, sources: [] }),
  inputTokens: 40,
  outputTokens: 40,
  model: call.model,
});
const hearing = {
  groundId: "procedural-fairness-hearing",
  quote: "I never got a chance to reply to the complaint.",
  why: "You say you could not answer the complaint before they decided. This ground is about being heard before a decision.",
};

beforeEach(() => __setKvForTests(new MemoryKv()));
afterEach(() => {
  __setKvForTests(null);
  __setModelForTests(null);
});

describe("/api/grounds-match", () => {
  it("returns a suggestion that rests on their own words", async () => {
    __setModelForTests(model([hearing]));
    const out = await (await POST(req(body))).json();
    expect(out.status).toBe("ready");
    expect(out.suggestions).toEqual([hearing]);
  });

  it("drops a quote that is not in their account, and a ground we did not offer", async () => {
    __setModelForTests(
      model([
        hearing,
        { ...hearing, groundId: "no-evidence", quote: "They had no evidence at all for it." },
        { ...hearing, groundId: "bias-actual" },
      ]),
    );
    const out = await (await POST(req(body))).json();
    expect(out.suggestions.map((s: { groundId: string }) => s.groundId)).toEqual(["procedural-fairness-hearing"]);
    expect(out.gates).toEqual(expect.arrayContaining(["quote-not-theirs", "not-offered"]));
  });

  it("a 'why' that predicts or advises is refused by the gates", async () => {
    for (const why of [
      "You will win on this ground because they never asked you.",
      "You should raise this ground with the court straight away.",
    ]) {
      __setModelForTests(model([{ ...hearing, why }]));
      const out = await (await POST(req(body))).json();
      expect(out.status, why).toBe("none");
    }
  });

  it("with no model, the page keeps the full list and nothing is suggested", async () => {
    const out = await (await POST(req(body))).json();
    expect(out.status).toBe("none");
  });
});
