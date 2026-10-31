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
      expect(d.body).toContain(SELF_WARNING_MERITS);
    });
  }

  it("the other letters still go to the agency that decided", () => {
    const d = buildDraft(getEntry("vic-generic")!, "internal-review-request");
    expect(d.body).toMatch(/^To: Victorian government department/m);
    expect(d.body).not.toContain(SELF_WARNING_MERITS);
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
