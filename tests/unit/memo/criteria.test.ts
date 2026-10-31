import { describe, it, expect } from "vitest";
import { withCriterionIds, answerableCriteria, isOrientation } from "@/lib/memo/criteria";
import { getDataEntry, listDataEntries } from "@/lib/data";

const housing = getDataEntry("vic-public-housing")!;
const fines = getDataEntry("vic-fines")!;

describe("a criterion's id comes from its own words", () => {
  it("is the same id every time for the same line", () => {
    const a = withCriterionIds(["The tribunal decides whether the debt is owed."])[0]!;
    const b = withCriterionIds(["The tribunal decides whether the debt is owed."])[0]!;
    expect(a.id).toBe(b.id);
  });

  it("is readable, so it can be copied back exactly", () => {
    const a = withCriterionIds(["The reviewing agency decides whether the fine should stand."])[0]!;
    expect(a.id).toMatch(/^c-[a-z0-9-]+$/);
    expect(a.id).toContain("reviewing");
    expect(a.id.length).toBeLessThanOrEqual(48);
  });

  // THE REASON IT IS NOT THE POSITION. The context and the memo build their criteria lists
  // separately. Position-derived ids would match whatever sat at that index — so a list one
  // line shorter would file every answer under the wrong criterion, silently and plausibly.
  // A text-derived id from a list that differs simply matches nothing, which is a visible
  // absence instead of a wrong attribution.
  it("does not depend on where the line sits in the list", () => {
    const line = "For an eviction, VCAT decides whether the notice to vacate is valid.";
    const first = withCriterionIds([line, "Something else entirely."])[0]!;
    const third = withCriterionIds(["A.", "B.", line])[2]!;
    expect(third.id).toBe(first.id);
  });

  it("gives two different lines two different ids", () => {
    const ids = withCriterionIds(housing.mrCriteria!).map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps identical lines apart with a counter", () => {
    const ids = withCriterionIds(["The same line.", "The same line."]).map((c) => c.id);
    expect(ids[0]).not.toBe(ids[1]);
    expect(new Set(ids).size).toBe(2);
  });

  it("still produces a usable id for a line with no words in it", () => {
    const ids = withCriterionIds(["— —", "...."]).map((c) => c.id);
    expect(ids.every((i) => i.length > 1)).toBe(true);
    expect(new Set(ids).size).toBe(2);
  });

  it("keeps the line itself alongside its id, unchanged", () => {
    const line = "  The agency decides whether the fine should stand.  ";
    expect(withCriterionIds([line])[0]!.text).toBe(line);
  });

  it("gives every real criterion in the data layer a distinct id", () => {
    for (const e of listDataEntries()) {
      for (const list of [e.mrCriteria ?? [], e.irCriteria ?? [], e.courtCriteria ?? []]) {
        const ids = withCriterionIds(list).map((c) => c.id);
        expect(new Set(ids).size, `${e.id}: ${ids.join(",")}`).toBe(ids.length);
      }
    }
  });
});

describe("a routing line is not a criterion anyone can answer", () => {
  // "These are two different paths, and which one applies depends on the decision" says
  // which body to go to, not what either body decides. Nothing in anyone's account speaks
  // to it, and asking for an application against it invites an answer about nothing.
  it("treats a line in BOTH lists as orientation", () => {
    const both = (housing.mrCriteria ?? []).filter((c) => (housing.irCriteria ?? []).includes(c));
    expect(both.length).toBeGreaterThan(0);
    for (const c of both) expect(isOrientation(housing, c)).toBe(true);
  });

  it("keeps the lines that say what the body decides", () => {
    const answerable = answerableCriteria(housing, housing.mrCriteria!);
    expect(answerable.length).toBeGreaterThan(0);
    expect(answerable.some((c) => /VCAT decides/i.test(c))).toBe(true);
    expect(answerable.some((c) => /two different paths/i.test(c))).toBe(false);
  });

  it("leaves a scheme with only one list entirely answerable", () => {
    // A Victorian fine has internal-review grounds and no merits list at all, so nothing
    // in it can appear in both — every line is something the agency actually decides.
    expect(answerableCriteria(fines, fines.irCriteria!)).toEqual(fines.irCriteria);
    expect(answerableCriteria(fines, fines.courtCriteria!)).toEqual(fines.courtCriteria);
  });
});
