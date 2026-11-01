import { describe, it, expect } from "vitest";
import { buildDraft } from "@/lib/draft/build";
import { composeLetter } from "@/lib/letter/compose";
import { SELF_WARNING_MERITS } from "@/lib/draft/warnings";
import { getEntry } from "@/lib/corpus/index";

/**
 * The merits letter goes to the TRIBUNAL. It took `pathways[0]`, which is the tribunal only
 * for renting — Centrelink's went to the Authorised Review Officer, a general Victorian one to
 * "the decision-maker", housing's to the Housing Appeals Office. A person applying to a
 * tribunal posted it to the agency. Found by the end-to-end QA on every entry with a tribunal.
 */
describe("the merits letter is addressed to the tribunal", () => {
  const cases: [string, RegExp][] = [
    ["vic-generic", /^To: VCAT/m],
    ["vic-public-housing", /^To: VCAT/m],
    ["vic-renting", /^To: VCAT/m],
    ["cth-centrelink", /^To: Administrative Review Tribunal/m],
    ["cth-generic", /^To: Administrative Review Tribunal/m],
  ];
  for (const [id, to] of cases) {
    it(`${id}: To: the tribunal, reviewed by the tribunal, with the form warning`, () => {
      const d = buildDraft(getEntry(id)!, "merits-review-application");
      expect(d.body).toMatch(to);
      const reviewer = /considered again by ([^.]+)\./.exec(d.body)?.[1] ?? "";
      expect(reviewer).toMatch(/VCAT|Tribunal/);
      // An acronym stands alone; a name in words takes "the".
      expect(reviewer).toMatch(/^(VCAT|the Administrative Review Tribunal)/);
      expect(d.body).toContain(SELF_WARNING_MERITS);
    });
  }

  it("the other letters still go to the agency that decided", () => {
    const d = buildDraft(getEntry("cth-centrelink")!, "internal-review-request");
    expect(d.body).toMatch(/^To: Services Australia/m);
    expect(d.body).not.toContain(SELF_WARNING_MERITS);
  });

  // A catch-all entry does not know who decided: "Victorian government department" headed a
  // letter about a council's decision (the judicial-review benchmark).
  it("a catch-all entry leaves the addressee as a blank to fill in", () => {
    for (const id of ["vic-generic", "cth-generic"]) {
      const d = buildDraft(getEntry(id)!, "internal-review-request");
      expect(d.body).toMatch(/^To: \[the agency or council that made the decision\]/m);
    }
  });

  // The owner's ruling, 2026-11-01: judicial review drafts a statement of the case for the
  // court, with the decision-maker as the other party, not a letter asking it to look again.
  it("judicial review is a statement to the court, with the decision-maker as respondent", () => {
    for (const id of ["vic-generic", "cth-generic"]) {
      const d = buildDraft(getEntry(id)!, "judicial-review-application");
      expect(d.body).toMatch(/^To: \[the court that will hear your application/m);
      expect(d.body).toMatch(/^Applicant: \[Your name\]$/m);
      expect(d.body).toMatch(/^Respondent: \[the agency or council that made the decision\]$/m);
      expect(d.body).toContain("I ask the court to set aside the decision and send it back to be decided again according to law.");
      expect(d.body).toMatch(/^Signed: \[Your name\]\nApplicant$/m);
      expect(d.body).not.toContain("Yours faithfully");
    }
  });

  it("a letter keeps its paragraph breaks", () => {
    const d = buildDraft(getEntry("vic-generic")!, "internal-review-request");
    expect(d.body).toMatch(/Re: Request for an internal review\n\nReference number/);
    expect(d.body).not.toMatch(/\n{3,}/);
  });
});

describe("the letter uses what the person already told us", () => {
  it("the decision date fills the date blank", () => {
    const d = buildDraft(getEntry("vic-generic")!, "internal-review-request", undefined, {
      decisionDate: "2026-10-14",
    });
    expect(d.body).toContain("Date of the decision: 14 October 2026");
    expect(d.body).not.toContain("[date on your letter]");
  });

  it("no date given: the blank stays", () => {
    const d = buildDraft(getEntry("vic-generic")!, "internal-review-request");
    expect(d.body).toContain("[date on your letter]");
  });

  it("judicial review lists every marked ground, numbered, with what they wrote under it", () => {
    const out = composeLetter({
      entry: getEntry("vic-generic")!,
      kind: "judicial-review-application",
      account: {
        answers: { "g-error-of-law": "They applied the wrong standard for a sign." },
        groundIds: ["error-of-law", "subjective-jurisdictional-fact"],
      },
      groundHeading: (id) => ({ "error-of-law": "Error of law — they got the law wrong", "subjective-jurisdictional-fact": "A state of mind the power depended on — they had to be satisfied of something first" })[id],
    });
    expect(out.body).toContain("Grounds of review\nGround 1: Error of law — they got the law wrong\nThey applied the wrong standard for a sign.");
    // Marked and not written about: still listed, with a blank to fill in. Nothing is held back.
    expect(out.body).toContain("Ground 2: A state of mind the power depended on — they had to be satisfied of something first\n[set out what happened that shows this]");
    expect(out.body).not.toContain("[name each ground");
  });

  it("judicial review with nothing marked keeps the blank", () => {
    const d = buildDraft(getEntry("vic-generic")!, "judicial-review-application");
    expect(d.body).toContain("[name each ground");
  });
});

/**
 * The owner's rulings, 2026-11-01 and -02: the document is the final one, set out as a case.
 * Nothing is said twice, nothing is held back "for a human legal service", and nobody is made to
 * announce "I am not a lawyer".
 */
describe("the review document is set out as a case, and says each thing once", () => {
  const story =
    "The main parking control sign was heavily covered by overgrown foliage from a nearby street tree, making the time-limit panel unreadable. The signpost itself was turned about 45 degrees away from the road.";
  const compose = (kind: "internal-review-request" | "merits-review-application", answers: Record<string, string>, criteria: { heading: string; text: string }[] = []) =>
    composeLetter({
      entry: getEntry("vic-generic")!,
      kind,
      account: { answers: { "q-story": story, ...answers }, groundIds: [] },
      groundHeading: () => undefined,
      criteria,
    }).body;

  it("has the four sections, in order, for every review path", () => {
    for (const kind of ["internal-review-request", "merits-review-application"] as const) {
      const body = compose(kind, {});
      const at = (x: string) => body.indexOf(x);
      expect(at("The decision and its reasons")).toBeGreaterThan(0);
      expect(at("Summary of the facts")).toBeGreaterThan(at("The decision and its reasons"));
      expect(body.split("overgrown foliage").length - 1).toBe(1);
    }
    // With only their account, the account IS their reasons: no empty reasons section.
    expect(compose("internal-review-request", {})).toMatch(/What I ask for\n.*\n\nSummary of the facts\n.*overgrown foliage/);
    expect(compose("internal-review-request", {})).not.toContain("Why the decision should be reviewed");
    // With a point they ticked, it has one.
    const pt = [{ heading: "The sign was not clear", text: "It was covered by a tree." }];
    expect(compose("internal-review-request", {}, pt)).toMatch(/Summary of the facts[\s\S]*Why the decision should be reviewed\nReason 1: The sign was not clear/);
    expect(compose("merits-review-application", {}, pt)).toMatch(/What I ask the tribunal to decide[\s\S]*Why the decision should be changed\nReason 1:/);
  });

  it("a note that repeats the account keeps only what is new", () => {
    const body = compose("internal-review-request", {}, [
      {
        heading: "The sign was not clear",
        text: "the sign is not clear. The main parking control sign was heavily covered by overgrown foliage from a nearby street tree, making the time-limit panel unreadable.\n\nThe signpost itself was turned about 45 degrees away from the road.",
      },
    ]);
    expect(body.split("overgrown foliage").length - 1).toBe(1);
    expect(body.split("45 degrees").length - 1).toBe(1);
    expect(body).toContain("Reason 1: The sign was not clear\nThe sign is not clear.");
  });

  // Measured live, 2026-11-01: loose-word matching deleted ten of twelve reworded note sentences.
  it("a note that makes the account's point in other words is kept", () => {
    const note = "The street tree foliage covered the panel, so the time-limit was unreadable from the road.";
    expect(compose("internal-review-request", {}, [{ heading: "The sign", text: note }])).toContain(note);
  });

  it("a note that only repeats the account is kept whole rather than leave a blank under the point", () => {
    const body = compose("internal-review-request", {}, [
      { heading: "The sign", text: "The signpost itself was turned about 45 degrees away from the road." },
    ]);
    expect(body).toContain("Reason 1: The sign\nThe signpost itself was turned about 45 degrees away from the road.");
  });

  it("their points come before the close, never after 'Thank you'", () => {
    const body = compose("internal-review-request", { "q-internal": "The fine should be withdrawn." });
    const at = body.indexOf("The fine should be withdrawn.");
    expect(at).toBeGreaterThan(body.indexOf("Why the decision should be reviewed"));
    expect(at).toBeLessThan(body.indexOf("I would be grateful if you would confirm"));
    expect(at).toBeLessThan(body.indexOf("Thank you for your help."));
  });

  it("never says 'I am not a lawyer', and never holds a point back for a legal service", () => {
    const body = composeLetter({
      entry: getEntry("vic-generic")!,
      kind: "judicial-review-application",
      account: { answers: { "q-story": story }, groundIds: ["invalid-delegation", "procedural-fairness-bias"] },
      groundHeading: (id) => id,
    }).body;
    expect(body).not.toMatch(/not a lawyer/i);
    expect(body).not.toMatch(/human legal service/i);
    expect(body).toContain("Ground 2: procedural-fairness-bias");
    // And the grounds come before the signature.
    expect(body.indexOf("Ground 1:")).toBeLessThan(body.indexOf("Signed:"));
  });
});
