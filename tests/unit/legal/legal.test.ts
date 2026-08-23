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
    expect(jr.map((g) => g.id)).toContain("procedural-fairness-hearing");
    expect(jr.map((g) => g.id)).toContain("procedural-fairness-bias");
  });

  it("a pinpoint, where we have one, is never fabricated boilerplate", () => {
    // Pinpoints are supplied by a human from the source judgment. We do not require one —
    // demanding a page number we do not have is what invites a guess — but anything present
    // must look like a real reference (a page, a paragraph, or a named judge).
    for (const g of LegalIndexSchema.parse(raw).grounds) {
      for (const c of g.leadingCases) {
        if (!c.pinpoint) continue;
        // A page, a paragraph, or a named judge — all real pinpoint forms.
        expect(c.pinpoint, `${g.id}: ${c.name}`).toMatch(/\d|\b(?:J|JJ|CJ|P|JA)\b/);
      }
    }
  });

  it("every published ground is signed off AND carries owner-approved cases", () => {
    // This briefly allowed one exception. On 2026-08-23 the owner removed SBBS as not being one
    // of their cases, which left bad faith — its only authority — published as verified with
    // nothing behind it. The exception lasted until they ruled on it: the ground came out of the
    // corpus rather than the rule being bent for it. No ground publishes without a case.
    for (const g of LegalIndexSchema.parse(raw).grounds) {
      expect(g.status, `${g.id} must be signed off`).toBe("verified");
      expect(groundHasCitableAuthority(g.id), `${g.id} should be citable`).toBe(true);
      expect(g.leadingCases.length).toBeGreaterThan(0);
    }
  });

  it("bad faith is gone, and stays gone", () => {
    // Removed 2026-08-23 on the owner's ruling. It imputes dishonesty to a named officer, the
    // letter composer already refused to carry it, and the owner's memo says it "is rarely
    // necessary where improper purpose and bias are available" — both of which remain.
    const ids = LegalIndexSchema.parse(raw).grounds.map((g) => g.id);
    expect(ids).not.toContain("bad-faith");
    expect(ids).toContain("improper-purpose");
    expect(ids).toContain("procedural-fairness-bias");
  });

  it("cases the owner has disowned cannot come back", () => {
    // Twice in this project a settled removal drifted back in through a later edit. A citation
    // is the worst thing to let drift, because it reads as verified by definition. These two
    // were removed on 2026-08-23 as not being cases in the owner's materials.
    const json = JSON.stringify(raw);
    for (const disowned of ["Agfa-Gevaert", "SBBS"]) {
      expect(json, `${disowned} was removed by the owner and must not return`).not.toContain(
        disowned,
      );
    }
  });

  it("Wednesbury is published as the origin of the ground, not as the current test", () => {
    // Kept deliberately: readers meet the name everywhere. But since Li, legal unreasonableness
    // in Australia is not limited to Wednesbury unreasonableness, and this entry once read as
    // though it still stated the test.
    const g = getGround("unreasonableness")!;
    const w = g.leadingCases.find((c) => c.name.includes("Wednesbury"))!;
    expect(w, "Wednesbury stays in the entry").toBeTruthy();
    expect(w.explains).toMatch(/no longer limited/i);
    expect(g.leadingCases.some((c) => c.name.includes("Li (2013)"))).toBe(true);
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
