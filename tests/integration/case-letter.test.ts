import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/letter-polish/route";
import { caseMaxWords } from "@/lib/letter/fidelity";
import { SELF_WARNING_BLOCKS } from "@/lib/draft/warnings";
import { buildDraft } from "@/lib/draft/build";
import { getEntry } from "@/lib/corpus/index";
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

  // The owner's ruling, 2026-11-01: a summary of the case built on the analysis, for the body
  // that hears it. It argues the case for each point and answers the case against.
  it("is given each point argued both ways, and the sections for the path", async () => {
    let seen = "";
    __setModelForTests(async (call) => {
      seen = `${call.system}\n${call.user}`;
      return model(letter(GOOD))(call);
    });
    const withDepth = {
      ...body,
      case: {
        ...body.case,
        analysis: {
          ...body.case.analysis,
          depth: [
            {
              ref: "procedural-fairness-hearing",
              for: "Nobody told them about the complaint before the permit was cancelled.",
              against: "The council may say the complaint was minor and needed no reply.",
            },
          ],
        },
      },
    };
    await POST(
      new NextRequest("http://x/api/letter-polish", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "9.9.9.7" },
        body: JSON.stringify(withDepth),
      }),
    );
    // Named as the person saw the point, not by its id.
    expect(seen).toContain('ON "You never got to have your say"');
    expect(seen).toContain("THE CASE FOR IT (argue this): Nobody told them about the complaint");
    expect(seen).toContain("THE CASE AGAINST IT (answer this from their facts; never concede it): The council may say");
    expect(seen).toContain(
      "SECTION HEADINGS, in order: The decision and its reasons | What I ask the court to do | Summary of the facts | Grounds of review",
    );
    expect(seen).toMatch(/Never concede it/i);
  });

  it("a statement to the court keeps its parties and its signature line", async () => {
    const statement = (x: string) =>
      [
        "To: [the court that will hear your application — a free legal service can tell you which court, and which of its forms to use]",
        "",
        "Re: Application for judicial review — the applicant's grounds and case",
        "",
        "Applicant: [Your name]",
        "Respondent: [the agency or council that made the decision]",
        "",
        x,
        "",
        "Signed: [Your name]",
        "Applicant",
      ].join("\n");
    const send = async (out: string) => {
      __setModelForTests(model(out));
      return (
        await POST(
          new NextRequest("http://x/api/letter-polish", {
            method: "POST",
            headers: { "content-type": "application/json", "x-forwarded-for": "9.9.9.7" },
            body: JSON.stringify({ ...body, draft: statement(`What happened, in my own words. ${story}`) }),
          }),
        )
      ).json();
    };
    // No "Yours faithfully" in the draft, so none is asked of the rewrite.
    expect((await send(statement(`Grounds of review\n\nGround 1: I was not given a chance to respond\n${GOOD}`))).status).toBe(
      "answered",
    );
    // But the other party may not go missing.
    const noRespondent = statement(`Ground 1: I was not given a chance to respond\n${GOOD}`).replace(/^Respondent:.*\n/m, "");
    expect((await send(noRespondent)).status).toBe("not-covered");
  });

  // Live, 2026-11-01: the first statement of case was refused for a dropped blank, a missing
  // party line, its length and "invented" numbers — its own "Ground 1", "Ground 2". Now the
  // model writes the body, the bones go back on exactly, and its numbering is not a fact.
  it("writes the body of a real statement, puts the bones back on, and lets the grounds be numbered", async () => {
    const real = buildDraft(getEntry("vic-generic")!, "judicial-review-application", story, {
      decisionDate: "2026-03-03",
      points: [{ heading: "Procedural fairness — you never got to have your say", text: "Nobody told me about the complaint." }],
    }).body;
    let seen = "";
    __setModelForTests(async (call) => {
      seen = call.user;
      return model(
        [
          "The decision and its reasons",
          "The council cancelled my permit on 3 March.",
          "",
          "What I ask the court to do",
          "I ask the court to set aside the decision and send it back to be decided again according to law.",
          "",
          "Grounds of review",
          "",
          "Ground 1: I was not given a chance to respond",
          GOOD,
          "",
          "Ground 2: The complaint was not shown to me",
          "Nobody told me about the complaint.",
        ].join("\n"),
      )(call);
    });
    const out = await (
      await POST(
        new NextRequest("http://x/api/letter-polish", {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": "9.9.9.7" },
          body: JSON.stringify({ ...body, draft: real }),
        }),
      )
    ).json();
    expect(out.status).toBe("answered");
    // The model saw the top for reference and was asked for the body only.
    expect(seen).toContain("THE TOP OF THE DOCUMENT (printed above what you write — never copy it):");
    expect(seen).toContain("THE DRAFT'S BODY:");
    expect(seen).not.toContain("THE DRAFT:\n");
    // The document as assembled: the exact head, the body, the exact sign-off.
    expect(out.letter).toMatch(/^\[Your name\]\n\[Your address\]/);
    expect(out.letter).toContain("Respondent: [the agency or council that made the decision]");
    expect(out.letter).toContain("Ground 2: The complaint was not shown to me");
    expect(out.letter).toMatch(/\n\nSigned: \[Your name\]\nApplicant$/);
  });

  // Live, 2026-11-02: the parking account carried the person's own reminders, "[Insert Rego]"
  // and "[Insert Notice Number]". A summary that left them out was refused for dropping a blank,
  // every time, and the person got the plain template. Theirs to keep or leave; ours still count.
  it("may leave out a blank from their own account, and fill the draft's body blanks, but invent none", async () => {
    const theirs = `${story} My registration is [Insert Rego].`;
    const real = buildDraft(getEntry("vic-generic")!, "judicial-review-application", theirs, {
      decisionDate: "2026-03-03",
      points: [{ heading: "Procedural fairness — you never got to have your say", text: "" }],
    }).body;
    expect(real).toContain("[Insert Rego]");
    expect(real).toContain("[the reasons the decision-maker gave, as their letter sets them out]");
    expect(real).toContain("[set out what happened that shows this]");
    const send = async (out: string) => {
      __setModelForTests(model(out));
      return (
        await POST(
          new NextRequest("http://x/api/letter-polish", {
            method: "POST",
            headers: { "content-type": "application/json", "x-forwarded-for": "9.9.9.7" },
            body: JSON.stringify({ ...body, draft: real, theirWords: theirs }),
          }),
        )
      ).json();
    };
    const statement = `Grounds of review\n\nGround 1: I was not given a chance to respond\n${GOOD}`;
    expect((await send(statement)).status).toBe("answered");
    expect((await send(`${statement}\n\n[add the date you found out]`)).status).toBe("not-covered");
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

  // Measured live, 2026-11-01: seven marked grounds, refused twice for length under a flat 750.
  it("is allowed more words for more marked issues, and told the number", async () => {
    expect(caseMaxWords({ groundIds: ["a"], notes: {} })).toBe(900);
    expect(caseMaxWords({ groundIds: ["a", "b", "c", "d", "e", "f", "g"], notes: {} })).toBe(1480);
    expect(caseMaxWords({ groundIds: Array.from({ length: 12 }, (_, i) => `g${i}`), notes: {} })).toBe(1480);
    // The analysis's points, and the points it argues both ways, count as issues; a warning
    // block copied word for word is on top.
    expect(caseMaxWords({ groundIds: [], notes: {}, analysis: { points: [1, 2, 3, 4, 5] } })).toBe(1200);
    expect(caseMaxWords({ groundIds: [], notes: {}, analysis: { points: [], depth: [1, 2, 3, 4, 5, 6] } })).toBe(1340);
    const warning = SELF_WARNING_BLOCKS[0]!.text;
    expect(caseMaxWords({ groundIds: ["a"], notes: {} }, `To: x\n\n${warning}\n\nYours faithfully,`)).toBe(
      900 + warning.split(/\s+/).filter(Boolean).length,
    );
    let seen = "";
    __setModelForTests(async (call) => {
      seen = call.user;
      return model(letter(GOOD))(call);
    });
    await post();
    expect(seen).toMatch(/LENGTH: about 675 words/);
  });

  it("tells the second attempt what the route refused the first for", async () => {
    const users: string[] = [];
    let n = 0;
    __setModelForTests(async (call) => {
      users.push(call.user);
      return model(letter(n++ === 0 ? `${GOOD} Mr Hargreaves refused to listen.` : GOOD))(call);
    });
    const out = await post();
    expect(out.status).toBe("answered");
    expect(users).toHaveLength(2);
    expect(users[0]).not.toContain("Hargreaves");
    expect(users[1]).toContain("invented-name — Hargreaves");
  });

  it("lets the letter's own register through: a salutation, a Background heading, natural justice", async () => {
    __setModelForTests(
      model(letter(`Dear Sir or Madam, ${GOOD} This is a matter of Natural Justice.`).replace("I was not given", "Background\nI was not given")),
    );
    const out = await post();
    expect(out.gates ?? out.status).toBe("answered");
  });
});
