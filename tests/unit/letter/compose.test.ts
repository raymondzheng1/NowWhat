import { describe, it, expect } from "vitest";
import { composeLetter, inMyVoice, LETTER_GROUND_HEADINGS, LAWYER_NOTE_ONLY } from "@/lib/letter/compose";
import { getEntry } from "@/lib/corpus/index";
import messages from "@/lib/i18n/messages/en.json";

const entry = getEntry("cth-centrelink")!;
const L = messages.letter as unknown as Record<string, string>;

function compose(answers: Record<string, string>, groundIds: string[]) {
  return composeLetter({
    entry,
    kind: "judicial-review-application",
    account: { answers, groundIds },
    groundHeading: (id) => (id === "procedural-fairness-hearing" ? "Procedural fairness — you never got to have your say" : undefined),
  });
}

describe("the document is the person's account, and every point they marked", () => {
  it("writing nothing still produces the document they would have had before", () => {
    const out = compose({}, []);
    expect(out.body.length).toBeGreaterThan(100);
    expect(out.body).not.toContain(L.groundsLead);
  });

  it("puts their own words under each point they marked", () => {
    const out = compose(
      { "q-story": "They cut my payment with no warning.", "g-procedural-fairness-hearing": "Nobody rang me or wrote to me first." },
      ["procedural-fairness-hearing"],
    );
    expect(out.body).toContain("They cut my payment with no warning.");
    expect(out.body).toContain("Ground 1: Procedural fairness — you never got to have your say\nNobody rang me or wrote to me first.");
  });

  it("a ground not on this page is left out, and nothing says the document is incomplete", () => {
    const out = compose({ "g-improper-purpose": "ignored" }, ["improper-purpose"]);
    expect(out.body).not.toContain(L.otherConcerns);
    expect(out.body).not.toContain("ignored");
  });

  it("closes properly — the account goes above the sign-off", () => {
    const out = compose({ "q-story": "MY ACCOUNT HERE" }, []);
    expect(out.body.indexOf("MY ACCOUNT HERE")).toBeLessThan(out.body.lastIndexOf("Signed:"));
  });
});

describe("which grounds may carry a heading", () => {
  it("only the six that a person could say from their own knowledge", () => {
    expect(Object.keys(LETTER_GROUND_HEADINGS).sort()).toEqual(
      [
        "inflexible-policy",
        "invalid-delegation",
        "irrelevant-considerations",
        "no-evidence",
        "procedural-fairness-hearing",
        "relevant-considerations",
      ].sort(),
    );
  });

  it("bias and improper purpose never appear — they impute a state of mind", () => {
    // Bad faith was the third of these until the owner removed the ground on 2026-08-23.
    for (const id of ["procedural-fairness-bias", "improper-purpose"]) {
      expect(LETTER_GROUND_HEADINGS[id]).toBeUndefined();
    }
  });

  it("no heading names a legal test, standard, power or duty", () => {
    const banned = /\b(unlawful|invalid|breach|duty|jurisdiction|unreasonable|procedural fairness|natural justice|ultra vires|power to)\b/i;
    for (const key of Object.values(LETTER_GROUND_HEADINGS)) {
      expect(L[key], key).toBeTruthy();
      expect(L[key]!, key).not.toMatch(banned);
    }
  });

  it("every heading is written in the first person, as something that happened", () => {
    for (const key of Object.values(LETTER_GROUND_HEADINGS)) {
      expect(L[key]!, key).toMatch(/^(I |The )/);
    }
    expect(LAWYER_NOTE_ONLY.has("invalid-delegation")).toBe(true);
  });
});

describe("the person's account appears in the letter once", () => {
  // Reported from the live site: a full page of someone's account appeared twice, word for
  // word — once as the letter's reasons, then again under "What happened?". It read as a
  // paste gone wrong, in a letter going to an agency over their name.
  const STORY = "My car was parked in a bay on Batman Street and the sign was hidden by a tree.";
  const count = (hay: string, needle: string) => hay.split(needle).length - 1;

  for (const kind of [
    "merits-review-application",
    "internal-review-request",
    "court-election-enquiry",
  ] as const) {
    it(`does not repeat it (${kind})`, () => {
      const out = composeLetter({
        entry,
        kind,
        account: { answers: { "q-story": STORY }, groundIds: [] },
        groundHeading: () => undefined,
      });
      expect(count(out.body, STORY)).toBe(1);
    });
  }

});

// A criterion is written to the person; as a heading in their own document it is in theirs.
describe("a criterion as a heading in their document", () => {
  it("is put in the first person, with no full stop", () => {
    expect(inMyVoice("The tribunal decides whether the rules were applied correctly to your situation.")).toBe(
      "The tribunal decides whether the rules were applied correctly to my situation",
    );
    expect(inMyVoice("Whether you are a fit and proper person.")).toBe("Whether I am a fit and proper person");
    // Only whole words change.
    expect(inMyVoice("The youth allowance rules.")).toBe("The youth allowance rules");
  });
});

// The quality review, 2026-11-02: criteria read as descriptions of the tribunal, not reasons.
describe("a criterion as a reason's heading", () => {
  it("keeps the question it asks, in their voice", async () => {
    const { criterionHeading } = await import("@/lib/letter/compose");
    expect(criterionHeading("The tribunal decides whether the rules were applied correctly to your situation.")).toBe(
      "Whether the rules were applied correctly to my situation",
    );
    expect(criterionHeading("Where there is a debt, it decides whether the debt is owed and how much it is.")).toBe(
      "Whether the debt is owed and how much it is",
    );
    expect(criterionHeading("The grounds include a mistake of identity, and a decision that was contrary to law.")).toBe(
      "A mistake of identity, and a decision that was contrary to law",
    );
    expect(
      criterionHeading("For an eviction, VCAT also decides whether it is reasonable and proportionate to make you leave. It weighs the impact on you."),
    ).toBe("Whether it is reasonable and proportionate to make me leave");
  });
});

// The quality review, 2026-11-02: a council's parking notice named "Fines Victoria" as respondent.
describe("a decision type with several decision-makers", () => {
  it("leaves the respondent and addressee as a blank", async () => {
    const { buildDraft } = await import("@/lib/draft/build");
    const jr = buildDraft(getEntry("vic-fines")!, "judicial-review-application").body;
    expect(jr).toMatch(/^Respondent: \[the agency or council that made the decision\]$/m);
    const ir = buildDraft(getEntry("vic-fines")!, "internal-review-request").body;
    expect(ir).toMatch(/^To: \[the agency or council that made the decision\]$/m);
    // One body under two names is still named.
    expect(buildDraft(getEntry("cth-centrelink")!, "internal-review-request").body).toMatch(/^To: Services Australia$/m);
  });
});
