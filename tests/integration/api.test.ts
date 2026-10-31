import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as askPost } from "@/app/api/ask/route";
import { POST as decodePost } from "@/app/api/decode/route";
import { POST as chatPost } from "@/app/api/chat/route";
import { POST as memoPost } from "@/app/api/memo/route";
import { POST as polishPost } from "@/app/api/letter-polish/route";
import { __setKvForTests, MemoryKv } from "@/lib/kv/redis";
import { __setModelForTests, __setVisionForTests, type ModelFn } from "@/lib/generation/anthropic";
import { getDataEntry } from "@/lib/data";
import { answerableCriteria, withCriterionIds } from "@/lib/memo/criteria";
import { record } from "@/lib/cost/guard";
import { SESSION_CAP_USD } from "@/lib/config";

/**
 * The safety contract (TECHNICAL_SPEC §7). Anthropic mocked, Upstash via the memory
 * KV seam. Proves: (a) out-of-corpus source rejected, (b) advice rejected, (c) cost
 * blocked, (d) not-covered + escalation, (e) the letter is never echoed back.
 */

const GOOD_SOURCE =
  "Residential Tenancies Act 1997 (Vic) — legislation.vic.gov.au";

const askModel = (over: Record<string, unknown> = {}): ModelFn => async (call) => ({
  text: JSON.stringify({
    covered: true,
    restated: "You asked about a notice to vacate.",
    answer: "You may be able to ask VCAT to check whether the notice to vacate is valid. The review is free.",
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
  __setVisionForTests(null);
});

describe("/api/ask", () => {
  it("returns a grounded answer for a covered question (happy path)", async () => {
    __setModelForTests(askModel());
    const res = await askPost(jsonReq("http://t/api/ask", { question: "I got a notice to vacate from my landlord, can I challenge it?", locale: "en" }));
    const body = await res.json();
    expect(body.status).toBe("answered");
    expect(body.entry.id).toBe("vic-renting");
  });

  it("(a) rejects an answer that cites a source not in the corpus → not-covered", async () => {
    __setModelForTests(askModel({ sources: ["Totally Made Up Authority 2099"] }));
    const res = await askPost(jsonReq("http://t/api/ask", { question: "notice to vacate, can I challenge it at VCAT?", locale: "en" }));
    const body = await res.json();
    expect(body.status).toBe("not-covered");
  });

  it("(b) rejects advice / prediction → not-covered", async () => {
    __setModelForTests(askModel({ answer: "You should appeal and you will win." }));
    const res = await askPost(jsonReq("http://t/api/ask", { question: "notice to vacate, can I challenge it?", locale: "en" }));
    const body = await res.json();
    expect(body.status).toBe("not-covered");
  });

  it("(c) blocks when the session cost cap is reached (fail-closed posture)", async () => {
    await record({ sessionId: "capper", ip: "9.9.9.9", byoKey: false }, SESSION_CAP_USD);
    __setModelForTests(throwingModel);
    const res = await askPost(jsonReq("http://t/api/ask", { question: "notice to vacate, can I challenge it?", locale: "en" }, "wn_sid=capper"));
    const body = await res.json();
    expect(body.status).toBe("blocked");
  });

  it("degrades to help (not a blocked error) when no model is configured", async () => {
    // No model injected and no ANTHROPIC_API_KEY → isModelConfigured() is false.
    const res = await askPost(
      jsonReq("http://t/api/ask", { question: "I got a notice to vacate, can I challenge it?", locale: "en" }),
    );
    const body = await res.json();
    expect(body.status).toBe("not-covered");
    expect(body.getHelp.length).toBeGreaterThan(0);
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
        whatItIs: "A notice to vacate from your rental provider.",
        whatItMeans: "It says your rental provider wants you to move out. You may be able to ask VCAT to check whether the notice is valid.",
        options: ["You may be able to challenge the notice at VCAT."],
        sources: [GOOD_SOURCE],
      }),
      inputTokens: 50,
      outputTokens: 50,
      model: call.model,
    }));
    const letter = `Notice to vacate. Your rental provider is ending your lease. Reference ${SECRET}.`;
    const res = await decodePost(jsonReq("http://t/api/decode", { text: letter, locale: "en" }));
    const raw = JSON.stringify(await res.json());
    expect(raw).not.toContain(SECRET);
  });

  it("OCRs an uploaded photo, decodes it, and never echoes the transcribed text", async () => {
    const SECRET = "OCRSECRET_DO_NOT_LEAK_77";
    __setVisionForTests(async (c) => ({
      text: `Notice to vacate from your rental provider. Reference ${SECRET}.`,
      inputTokens: 600,
      outputTokens: 30,
      model: c.model,
    }));
    __setModelForTests(async (call) => ({
      text: JSON.stringify({
        covered: true,
        whatItIs: "A notice to vacate from your rental provider.",
        whatItMeans: "It says your rental provider wants you to move out. You may be able to ask VCAT to check whether the notice is valid.",
        options: [],
        sources: [GOOD_SOURCE],
      }),
      inputTokens: 50,
      outputTokens: 50,
      model: call.model,
    }));
    const fd = new FormData();
    fd.append("file", new File([new Uint8Array([137, 80, 78, 71])], "letter.png", { type: "image/png" }));
    const res = await decodePost(new NextRequest("http://t/api/decode", { method: "POST", body: fd }));
    const body = await res.json();
    expect(body.status).toBe("answered");
    expect(body.entry.id).toBe("vic-renting");
    expect(JSON.stringify(body)).not.toContain(SECRET);
  });
});

