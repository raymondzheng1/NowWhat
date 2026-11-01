import { describe, it, expect } from "vitest";
import { buildDraft } from "@/lib/draft/build";
import { composeLetter, LETTER_GROUND_HEADINGS } from "@/lib/letter/compose";
import { SELF_WARNING_MERITS } from "@/lib/draft/warnings";
import { getEntry } from "@/lib/corpus/index";
import messages from "@/lib/i18n/messages/en.json";

const L = messages.letter as unknown as Record<string, string>;

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

  it("judicial review: no '[name the ground]' blank once their own points are listed", () => {
    const id = Object.keys(LETTER_GROUND_HEADINGS)[0]!;
    const out = composeLetter({
      entry: getEntry("vic-generic")!,
      kind: "judicial-review-application",
      account: { answers: { [`g-${id}`]: "They never let me reply to the complaint." }, groundIds: [id] },
      headingFor: (k) => L[k]!,
      groundsLead: L.groundsLead!,
      otherConcerns: L.otherConcerns!,
      universal: [],
    });
    expect(out.body).toContain("They never let me reply to the complaint.");
    expect(out.body).not.toContain("[name the ground");
  });

  it("judicial review with nothing marked keeps the blank", () => {
    const d = buildDraft(getEntry("vic-generic")!, "judicial-review-application");
    expect(d.body).toContain("[name the ground");
  });
});

/**
 * The owner's parking review, 2026-11-01: every fact said twice — once as the reasons, then
 * again under "What I ask you to consider" — and both headed sections printed after "Thank you
 * for your help", as if the letter had already ended.
 */
describe("the internal-review letter says each thing once, before it closes", () => {
  const story =
    "The main parking control sign was heavily covered by overgrown foliage from a nearby street tree, making the time-limit panel unreadable. The signpost itself was turned about 45 degrees away from the road.";
  const compose = (answers: Record<string, string>) =>
    composeLetter({
      entry: getEntry("vic-generic")!,
      kind: "internal-review-request",
      account: { answers: { "q-story": story, ...answers }, groundIds: [] },
      headingFor: (k) => L[k]!,
      groundsLead: L.groundsLead!,
      otherConcerns: L.otherConcerns!,
      universal: [
        { id: "q-story", label: "What happened?" },
        { id: "q-internal", label: L.internalHeading! },
        { id: "q-criteria", label: L.criteriaHeading! },
      ],
    }).body;

  it("a note that repeats the account keeps only what is new", () => {
    const body = compose({
      "q-criteria":
        "the sign is not clear. The main parking control sign was heavily covered by overgrown foliage from a nearby street tree, making the time-limit panel unreadable.\n\nThe signpost itself was turned about 45 degrees away from the road.",
    });
    expect(body.split("overgrown foliage").length - 1).toBe(1);
    expect(body.split("45 degrees").length - 1).toBe(1);
    expect(body).toContain(`${L.criteriaHeading}\nThe sign is not clear.`);
  });

  // Measured live, 2026-11-01: loose-word matching deleted ten of twelve reworded note sentences.
  it("a note that makes the account's point in other words is kept", () => {
    const note = "The street tree foliage covered the panel, so the time-limit was unreadable from the road.";
    const body = compose({ "q-criteria": note });
    expect(body).toContain(note);
  });

  it("a note with nothing new is left out, heading and all", () => {
    const body = compose({ "q-criteria": "The signpost itself was turned about 45 degrees away from the road." });
    expect(body).not.toContain(L.criteriaHeading!);
  });

  it("their headed points come before the close, never after 'Thank you'", () => {
    const body = compose({ "q-internal": "the fine should be withdrawn." });
    const at = body.indexOf(L.internalHeading!);
    expect(at).toBeGreaterThan(body.indexOf("My reasons are as follows."));
    expect(at).toBeLessThan(body.indexOf("I would be grateful if you would confirm"));
    expect(at).toBeLessThan(body.indexOf("Thank you for your help."));
    expect(body).toContain("The fine should be withdrawn.");
  });

  it("judicial review: the grounds sit under 'set out below', before the request and the thanks", () => {
    const id = Object.keys(LETTER_GROUND_HEADINGS)[0]!;
    const body = composeLetter({
      entry: getEntry("vic-generic")!,
      kind: "judicial-review-application",
      account: { answers: { [`g-${id}`]: "They never let me reply." }, groundIds: [id] },
      headingFor: (k) => L[k]!,
      groundsLead: L.groundsLead!,
      otherConcerns: L.otherConcerns!,
      universal: [],
    }).body;
    const at = body.indexOf("They never let me reply.");
    expect(at).toBeGreaterThan(body.indexOf("set out below"));
    expect(at).toBeLessThan(body.indexOf("I ask the court to set aside"));
  });
});
