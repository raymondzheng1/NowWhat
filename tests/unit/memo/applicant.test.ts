import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { forApplicant } from "@/lib/memo/applicant";

// The owner, 2026-11-01: the in-depth analysis states the law of "the applicant", not "you".
describe("the rule material, said of the applicant", () => {
  it.each([
    [
      "You need to point to a 'ground of review' — a specific legal error in how the decision was made.",
      "The applicant needs to point to a 'ground of review' — a specific legal error in how the decision was made.",
    ],
    ["You usually need to be a person affected by the decision (standing).", "The applicant usually needs to be a person affected by the decision (standing)."],
    ["If it goes to a hearing, you explain your side and give your evidence.", "If it goes to a hearing, the applicant explains their side and gives their evidence."],
    ["The reason you were given changed when you asked about it.", "The reason the applicant was given changed when they asked about it."],
    ["Nobody asked you to explain your side of it.", "Nobody asked the applicant to explain their side of it."],
    ["Many schemes let you ask the department to look again.", "Many schemes let the applicant ask the department to look again."],
    ["The court cannot make a new decision for you.", "The court cannot make a new decision for the applicant."],
  ])("%s", (from, to) => expect(forApplicant(from)).toBe(to));

  it("leaves no 'you' in any rule the in-depth analysis prints", () => {
    const idx = JSON.parse(readFileSync("corpus/legal/index.json", "utf8"));
    const texts: string[] = [];
    const take = (v: unknown) => [v].flat().forEach((s) => typeof s === "string" && texts.push(s));
    for (const p of idx.processes ?? []) for (const k of ["whatItIs", "canApply", "whatHappens", "remedies", "limits", "goodToKnow"]) take(p[k]);
    for (const g of idx.grounds ?? []) {
      for (const k of ["oneLine", "test", "whatItIsNot", "whatRelates"]) take(g[k]);
      for (const e of g.elements ?? []) take(e.name);
      for (const c of g.leadingCases ?? []) take(c.explains);
    }
    for (const c of idx.concepts ?? []) for (const k of ["keyPoints", "whatItMeans", "whatItIsNot"]) take(c[k]);
    expect(texts.length).toBeGreaterThan(50);
    expect(texts.map(forApplicant).filter((s) => /\byou(r|rs|rself)?\b/i.test(s))).toEqual([]);
  });
});