describe("/api/chat (conversational intake)", () => {
  const chatReq = (messages: { role: string; content: string }[]) =>
    jsonReq("http://t/api/chat", { messages });

  it("routes a grounded reply and hands off to the matched area", async () => {
    __setModelForTests(async (call) => ({
      text: JSON.stringify({
        reply: "In Victoria you may be able to ask VCAT to check a notice to vacate. Want me to pull up the guide?",
        area: "vic-renting",
        decisionDate: null,
        handoff: true,
      }),
      inputTokens: 30,
      outputTokens: 30,
      model: call.model,
    }));
    const res = await chatPost(chatReq([{ role: "user", content: "I got a notice to vacate" }]));
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.area).toBe("vic-renting");
    expect(body.reply).toContain("VCAT");
  });

  it("gates an advice reply to the safe fallback", async () => {
    __setModelForTests(async (call) => ({
      text: JSON.stringify({ reply: "You should appeal immediately.", area: "vic-renting", decisionDate: null, handoff: false }),
      inputTokens: 30,
      outputTokens: 30,
      model: call.model,
    }));
    const res = await chatPost(chatReq([{ role: "user", content: "renting notice to vacate" }]));
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.reply.toLowerCase()).not.toContain("you should");
  });

  it("degrades to 'unavailable' when no model is configured", async () => {
    // no model injected → isModelConfigured() is false
    const res = await chatPost(chatReq([{ role: "user", content: "hello" }]));
    const body = await res.json();
    expect(body.status).toBe("unavailable");
  });
});

/**
 * /api/memo — the one step of the guided flow that leaves the device.
 *
 * Everything here is about the SAFE DIRECTION of failure. The deterministic memo is the
 * product's baseline and needs no model at all, so the only correct answer to "something went
 * wrong" is not-covered: the client then keeps the memo it already composed. A draft that
 * shipped despite a failed gate would be worse than no draft, because it is the one document
 * a person hands to a lawyer.
 */
const memoBody = {
  entryId: "cth-centrelink",
  pathId: "judicial-review" as const,
  forum: "the Federal Court",
  pathName: "Judicial review",
  groundIds: ["procedural-fairness-hearing"],
  criteria: [],
  story: "They cut my payment and never asked me about the medical certificate I sent.",
  notes: {},
};

