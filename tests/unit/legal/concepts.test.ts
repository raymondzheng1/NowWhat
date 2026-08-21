import { describe, it, expect } from "vitest";
import { listConcepts, getConcept, conceptsFor } from "@/lib/legal";
import { ConceptSchema } from "@/lib/schemas/legal";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The concept layer is the owner's decision-tree mind map: the justiciability gate, the two
 * federal routes, remedies, standing, and the two non-review avenues. These render as customer
 * content, so they carry the corpus' standing obligations.
 */
describe("concepts — the mind-map structural layer", () => {
  it("every mind-map node is present and validates", () => {
    const ids = listConcepts().map((c) => c.id).sort();
    expect(ids).toEqual([
      "adjr-or-common-law",
      "information-commissioner",
      "internal-review",
      "justiciability",
      "ombudsman",
      "remedies",
      "standing",
    ]);
    for (const c of listConcepts()) expect(() => ConceptSchema.parse(c)).not.toThrow();
  });

  it("every concept names a source — nothing renders ungrounded", () => {
    for (const c of listConcepts()) {
      expect(c.sources.length, c.id).toBeGreaterThan(0);
      expect(c.status, c.id).toBe("verified");
    }
  });

  it("no concept leaks a VERIFY placeholder into customer copy", () => {
    for (const c of listConcepts()) {
      const prose = [c.oneLine, c.whatItMeans, c.whatItIsNot, ...c.keyPoints,
        ...c.options.flatMap((o) => [o.whatItDoes, o.note])].join(" ");
      expect(prose, c.id).not.toContain("VERIFY");
    }
  });

  it("the two federal routes never surface for a Victorian decision", () => {
    // The ADJR/s39B split is Commonwealth-only. Offering it in Victoria would send someone
    // looking for an Act that does not govern their decision.
    const vic = conceptsFor("judicial-review", "Vic").map((c) => c.id);
    expect(vic).not.toContain("adjr-or-common-law");
    expect(conceptsFor("judicial-review", "Cth").map((c) => c.id)).toContain("adjr-or-common-law");
  });

  it("unscoped concepts reach both jurisdictions", () => {
    for (const j of ["Vic", "Cth"] as const) {
      expect(conceptsFor("judicial-review", j).map((c) => c.id)).toContain("remedies");
      expect(conceptsFor("merits-review", j).map((c) => c.id)).toContain("standing");
    }
  });

  it("the remedies node makes the substitution limit unmissable", () => {
    // Someone who goes to court expecting the outcome handed to them has misread the whole
    // path, and it is an expensive misreading. The point is repeated deliberately.
    const r = getConcept("remedies")!;
    const blob = [r.oneLine, r.whatItMeans, r.whatItIsNot, ...r.keyPoints].join(" ").toLowerCase();
    expect(blob).toContain("cannot");
    expect(blob).toMatch(/substitute|new (one|decision)|decide the matter itself/);
  });

  it("the Ombudsman node says it is free, and that it will not replace the decision", () => {
    const o = getConcept("ombudsman")!;
    const blob = [o.oneLine, o.whatItMeans, o.whatItIsNot, ...o.keyPoints].join(" ").toLowerCase();
    expect(blob).toContain("free");
    // "will not usually replace" rather than "cannot" — the sourced position is that its powers
    // are recommendatory, not that it is powerless.
    expect(blob).toMatch(/not usually replace|recommend/);
    expect(blob).toContain("not merits review");
  });

  it("the Ombudsman node carries the sorting contrast a reader can act on", () => {
    // "Is the decision wrong" vs "was I handled badly" lets someone pick the right door before
    // learning any vocabulary. It is the most useful sentence in the entry.
    const o = getConcept("ombudsman")!;
    const blob = [o.oneLine, ...o.keyPoints].join(" ").toLowerCase();
    expect(blob).toMatch(/handled (my matter|you) badly/);
  });

  it("internal review points at the decision letter and states no invented rule", () => {
    // Internal review is created by each scheme, so there is no general provision or period to
    // cite. The entry must send people to the letter rather than make one up.
    const c = getConcept("internal-review")!;
    const blob = [c.whatItMeans, c.whatItIsNot, ...c.keyPoints].join(" ").toLowerCase();
    expect(blob).toContain("letter");
    expect(blob).not.toMatch(/\d+\s*(days?|months?)/);
    expect(c.order).toBeLessThan(10);
  });

  it("Information Commissioner review is described as able to change the access decision", () => {
    // It is a form of external merits review on FOI decisions — affirm, vary, or set aside and
    // substitute — which is a real difference from the Ombudsman and was previously unstated.
    const c = getConcept("information-commissioner")!;
    const blob = [...c.keyPoints, ...c.options.map((o) => o.whatItDoes + " " + o.note)]
      .join(" ").toLowerCase();
    expect(blob).toMatch(/change the decision|set it aside/);
    // ...but scoped to the documents, not the decision that brought them here.
    expect(blob).toMatch(/does not review the original decision|about your documents/);
  });

  it("justiciability reassures rather than gates the ordinary applicant", () => {
    // Our readers face decisions made under a statute, which are squarely reviewable. A node
    // that opened with what courts refuse to touch would scare people off a path they have.
    const j = getConcept("justiciability")!;
    expect(j.whatItIsNot.toLowerCase()).toMatch(/not a hurdle|ordinary|reviewable|every day/);
  });

  it("the FOI half states no deadline or section number, because none is sourced", () => {
    const c = getConcept("information-commissioner")!;
    const foi = [c.keyPoints.join(" "), c.options.find((o) => /freedom/i.test(o.name))?.whatItDoes ?? "",
      c.options.find((o) => /freedom/i.test(o.name))?.note ?? ""].join(" ");
    expect(foi).not.toMatch(/\b\d+\s*(days?|months?)\b/i);
    expect(foi).not.toMatch(/\bs\s?\d+/);
  });

  it("concepts are wired into the copy gates", () => {
    // A new content type that no gate reads is how unchecked prose ships. This asserts the
    // wiring itself, not the result of any one run.
    const src = readFileSync(resolve(process.cwd(), "scripts/lib/copy-surfaces.mjs"), "utf8");
    expect(src).toContain("idx.concepts");
    expect(src).toContain("legal (concept");
  });
});
