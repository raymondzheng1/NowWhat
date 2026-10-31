import { describe, it, expect } from "vitest";
import { ruleForPath, officialSourceForPath } from "@/lib/deadline/rule";
import { getDataEntry } from "@/lib/data";

/**
 * A VCAT analysis showed only the Supreme Court's 60 and 30 days, and the Supreme Court as its
 * official source (the merits-review benchmark). Off the judicial-review path the court
 * sentences go; on it, the whole rule stays. The words that remain are the entry's own.
 */
describe("the time rule for the path being worked through", () => {
  for (const id of ["vic-generic", "vic-public-housing"]) {
    const e = getDataEntry(id)!;
    it(`${id}: the court part exists (if this fails, the rule's wording changed — re-check the split)`, () => {
      expect(e.deadlineRule).toContain("If you are looking at the Supreme Court instead");
    });
    it(`${id}: VCAT and internal review show no court figures`, () => {
      for (const p of ["merits-review", "internal-review"] as const) {
        const r = ruleForPath(e.deadlineRule, p);
        expect(r).not.toMatch(/60 days|30 days|Order 56|Supreme Court/);
        expect(e.deadlineRule.startsWith(r)).toBe(true); // verbatim prefix, nothing reworded
      }
    });
    it(`${id}: judicial review keeps the whole rule`, () => {
      expect(ruleForPath(e.deadlineRule, "judicial-review")).toBe(e.deadlineRule);
    });
  }

  it("an entry with no court part is unchanged on every path", () => {
    const e = getDataEntry("vic-renting")!;
    expect(ruleForPath(e.deadlineRule, "merits-review")).toBe(e.deadlineRule);
  });
});

describe("the official link for the path", () => {
  it("VCAT, not the Supreme Court, on a general Victorian merits review", () => {
    expect(officialSourceForPath(getDataEntry("vic-generic")!, "merits-review")).toBe("https://www.vcat.vic.gov.au");
  });
  it("the Supreme Court's exact URL on judicial review", () => {
    expect(officialSourceForPath(getDataEntry("vic-generic")!, "judicial-review")).toBe(
      getDataEntry("vic-generic")!.sourceUrl,
    );
  });
  it("no link rather than a wrong one when the avenue names no website", () => {
    expect(officialSourceForPath(getDataEntry("vic-generic")!, "internal-review")).toBeNull();
  });
  it("the entry's own link when the avenue is on the same site", () => {
    expect(officialSourceForPath(getDataEntry("vic-fines")!, "internal-review")).toBe(getDataEntry("vic-fines")!.sourceUrl);
  });
});