const memoModel = (over: Record<string, unknown> = {}): ModelFn => async (call) => ({
  text: JSON.stringify({
    covered: true,
    summary: "This is about a Centrelink debt. You say you were never asked about a certificate.",
    application: [
      {
        groundId: "procedural-fairness-hearing",
        forThem: "You say you sent a medical certificate. You say nobody asked you about it.",
        against: "They may say the letter invited a response. They may say the certificate arrived late.",
        toTest: "A lawyer will want the date you sent it, and anything showing it arrived.",
      },
    ],
    sources: ["servicesaustralia.gov.au — reviews and appeals"],
    ...over,
  }),
  inputTokens: 60,
  outputTokens: 60,
  model: call.model,
});

describe("/api/memo (the drafted analysis)", () => {
  it("returns a draft when the model answers within the gates", async () => {
    __setModelForTests(memoModel());
    const res = await memoPost(jsonReq("http://x/api/memo", memoBody));
    const body = await res.json();
    expect(body.status).toBe("answered");
    expect(body.application[0].groundId).toBe("procedural-fairness-hearing");
    // The person's own words are NOT echoed back — the client already has them.
    expect(JSON.stringify(body)).not.toContain("medical certificate I sent");
  });

  it("falls back to not-covered when the draft invents a case", async () => {
    // The gate that matters most. Craig v South Australia is a real case, and it is still
    // refused, because the knowledge base did not hand it over.
    __setModelForTests(
      memoModel({
        application: [
          {
            groundId: "procedural-fairness-hearing",
            forThem: "As Craig v South Australia shows, the process was unfair.",
            against: "They may disagree.",
            toTest: "Dates.",
          },
        ],
      }),
    );
    const res = await memoPost(jsonReq("http://x/api/memo", memoBody));
    expect((await res.json()).status).toBe("not-covered");
  });

  it("falls back when the draft gives advice", async () => {
    __setModelForTests(memoModel({ summary: "You should apply for judicial review straight away." }));
    const res = await memoPost(jsonReq("http://x/api/memo", memoBody));
    expect((await res.json()).status).toBe("not-covered");
  });

  it("falls back when the draft predicts an outcome", async () => {
    __setModelForTests(
      memoModel({ summary: "Your claim is very likely to succeed and the debt will be waived." }),
    );
    const res = await memoPost(jsonReq("http://x/api/memo", memoBody));
    expect((await res.json()).status).toBe("not-covered");
  });

  it("never calls the model when the person has written nothing", async () => {
    // No account means nothing to write an analysis around, and no reason to spend or to
    // send anything at all.
    __setModelForTests(throwingModel);
    const res = await memoPost(jsonReq("http://x/api/memo", { ...memoBody, story: "  " }));
    expect((await res.json()).status).toBe("not-covered");
  });

  it("never calls the model for an entry we do not have", async () => {
    __setModelForTests(throwingModel);
    const res = await memoPost(jsonReq("http://x/api/memo", { ...memoBody, entryId: "not-a-scheme" }));
    expect((await res.json()).status).toBe("not-covered");
  });

  it("is blocked once the session cap is reached, and spends nothing more", async () => {
    __setModelForTests(throwingModel);
    await record({ sessionId: "memo-cap", ip: "9.9.9.9", byoKey: false }, SESSION_CAP_USD + 1);
    const res = await memoPost(
      jsonReq("http://x/api/memo", memoBody, "wn_sid=memo-cap"),
    );
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.status).toBe("blocked");
  });

  it("rejects a malformed request without spending", async () => {
    __setModelForTests(throwingModel);
    const res = await memoPost(jsonReq("http://x/api/memo", { nope: true }));
    expect(res.status).toBe(400);
  });

  // ---- the application, written one part of a test at a time ------------------------
  //
  // The draft now works through each PART of a ground's test, not the ground as a whole.
  // That is more prose, written in the place where a model is most tempted to say a part is
  // satisfied — so the thing these tests prove is not that the feature works, but that the
  // new prose passes through every gate the old prose did. A field left out of the
  // verifier's text or the citation scan would be customer-visible output no gate ever read.
  const withElements = (
    elements: { elementId: string; says: string; missing: string }[],
  ) =>
    memoModel({
      application: [
        {
          groundId: "procedural-fairness-hearing",
          forThem: "You say you sent a medical certificate.",
          against: "They may say the letter invited a response.",
          toTest: "A lawyer will want the date you sent it.",
          elements,
        },
      ],
    });

  it("passes the per-part application through once it clears the gates", async () => {
    __setModelForTests(
      withElements([
        { elementId: "notice", says: "You say no letter came first.", missing: "The date it was sent." },
      ]),
    );
    const body = await (await memoPost(jsonReq("http://x/api/memo", memoBody))).json();
    expect(body.status).toBe("answered");
    expect(body.application[0].elements[0].elementId).toBe("notice");
    expect(body.application[0].elements[0].says).toContain("no letter came first");
  });

  it("falls back when a part of the test is called satisfied", async () => {
    // The sentence this document may never contain, in the one place it reads as natural.
    // A fact may RELATE TO a part; whether it goes far enough is not ours to say.
    __setModelForTests(
      withElements([
        { elementId: "notice", says: "This satisfies the element of notice.", missing: "" },
      ]),
    );
    const body = await (await memoPost(jsonReq("http://x/api/memo", memoBody))).json();
    expect(body.status).toBe("not-covered");
  });

  it("falls back when a part of the test invents a case", async () => {
    __setModelForTests(
      withElements([
        { elementId: "notice", says: "", missing: "Compare Craig v South Australia on this part." },
      ]),
    );
    const body = await (await memoPost(jsonReq("http://x/api/memo", memoBody))).json();
    expect(body.status).toBe("not-covered");
  });

  it("asks for room that grows with the points marked", async () => {
    // THE DEFECT THIS EXISTS FOR, and it was mine: writing to each part made the answer
    // longer, and every task shared one 1200-token ceiling. One point fitted. Two did not,
    // and an overrun is not a shorter memo — it is half a JSON object, which fails to parse,
    // and the repair pass shared the same ceiling so it could not close it either. The live
    // site answered a one-point request and returned "not covered" for a two-point one every
    // single time, with nothing anywhere to say why.
    const seen: number[] = [];
    const spy: ModelFn = async (call) => {
      seen.push(call.maxTokens);
      return { text: "{}", inputTokens: 10, outputTokens: 10, model: call.model };
    };
    __setModelForTests(spy);
    await memoPost(jsonReq("http://x/api/memo", { ...memoBody, groundIds: ["procedural-fairness-hearing"] }));
    const one = Math.max(...seen);
    seen.length = 0;
    await memoPost(
      jsonReq("http://x/api/memo", {
        ...memoBody,
        groundIds: ["procedural-fairness-hearing", "relevant-considerations"],
      }),
    );
    const two = Math.max(...seen);
    expect(one).toBeGreaterThan(1200);
    expect(two).toBeGreaterThan(one);
    // Bounded, so marking every point cannot ask for an unbounded answer.
    expect(two).toBeLessThanOrEqual(8000);
  });

  // ---- the court election ----------------------------------------------------------
  //
  // The Magistrates' Court hearing a fine on election decides the CHARGE. The route used to
  // reject the path outright, so the request 400'd, the client cached a refusal, and the one
  // path with no grounds of review also had no drafted paragraph — silently, because a
  // rejected request and a missing key look identical from the page.
  //
  // Accepting it is the easy half. The half that matters is what the model is TOLD: the
  // corpus holds two processes, this is neither, and handing it the merits one would have it
  // write that the body asks "Is this the correct or preferable decision?" and can substitute
  // its own decision. No gate could catch that, because the sentence is true of some other
  // body. So the prompt itself is asserted.
  const courtBody = {
    entryId: "vic-fines",
    pathId: "court-election",
    forum: "the Magistrates' Court, if you elect to have it heard there",
    pathName: "asking a court to hear the matter itself",
    groundIds: [],
    criteria: ["If the matter goes to court instead, the court decides the charge itself."],
    story: "The notice came to my old address and I only saw it after the date on it.",
    notes: {},
  };

  const courtModel = (): ModelFn => async (call) => ({
    text: JSON.stringify({
      covered: true,
      summary: "You say the notice went to your old address. You say you saw it after the date on it.",
      application: [],
      sources: ["https://www.fines.vic.gov.au"],
    }),
    inputTokens: 40,
    outputTokens: 40,
    model: call.model,
  });

  it("drafts for a court election instead of rejecting the request", async () => {
    __setModelForTests(courtModel());
    const res = await memoPost(jsonReq("http://x/api/memo", courtBody));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe("answered");
    expect(body.summary).toContain("old address");
    // No grounds of review on this path, so no per-point application. That is parity with
    // internal and merits review, not a lesser outcome.
    expect(body.application).toEqual([]);
  });

  it("never tells the model a court election is a review", async () => {
    let prompt = "";
    __setModelForTests(async (call) => {
      prompt = call.user;
      return courtModel()(call);
    });
    await memoPost(jsonReq("http://x/api/memo", courtBody));
    expect(prompt).toContain("the Magistrates' Court");
    // The source that says the election exists, so it can be cited.
    expect(prompt).toContain("Infringements Act 2006 (Vic)");
    // And nothing whatever from the merits process.
    expect(prompt).not.toContain("Is this the correct or preferable decision?");
    expect(prompt).not.toContain("Affirm — keep the decision the same.");
    expect(prompt).not.toContain("Asking for a fresh look at the decision");
  });

  it("still gives merits review its own process", async () => {
    // The guard on the test above: it must be asserting an absence that is otherwise present.
    let prompt = "";
    __setModelForTests(async (call) => {
      prompt = call.user;
      return courtModel()(call);
    });
    await memoPost(
      jsonReq("http://x/api/memo", { ...memoBody, pathId: "merits-review", groundIds: [] }),
    );
    expect(prompt).toContain("Is this the correct or preferable decision?");
  });

  it("still answers when a draft returns no parts at all", async () => {
    // Nothing about this upgrade may make the memo worse than it was. A draft with the four
    // ground-level fields and no parts is the old shape, and it must still ship.
    __setModelForTests(memoModel());
    const body = await (await memoPost(jsonReq("http://x/api/memo", memoBody))).json();
    expect(body.status).toBe("answered");
    expect(body.application[0].elements).toEqual([]);
  });
});

