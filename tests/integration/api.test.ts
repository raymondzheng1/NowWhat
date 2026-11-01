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

  // Vercel refuses a body over 4.5 MB before the route runs; our own limit sits under it and says why.
  it("refuses an upload over the limit by name, so the page can say it is too big", async () => {
    const fd = new FormData();
    fd.append("file", new File([new Uint8Array(4 * 1024 * 1024 + 1)], "big.png", { type: "image/png" }));
    const res = await decodePost(new NextRequest("http://t/api/decode", { method: "POST", body: fd }));
    expect(res.status).toBe(413);
    expect((await res.json()).message).toBe("errors.uploadTooLarge");
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
 * /api/memo — the short analysis (the brief). The one step of the guided flow that leaves the
 * device.
 *
 * Everything here is about the SAFE DIRECTION of failure. The full notes are composed with no
 * model at all, so the only correct answer to "something went wrong" is not-covered: the page
 * then shows the full notes, open, exactly as it did before the brief existed. A brief that
 * shipped despite a failed gate would be worse than none — it is what a person reads first.
 *
 * Since 2026-10-31 the model writes the whole of what a person reads first, so these prove the
 * new prose passes every gate the old inserts did: no advice, no prediction, no "satisfied",
 * no invented case, no unsourced time limit — and that it stays short.
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

const briefModel = (over: Record<string, unknown> = {}): ModelFn => async (call) => ({
  text: JSON.stringify({
    covered: true,
    situation: "Centrelink cut your payment. You say you sent a medical certificate. You say nobody asked you about it.",
    path: "Judicial review asks whether the decision was made lawfully.",
    points: [
      {
        ref: "procedural-fairness-hearing/notice",
        relates: "You say no letter came before the decision.",
        needed: "The date the decision was made.",
      },
    ],
    otherSide: "They may say the letter invited a response.",
    toGather: ["the decision letter", "proof you sent the certificate"],
    sources: ["servicesaustralia.gov.au — reviews and appeals"],
    ...over,
  }),
  inputTokens: 60,
  outputTokens: 60,
  model: call.model,
});

describe("/api/memo (the short analysis)", () => {
  it("returns the brief when the model answers within the gates", async () => {
    __setModelForTests(briefModel());
    const body = await (await memoPost(jsonReq("http://x/api/memo", memoBody))).json();
    expect(body.status).toBe("answered");
    expect(body.brief.points[0].ref).toBe("procedural-fairness-hearing/notice");
    expect(body.brief.toGather).toContain("the decision letter");
    // The person's own words are NOT echoed back — the client already has them.
    expect(JSON.stringify(body)).not.toContain("medical certificate I sent");
  });

  it("asks the model for the short analysis, not the old inserts", async () => {
    let system = "";
    __setModelForTests(async (call) => {
      system = call.system;
      return briefModel()(call);
    });
    await memoPost(jsonReq("http://x/api/memo", memoBody));
    expect(system).toContain("SHORT analysis");
    expect(system).toMatch(/State a time limit or deadline/);
  });

  it("falls back when the brief invents a case", async () => {
    // Craig v South Australia is a real case, and it is still refused, because the knowledge
    // base did not hand it over.
    __setModelForTests(briefModel({ otherSide: "As Craig v South Australia shows, they will rely on the letter." }));
    expect((await (await memoPost(jsonReq("http://x/api/memo", memoBody))).json()).status).toBe("not-covered");
  });

  it("falls back when the brief gives advice", async () => {
    __setModelForTests(briefModel({ situation: "You should apply for judicial review straight away." }));
    expect((await (await memoPost(jsonReq("http://x/api/memo", memoBody))).json()).status).toBe("not-covered");
  });

  it("falls back when the brief predicts an outcome", async () => {
    __setModelForTests(briefModel({ path: "Your claim is very likely to succeed and the debt will be waived." }));
    expect((await (await memoPost(jsonReq("http://x/api/memo", memoBody))).json()).status).toBe("not-covered");
  });

  it("falls back when a point is called satisfied", async () => {
    __setModelForTests(
      briefModel({
        points: [
          { ref: "procedural-fairness-hearing/notice", relates: "This element is satisfied on your facts.", needed: "" },
        ],
      }),
    );
    expect((await (await memoPost(jsonReq("http://x/api/memo", memoBody))).json()).status).toBe("not-covered");
  });

  it("falls back when the brief states a time limit we do not hold", async () => {
    // The page prints the verified rule beside the brief; the model may not supply its own.
    __setModelForTests(briefModel({ path: "You have 17 days to apply to the court." }));
    expect((await (await memoPost(jsonReq("http://x/api/memo", memoBody))).json()).status).toBe("not-covered");
  });

  // The owner, 2026-11-01: the in-depth analysis argues each point both ways, no conclusion.
  describe("the in-depth working", () => {
    const FOR = "You say no letter came and nobody asked you about the certificate before the decision.";
    const AGAINST = "They may say the decision letter itself invited a response, and that you did not reply to it.";

    it("comes back with the brief, both sides of each point", async () => {
      __setModelForTests(briefModel({ depth: [{ ref: "procedural-fairness-hearing", for: FOR, against: AGAINST }] }));
      const body = await (await memoPost(jsonReq("http://x/api/memo", memoBody))).json();
      expect(body.status).toBe("answered");
      expect(body.brief.depth).toEqual([{ ref: "procedural-fairness-hearing", for: FOR, against: AGAINST }]);
    });

    it("is asked for, both ways, with no conclusion", async () => {
      let system = "";
      __setModelForTests(async (call) => {
        system = call.system;
        return briefModel()(call);
      });
      await memoPost(jsonReq("http://x/api/memo", memoBody));
      expect(system).toContain('"depth"');
      expect(system).toMatch(/Never say which side is stronger/);
    });

    it("does not count toward the short brief's length", async () => {
      const long = Array.from({ length: 12 }, () => "You say nobody asked you first.").join(" ");
      __setModelForTests(briefModel({ depth: [{ ref: "procedural-fairness-hearing", for: long, against: long }] }));
      expect((await (await memoPost(jsonReq("http://x/api/memo", memoBody))).json()).status).toBe("answered");
    });

    it("drops a side that runs long, and keeps the brief", async () => {
      const tooLong = Array.from({ length: 40 }, () => "You say nobody asked you first.").join(" ");
      __setModelForTests(briefModel({ depth: [{ ref: "procedural-fairness-hearing", for: tooLong, against: AGAINST }] }));
      const body = await (await memoPost(jsonReq("http://x/api/memo", memoBody))).json();
      expect(body.status).toBe("answered");
      expect(body.brief.depth).toEqual([]);
    });

    it("is held to every gate the brief is: a conclusion in it refuses the whole", async () => {
      __setModelForTests(
        briefModel({ depth: [{ ref: "procedural-fairness-hearing", for: "The hearing rule test is satisfied.", against: AGAINST }] }),
      );
      expect((await (await memoPost(jsonReq("http://x/api/memo", memoBody))).json()).status).toBe("not-covered");
    });
  });

  it("falls back when the 'short' analysis is not short", async () => {
    const long = Array.from({ length: 60 }, () => "You say they did not ask you first.").join(" ");
    __setModelForTests(briefModel({ situation: long }));
    expect((await (await memoPost(jsonReq("http://x/api/memo", memoBody))).json()).status).toBe("not-covered");
  });

  // The route has matched the decision to our corpus before it calls, so a decline is the
  // model talking itself out of the job. One decline used to end the attempt (the owner's
  // judicial-review case, 17 marked points). It now gets one more try; two declines stop.
  it("asks once more when the model declines, and answers", async () => {
    let calls = 0;
    __setModelForTests(async (call) => {
      calls++;
      return calls === 1 ? briefModel({ covered: false })(call) : briefModel()(call);
    });
    const body = await (await memoPost(jsonReq("http://x/api/memo", memoBody))).json();
    expect(body.status).toBe("answered");
    expect(calls).toBe(2);
  });

  it("two declines are a decline", async () => {
    let calls = 0;
    __setModelForTests(async (call) => {
      calls++;
      return briefModel({ covered: false })(call);
    });
    const body = await (await memoPost(jsonReq("http://x/api/memo", memoBody))).json();
    expect(body.status).toBe("not-covered");
    expect(body.gates).toContain("model-declined");
    expect(calls).toBe(2);
  });

  it("a brief that copies back no source line relies on its context's sources", async () => {
    __setModelForTests(briefModel({ sources: [] }));
    const body = await (await memoPost(jsonReq("http://x/api/memo", memoBody))).json();
    expect(body.gates).toBeUndefined();
    expect(body.status).toBe("answered");
  });

  // Live, 2026-11-01: a brief cut off by the token ceiling came back "…but you say you have
  // never" with an empty "what the other side may say". It passed every content gate.
  it("falls back when the brief was cut off", async () => {
    __setModelForTests(
      briefModel({
        points: [{ ref: "procedural-fairness-hearing/notice", relates: "You say you have never", needed: "" }],
        otherSide: "",
      }),
    );
    const body = await (await memoPost(jsonReq("http://x/api/memo", memoBody))).json();
    expect(body.status).toBe("not-covered");
    expect(body.gates).toEqual(["incomplete"]);
  });

  it("still answers when the brief names no points at all", async () => {
    __setModelForTests(briefModel({ points: [] }));
    const body = await (await memoPost(jsonReq("http://x/api/memo", memoBody))).json();
    expect(body.status).toBe("answered");
    expect(body.brief.points).toEqual([]);
  });

  it("asks for the same room however many points were marked", async () => {
    // Capped at four points, so it does not grow with the input — but it must never be the
    // shared 1200 that truncated the memo's JSON.
    const seen: number[] = [];
    __setModelForTests(async (call) => {
      seen.push(call.maxTokens);
      return { text: "{}", inputTokens: 10, outputTokens: 10, model: call.model };
    });
    await memoPost(
      jsonReq("http://x/api/memo", {
        ...memoBody,
        groundIds: ["procedural-fairness-hearing", "relevant-considerations"],
      }),
    );
    expect(Math.max(...seen)).toBeGreaterThan(1200);
  });

  it("never calls the model when the person has written nothing", async () => {
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
    const res = await memoPost(jsonReq("http://x/api/memo", memoBody, "wn_sid=memo-cap"));
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.status).toBe("blocked");
  });

  it("rejects a malformed request without spending", async () => {
    __setModelForTests(throwingModel);
    const res = await memoPost(jsonReq("http://x/api/memo", { nope: true }));
    expect(res.status).toBe(400);
  });

  // ---- what the model is given -------------------------------------------------------
  it("hands the model every id a point may cite, verbatim", async () => {
    // The groundId lesson: anything the model has to echo back must be in front of it.
    const housing = getDataEntry("vic-public-housing")!;
    let prompt = "";
    __setModelForTests(async (call) => {
      prompt = call.user;
      return briefModel({ points: [] })(call);
    });
    await memoPost(
      jsonReq("http://x/api/memo", {
        ...memoBody,
        entryId: "vic-public-housing",
        pathId: "merits-review",
        groundIds: [],
        criteria: housing.mrCriteria!,
      }),
    );
    for (const c of withCriterionIds(answerableCriteria(housing, housing.mrCriteria!))) {
      expect(prompt, c.id).toContain(c.id);
    }
  });

  // ---- the court election ------------------------------------------------------------
  // The Magistrates' Court hearing a fine on election decides the CHARGE. The model must never
  // be told it is a review, because no gate can catch a sentence that is true of another body.
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
  const courtModel = (): ModelFn =>
    briefModel({
      situation: "You say the notice went to your old address. You say you saw it after the date on it.",
      path: "If the matter goes to court, the court decides the charge itself.",
      points: [],
      otherSide: "They may say the notice was sent to the address they held.",
      sources: ["https://www.fines.vic.gov.au"],
    });

  it("writes a brief for a court election", async () => {
    __setModelForTests(courtModel());
    const res = await memoPost(jsonReq("http://x/api/memo", courtBody));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("answered");
  });

  it("never tells the model a court election is a review", async () => {
    let prompt = "";
    __setModelForTests(async (call) => {
      prompt = call.user;
      return courtModel()(call);
    });
    await memoPost(jsonReq("http://x/api/memo", courtBody));
    expect(prompt).toContain("the Magistrates' Court");
    expect(prompt).toContain("Infringements Act 2006 (Vic)");
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
    await memoPost(jsonReq("http://x/api/memo", { ...memoBody, pathId: "merits-review", groundIds: [] }));
    expect(prompt).toContain("Is this the correct or preferable decision?");
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
  // The owner's judicial-review letter was refused for keeping "Animal Welfare Act 2002" — an
  // Act the person named in their own account. Theirs to keep; a NEW Act is still refused.
  it("keeps an Act the person named, and still refuses one they did not", async () => {
    const theirs = "They said I was convicted under the Animal Welfare Act 2002. I never was.";
    const draft = polishBody.draft.replace("They cut it off in March.", theirs);
    const body = { ...polishBody, draft, theirWords: theirs };
    const kept = draft.replace(
      "I am writing to ask you to review the decision described above.",
      "I am writing to request a review of the decision described above.",
    );
    __setModelForTests(polishModel(kept));
    const ok = await (await polishPost(jsonReq("http://x/api/letter-polish", body))).json();
    expect(ok.status).toBe("answered");

    const added = kept.replace("I never was.", "I never was, as the Charter of Human Rights Act 2006 protects me.");
    __setModelForTests(polishModel(added));
    const refused = await (await polishPost(jsonReq("http://x/api/letter-polish", body))).json();
    expect(refused.status).toBe("not-covered");
  });

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

describe("a refusal says which gate refused — and nothing else", () => {
  // Found on the live site: the shorter letter was refused on a real account and the page
  // silently kept the long one. From outside, a refusal looked exactly like a missing key.
  // The routes now name the gate. Names only: never the model's text, never the person's.
  it("names the letter gate that refused, without the letter", async () => {
    const invented = polishBody.draft.replace("[Your name]\n", "[Your name]\nOn 99 March I phoned you.\n");
    __setModelForTests(polishModel(invented));
    const body = await (await polishPost(jsonReq("http://x/api/letter-polish", polishBody))).json();
    expect(body.status).toBe("not-covered");
    expect(body.gates).toContain("invented-figure");
    expect(JSON.stringify(body)).not.toContain("phoned");
  });

  it("names a model that declined", async () => {
    // covered:false is reported as "model-declined" — the model said it could not do this
    // safely, which is a different event from a gate refusing what it wrote.
    __setModelForTests(polishModel(polishBody.draft, false));
    const body = await (await polishPost(jsonReq("http://x/api/letter-polish", polishBody))).json();
    expect(body.gates).toEqual(["model-declined"]);
  });

  it("names the analysis gate that refused, without the analysis", async () => {
    __setModelForTests(briefModel({ otherSide: "As Craig v South Australia shows, they will rely on the letter." }));
    const body = await (await memoPost(jsonReq("http://x/api/memo", memoBody))).json();
    expect(body.status).toBe("not-covered");
    expect(Array.isArray(body.gates) && body.gates.length > 0).toBe(true);
    expect(JSON.stringify(body)).not.toContain("Craig");
  });
});

describe("the shorter letter gets one more try", () => {
  it("tries again once when the first attempt is refused, and every gate still applies", async () => {
    let calls = 0;
    const good = polishBody.draft.replace(
      "I am writing to ask you to review the decision described above.",
      "I am writing to request a review of the decision described above.",
    );
    __setModelForTests(async (call) => {
      calls++;
      // First attempt invents a figure (refused); the second is faithful.
      const letter = calls === 1 ? polishBody.draft.replace("[Your name]\n", "[Your name]\nOn 99 March I phoned.\n") : good;
      return { text: JSON.stringify({ covered: true, letter, sources: [] }), inputTokens: 10, outputTokens: 10, model: call.model };
    });
    const body = await (await polishPost(jsonReq("http://x/api/letter-polish", polishBody))).json();
    expect(body.status).toBe("answered");
    expect(body.letter).toContain("request a review");
    expect(calls).toBe(2);
  });

  it("stops after the second refusal and says why", async () => {
    let calls = 0;
    __setModelForTests(async (call) => {
      calls++;
      const letter = polishBody.draft.replace("[Your name]\n", "[Your name]\nOn 99 March I phoned.\n");
      return { text: JSON.stringify({ covered: true, letter, sources: [] }), inputTokens: 10, outputTokens: 10, model: call.model };
    });
    const body = await (await polishPost(jsonReq("http://x/api/letter-polish", polishBody))).json();
    expect(body.status).toBe("not-covered");
    expect(body.gates).toContain("invented-figure");
    expect(calls).toBe(2);
  });
});
