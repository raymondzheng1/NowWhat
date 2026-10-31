import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/letter-polish/route";
import { __setKvForTests, MemoryKv } from "@/lib/kv/redis";
import { __setModelForTests, type ModelFn } from "@/lib/generation/anthropic";

/**
 * The case letter (owner's ruling, 2026-11-01): the review letters make the person's case
 * against the law for their path. Proved here: it is accepted when every fact is theirs and
 * every rule is the corpus's, and refused for a new name, a stated time limit, a case citation
 * or a claim that the test is "satisfied".
 */
const story =
  "The council cancelled my permit on 3 March. Nobody told me about the complaint and I never got a chance to reply. I have the cancellation letter.";
const draft = [
  "[Your name]",
  "",
  "To: [the agency or council that made the decision]",
  "",
  "Re: Concern about how a decision was made",
  "",
  "Reference number: [reference number from your letter, if any]",
  "",
  `What happened, in my own words. ${story}`,
  "",
  "Yours faithfully,",
  "[Your name]",
].join("\n");
const body = {
  entryId: "vic-generic",
  draft,
  theirWords: story,
  case: {
    pathId: "judicial-review",
    forum: "the Supreme Court of Victoria",
    pathName: "Asking a court to check the decision was lawful",
    goals: ["get my permit back"],
    groundIds: ["procedural-fairness-hearing"],
    criteria: [],
    notes: { "procedural-fairness-hearing": "They decided before I knew there was a complaint." },
    analysis: { situation: "", points: [], otherSide: "The council may say it acted on the complaint it received." },
  },
};
const letter = (middle: string) =>
  [
    "[Your name]",
    "",
    "To: [the agency or council that made the decision]",
    "",
    "Re: Concern about how a decision was made",
    "",
    "Reference number: [reference number from your letter, if any]",
    "",
    "I write about the council's decision to cancel my permit, and I ask that it be reconsidered so that I can get my permit back.",
    "",
    "I was not given a chance to respond",
    middle,
    "",
    "I have the cancellation letter and can provide it.",
    "",
    "Thank you for considering this request.",
    "",
    "Yours faithfully,",
    "[Your name]",
  ].join("\n");
const GOOD =
  "The council cancelled my permit on 3 March. Nobody told me about the complaint, and I never got a chance to reply before the decision was made. The council may say it acted on the complaint it received, but I could not answer it because I did not know of it.";
const model = (text: string): ModelFn => async (call) => ({
  text: JSON.stringify({ covered: true, letter: text, sources: [] }),
  inputTokens: 40,
  outputTokens: 40,
  model: call.model,
});
const post = async () =>
  (await POST(new NextRequest("http://x/api/letter-polish", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "9.9.9.7" },
    body: JSON.stringify(body),
  }))).json();

beforeEach(() => __setKvForTests(new MemoryKv()));
afterEach(() => {
  __setKvForTests(null);
  __setModelForTests(null);
});

describe("/api/letter-polish — the case letter", () => {
  it("accepts a letter that argues from their facts", async () => {
    __setModelForTests(model(letter(GOOD)));
    const out = await post();
    expect(out.status).toBe("answered");
    expect(out.letter).toContain("I was not given a chance to respond");
  });

  it("is told the law for the path, and their marked points and goals", async () => {
    let seen = "";
    __setModelForTests(async (call) => {
      seen = `${call.system}\n${call.user}`;
      return model(letter(GOOD))(call);
    });
    await post();
    expect(seen).toContain("WHAT THEY SAID THEY WANT: get my permit back");
    expect(seen).toContain("They decided before I knew there was a complaint.");
    expect(seen).toContain("WHAT THE DECISION-MAKER MAY SAY");
    expect(seen).toMatch(/hearing/i);
  });

  for (const [name, bad] of [
    ["a new name", `${GOOD} Mr Hargreaves at the council refused to listen.`],
    ["a stated time limit", `${GOOD} I am applying within 60 days.`],
    ["a case citation", `${GOOD} As in Kioa v West, I had a right to be heard.`],
    ["a claim the test is met", `${GOOD} The hearing rule test is satisfied.`],
  ] as const) {
    it(`refuses ${name}`, async () => {
      __setModelForTests(model(letter(bad)));
      expect((await post()).status).toBe("not-covered");
    });
  }
});
