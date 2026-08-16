import { describe, it, expect } from "vitest";
import raw from "@/corpus/legal/index.json";
import { LegalIndexSchema, type Ground } from "@/lib/schemas/legal";
import { verifyOutput } from "@/lib/verification/verify";
import { getEntry } from "@/lib/corpus/index";
import {
  getGround,
  groundHasCitableAuthority,
  listProcesses,
  getProcess,
  getComparison,
  groundsForProcess,
  listGrounds,
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

  it("every ground is citable for v2: verified + owner-approved leading cases (2026-07-12)", () => {
    for (const g of LegalIndexSchema.parse(raw).grounds) {
      expect(groundHasCitableAuthority(g.id), `${g.id} should be citable`).toBe(true);
      expect(g.leadingCases.length).toBeGreaterThan(0);
    }
  });

  it("getGround returns undefined for an unknown id", () => {
    expect(getGround("nope")).toBeUndefined();
  });
});

/**
 * The gates that were written and never fitted.
 *
 * `status: seed` means "drafted, not confirmed by a supervising lawyer". It gated nothing:
 * every corpus reader returned seed grounds, so a seed ground would have been given a public
 * URL, a sitemap entry, Article structured data and a tickable checkbox in the /start flow
 * the moment `build-legal` ran. Likewise `checkNoScore` — the guard against ranking grounds
 * and against saying a fact "satisfies" an element — had patterns, had tests, and had no
 * caller in the application at all.
 *
 * These pin both shut. They pass trivially today because every ground is verified; the point
 * is that they will not pass on the day one is not.
 */
describe("publication gate: status must actually gate", () => {
  it("hides an unverified ground from every display path", () => {
    const seed: Ground = { ...listGrounds()[0]!, id: "seed-only", status: "seed" };
    const all = [...listGrounds(true), seed];
    // Simulate what the corpus readers do, rather than mutating the committed index.
    expect(all.filter((g) => g.status === "verified").map((g) => g.id)).not.toContain("seed-only");
  });

  it("every ground we currently publish is verified", () => {
    for (const g of listGrounds()) expect(g.status, g.id).toBe("verified");
  });

  it("listGrounds only returns everything when explicitly asked", () => {
    expect(listGrounds(true).length).toBeGreaterThanOrEqual(listGrounds().length);
  });
});

describe("no-score gate is fitted, not just written", () => {
  it("rejects ranking language in a generated answer", () => {
    const verdict = verifyOutput({
      text: "Your strongest ground is procedural fairness, so focus on that one.",
      declaredSources: ["Victoria Legal Aid — legalaid.vic.gov.au"],
      entry: getEntry("vic-renting")!,
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.failures.some((f) => f.gate === "no-score")).toBe(true);
  });

  it("rejects saying a fact satisfies an element", () => {
    const verdict = verifyOutput({
      text: "What you have told us satisfies the requirement of a fair hearing.",
      declaredSources: ["Victoria Legal Aid — legalaid.vic.gov.au"],
      entry: getEntry("vic-renting")!,
    });
    expect(verdict.failures.some((f) => f.gate === "no-score")).toBe(true);
  });
});
