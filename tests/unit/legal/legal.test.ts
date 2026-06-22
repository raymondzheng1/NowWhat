import { describe, it, expect } from "vitest";
import raw from "@/corpus/legal/index.json";
import { LegalIndexSchema } from "@/lib/schemas/legal";
import { getGround, groundHasCitableAuthority } from "@/lib/legal/index";

describe("legal-substance corpus", () => {
  it("validates against the Zod schema (authoritative gate, no drift)", () => {
    expect(() => LegalIndexSchema.parse(raw)).not.toThrow();
  });

  it("every ground has a test and ≥1 element with a lay prompt", () => {
    for (const g of LegalIndexSchema.parse(raw).grounds) {
      expect(g.test.length).toBeGreaterThan(0);
      expect(g.elements.length).toBeGreaterThan(0);
      for (const el of g.elements) expect(el.layPrompt.length).toBeGreaterThan(0);
    }
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