/**
 * /api/letter-polish — rewriting a draft letter to read professionally.
 *
 * The draft is the benchmark. Every gate measures the rewrite against it, and any failure
 * returns not-covered so the person keeps the deterministic draft — which is correct, just
 * wooden. The rewrite can only ever improve; it can never be the reason a letter is worse.
 */
const polishBody = {
  entryId: "vic-renting",
  draft: [
    "[Your name]",
    "",
    "To: the rental provider",
    "",
    "Re: Request for an internal review",
    "",
    "Reference number: [reference number from your letter, if any]",
    "",
    "I am writing to ask you to review the decision described above.",
    "",
    "My reasons are as follows. They cut it off in March.",
    "",
    "Yours faithfully,",
    "[Your name]",
  ].join("\n"),
  theirWords: "They cut it off in March.",
};

const polishModel = (letter: string, covered = true): ModelFn => async (call) => ({
  text: JSON.stringify({ covered, letter, sources: [] }),
  inputTokens: 40,
  outputTokens: 40,
  model: call.model,
});

describe("/api/letter-polish (a better-worded draft)", () => {
  it("returns the rewrite when it keeps faith with the draft", async () => {
    const better = polishBody.draft.replace(
      "I am writing to ask you to review the decision described above.",
      "I am writing to request a review of the decision described above.",
    );
    __setModelForTests(polishModel(better));
    const res = await polishPost(jsonReq("http://x/api/letter-polish", polishBody));
    const body = await res.json();
    expect(body.status).toBe("answered");
    expect(body.letter).toContain("I am writing to request a review");
  });

  it("refuses a rewrite that drops a blank the person still has to fill", async () => {
    __setModelForTests(polishModel(polishBody.draft.replaceAll("[Your name]", "")));
    const res = await polishPost(jsonReq("http://x/api/letter-polish", polishBody));
    expect((await res.json()).status).toBe("not-covered");
  });

  it("refuses a rewrite that invents a date", async () => {
    // The kind of invention a model supplies most helpfully, and the kind that does the most
    // damage in a letter about a decision.
    __setModelForTests(
      polishModel(polishBody.draft.replace("Yours faithfully,", "I wrote to you on 14 April.\n\nYours faithfully,")),
    );
    const res = await polishPost(jsonReq("http://x/api/letter-polish", polishBody));
    expect((await res.json()).status).toBe("not-covered");
  });

  it("refuses a rewrite that argues the law", async () => {
    __setModelForTests(
      polishModel(
        polishBody.draft.replace(
          "I am writing to ask you to review the decision described above.",
          "You should review this decision because it was unlawful and I will certainly succeed.",
        ),
      ),
    );
    const res = await polishPost(jsonReq("http://x/api/letter-polish", polishBody));
    expect((await res.json()).status).toBe("not-covered");
  });

  it("refuses a rewrite that cites a case the draft never mentioned", async () => {
    __setModelForTests(
      polishModel(polishBody.draft.replace("Yours faithfully,", "See Kioa v West.\n\nYours faithfully,")),
    );
    const res = await polishPost(jsonReq("http://x/api/letter-polish", polishBody));
    expect((await res.json()).status).toBe("not-covered");
  });

  it("keeps the draft when the model says it could not improve it safely", async () => {
    __setModelForTests(polishModel(polishBody.draft, false));
    const res = await polishPost(jsonReq("http://x/api/letter-polish", polishBody));
    expect((await res.json()).status).toBe("not-covered");
  });

  it("is blocked once the session cap is reached, and spends nothing more", async () => {
    __setModelForTests(throwingModel);
    await record({ sessionId: "polish-cap", ip: "9.9.9.9", byoKey: false }, SESSION_CAP_USD + 1);
    const res = await polishPost(
      jsonReq("http://x/api/letter-polish", polishBody, "wn_sid=polish-cap"),
    );
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.status).toBe("blocked");
  });
});

