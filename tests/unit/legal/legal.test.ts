import { describe, it, expect } from "vitest";
import raw from "@/corpus/legal/index.json";
import { LegalIndexSchema } from "@/lib/schemas/legal";
import {
  getGround,
  groundHasCitableAuthority,
  listProcesses,
  getProcess,
  getComparison,
  groundsForProcess,
} from "@/lib/legal/index";

describe("legal-substance corpus (Learn concept layer)", () => {
  it("validates against the Zod schema (authoritative gate, no drift)", () => {
    expect(() => LegalIndexSchema.parse(raw)).not.toThrow();
  });

  it("defines both review processes with bodies + remedies", () => {
    const ps = listProcesses();
    expect(ps.map((p) => p.id).sort()).toEqual(["judicial-review", "merits-review"]);
    for (const p of ps) {
      expect(p.bodies.length).toBeGreaterThan(0);
      expect(p.remedies.length).toBeGreaterThan(0);
      expect(p.whatItIs.length).toBeGreaterThan(0);
    }
  });

  it("merits review can substitute; judicial review cannot (the key distinction)", () => {
    expect(getProcess("merits-review")!.remedies.join(" ").toLowerCase()).toContain("substitute");
    expect(getProcess("judicial-review")!.limits.join(" ").toLowerCase()).toContain("cannot substitute");
  });

  it("the comparison has rows + a chooser with ≥2 options", () => {
    const c = getComparison();
    expect(c.rows.length).toBeGreaterThan(0);
    expect(c.chooser.options.length).toBeGreaterThanOrEqual(2);
  });

  it("every ground has plain-English fields + ≥1 'what relates' prompt + ≥1 element", () => {
    for (const g of LegalIndexSchema.parse(raw).grounds) {
      expect(g.oneLine.length).toBeGreaterThan(0);
      expect(g.whatItMeans.length).toBeGreaterThan(0);
      expect(g.plainExample.length).toBeGreaterThan(0);
      expect(g.whatRelates.length).toBeGreaterThan(0);
      expect(g.elements.length).toBeGreaterThan(0);
      for (const el of g.elements) expect(el.layPrompt.length).toBeGreaterThan(0);
    }
  });

  it("groundsForProcess returns the judicial-review grounds", () => {
    const jr = groundsForProcess("judicial-review");
    expect(jr.length).toBeGreaterThanOrEqual(9);
    expect(jr.map((g) => g.id)).toContain("procedural-fairness");
  });

  it("any leading case carries a pinpoint (verifier binds every citation)", () => {
    for (const g of LegalIndexSchema.parse(raw).grounds) {
      for (const c of g.leadingCases) expect(c.pinpoint.length).toBeGreaterThan(0);
    }
  });

  it("seed grounds are not yet citable (v2 gated — generator degrades to help)", () => {
    expect(groundHasCitableAuthority("procedural-fairness")).toBe(false);
  });

  it("getGround returns undefined for an unknown id", () => {
    expect(getGround("nope")).toBeUndefined();
  });
});