/**
 * The drafted analysis against WHAT THE BODY DECIDES.
 *
 * The element walk only ever reached judicial review, because elements belong to grounds of
 * review and grounds of review belong to a court. The paths people actually take — an
 * internal review, a tribunal, electing to have a charge heard — have no grounds at all, and
 * on those the drafted analysis was a summary paragraph and a list of criteria with nothing
 * said about any of them.
 *
 * What these tests prove is not that the feature works. It is that the new prose passes
 * through every gate the old prose did: the verifier's text, the no-score gate, and the
 * memo's own citation scan. This is now the only drafted analysis most readers will see, so a
 * field missing from one of those lists would be the common case going unread, not the rare.
 */
describe("/api/memo — the per-criterion analysis", () => {
  const housing = getDataEntry("vic-public-housing")!;
  const answerable = answerableCriteria(housing, housing.mrCriteria!);
  const ids = withCriterionIds(answerable);

  const meritsBody = {
    entryId: "vic-public-housing",
    pathId: "merits-review" as const,
    forum: "VCAT",
    pathName: "Asking for a fresh look at the decision",
    groundIds: [],
    criteria: housing.mrCriteria!,
    story: "They gave me a notice to vacate and I have nowhere else to go.",
    notes: {},
  };

  const criteriaModel =
    (criteria: { criterionId: string; says: string; missing: string }[]): ModelFn =>
    async (call) => ({
      text: JSON.stringify({
        covered: true,
        summary: "This is about a notice to vacate. You say you have nowhere else to go.",
        application: [],
        criteria,
        sources: [housing.sourceUrl],
      }),
      inputTokens: 50,
      outputTokens: 50,
      model: call.model,
    });

  it("passes the per-criterion analysis through once it clears the gates", async () => {
    __setModelForTests(
      criteriaModel([
        {
          criterionId: ids[0]!.id,
          says: "You say the notice gave you ten days to leave.",
          missing: "A lawyer will want the notice itself.",
        },
      ]),
    );
    const body = await (await memoPost(jsonReq("http://x/api/memo", meritsBody))).json();
    expect(body.status).toBe("answered");
    expect(body.criteria[0].criterionId).toBe(ids[0]!.id);
    expect(body.criteria[0].says).toContain("ten days");
  });

  it("hands the model every answerable criterion with its id", async () => {
    let prompt = "";
    __setModelForTests(async (call) => {
      prompt = call.user;
      return criteriaModel([])(call);
    });
    await memoPost(jsonReq("http://x/api/memo", meritsBody));
    for (const c of ids) {
      expect(prompt, c.id).toContain(c.id);
      expect(prompt).toContain(c.text);
    }
  });

  it("falls back when a criterion is called satisfied", async () => {
    // The sentence this document may never contain. A criterion is what the body decides,
    // not a test anyone can be told they pass.
    __setModelForTests(
      criteriaModel([
        { criterionId: ids[0]!.id, says: "This criterion is satisfied on your facts.", missing: "" },
      ]),
    );
    const body = await (await memoPost(jsonReq("http://x/api/memo", meritsBody))).json();
    expect(body.status).toBe("not-covered");
  });

  it("falls back when a criterion line invents a case", async () => {
    __setModelForTests(
      criteriaModel([
        { criterionId: ids[0]!.id, says: "", missing: "Compare Craig v South Australia here." },
      ]),
    );
    const body = await (await memoPost(jsonReq("http://x/api/memo", meritsBody))).json();
    expect(body.status).toBe("not-covered");
  });

  it("falls back when a criterion line predicts the outcome", async () => {
    __setModelForTests(
      criteriaModel([
        { criterionId: ids[0]!.id, says: "You will win on this at VCAT.", missing: "" },
      ]),
    );
    const body = await (await memoPost(jsonReq("http://x/api/memo", meritsBody))).json();
    expect(body.status).toBe("not-covered");
  });

  it("asks for room that grows with the criteria, not only with the grounds", async () => {
    // The same defect as the elements, and it would land on the path with no grounds: a
    // request with four criteria and no grounds asked for the bare 1200 and overran it.
    const seen: number[] = [];
    const spy: ModelFn = async (call) => {
      seen.push(call.maxTokens);
      return { text: "{}", inputTokens: 10, outputTokens: 10, model: call.model };
    };
    __setModelForTests(spy);
    await memoPost(jsonReq("http://x/api/memo", { ...meritsBody, criteria: [] }));
    const none = Math.max(...seen);
    seen.length = 0;
    await memoPost(jsonReq("http://x/api/memo", meritsBody));
    const some = Math.max(...seen);
    expect(none).toBe(1200);
    expect(some).toBeGreaterThan(none);
    expect(some).toBeLessThanOrEqual(8000);
  });

  it("does not ask for room for a routing line", async () => {
    // A line that appears in both lists says which path applies. It gets no id and no
    // answer, so it may not inflate the budget either.
    const seen: number[] = [];
    __setModelForTests(async (call) => {
      seen.push(call.maxTokens);
      return { text: "{}", inputTokens: 10, outputTokens: 10, model: call.model };
    });
    const routing = (housing.mrCriteria ?? []).filter((c) =>
      (housing.irCriteria ?? []).includes(c),
    );
    expect(routing.length).toBeGreaterThan(0);
    await memoPost(jsonReq("http://x/api/memo", { ...meritsBody, criteria: routing }));
    expect(Math.max(...seen)).toBe(1200);
  });
});
