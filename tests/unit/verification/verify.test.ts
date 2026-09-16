import { describe, it, expect } from "vitest";
import { verifyOutput } from "@/lib/verification/verify";
import { verifiedEntry } from "@/tests/fixtures/entries";
import { getEntry } from "@/lib/corpus/index";

const renting = getEntry("vic-renting")!;

describe("verifier — grounded-or-silent + info-not-advice", () => {
  it("passes a clean, grounded, advice-free answer", () => {
    const r = verifyOutput({
      text: "You may be able to ask Test Agency to review the decision. The review is free.",
      declaredSources: [verifiedEntry.sources[0]!],
      entry: verifiedEntry,
    });
    expect(r.ok).toBe(true);
  });

  it("rejects first-person advice", () => {
    const r = verifyOutput({
      text: "You should ask for a review.",
      declaredSources: [verifiedEntry.sources[0]!],
      entry: verifiedEntry,
    });
    expect(r.ok).toBe(false);
    expect(r.failures.some((f) => f.gate === "no-advice")).toBe(true);
  });

  it("rejects outcome prediction", () => {
    const r = verifyOutput({
      text: "If you apply you will win.",
      declaredSources: [verifiedEntry.sources[0]!],
      entry: verifiedEntry,
    });
    expect(r.ok).toBe(false);
    expect(r.failures.some((f) => f.gate === "no-advice")).toBe(true);
  });

  it("rejects a source not in the corpus entry (out-of-corpus citation)", () => {
    const r = verifyOutput({
      text: "You may be able to ask for a review.",
      declaredSources: ["Totally Made Up Source 2099"],
      entry: verifiedEntry,
    });
    expect(r.ok).toBe(false);
    expect(r.failures.some((f) => f.gate === "source-allowlist")).toBe(true);
  });

  it("rejects an in-text statute citation that isn't grounded", () => {
    const r = verifyOutput({
      text: "This is covered by section 999 of the Imaginary Powers Act 2099.",
      declaredSources: [verifiedEntry.sources[0]!],
      entry: verifiedEntry,
    });
    expect(r.ok).toBe(false);
    expect(r.failures.some((f) => f.gate === "no-out-of-corpus-citation")).toBe(true);
  });

  it("rejects a time figure not grounded in the entry (fabricated deadline)", () => {
    // vic-renting grounds 30 days; 99 days is not in the entry.
    const r = verifyOutput({
      text: "You must apply within 99 days of the notice.",
      declaredSources: [renting.sources[0]!],
      entry: renting,
    });
    expect(r.ok).toBe(false);
    expect(r.failures.some((f) => f.gate === "no-fabricated-deadline")).toBe(true);
  });

  it("accepts a time figure the entry grounds", () => {
    const r = verifyOutput({
      text: "You may have 30 days to challenge the notice to vacate.",
      declaredSources: [renting.sources[0]!],
      entry: renting,
    });
    expect(r.ok).toBe(true);
  });

  it("accepts VCAT in a Victorian matter but rejects an interstate tribunal", () => {
    const ok = verifyOutput({
      text: "You may be able to apply to VCAT to review the decision.",
      declaredSources: [renting.sources[0]!],
      entry: renting,
    });
    expect(ok.failures.some((f) => f.gate === "jurisdiction")).toBe(false);

    const bad = verifyOutput({
      text: "You may be able to apply to NCAT to review the decision.",
      declaredSources: [renting.sources[0]!],
      entry: renting,
    });
    expect(bad.failures.some((f) => f.gate === "jurisdiction")).toBe(true);
  });

  it("accepts a reworded/shortened real source (model paraphrase, same domain)", () => {
    // The model dropped a clause but kept the real consumer.vic.gov.au source.
    const r = verifyOutput({
      text: "You may be able to challenge the notice to vacate.",
      declaredSources: ["Consumer Affairs Victoria — Challenging a notice to vacate — consumer.vic.gov.au"],
      entry: renting,
    });
    expect(r.failures.some((f) => f.gate === "source-allowlist")).toBe(false);
  });

  it("rejects content with no source (provenance)", () => {
    const r = verifyOutput({
      text: "You may be able to ask for a review.",
      declaredSources: [],
      entry: verifiedEntry,
    });
    expect(r.ok).toBe(false);
    expect(r.failures.some((f) => f.gate === "source-binding")).toBe(true);
  });

  it("rejects a state tribunal in a Commonwealth matter (jurisdiction)", () => {
    const r = verifyOutput({
      text: "You may be able to apply to VCAT for a review.",
      declaredSources: [verifiedEntry.sources[0]!],
      entry: verifiedEntry,
    });
    expect(r.ok).toBe(false);
    expect(r.failures.some((f) => f.gate === "jurisdiction")).toBe(true);
  });
});

/**
 * `citesNothing`, added 2026-09-16 with the letter-polish task.
 *
 * Provenance exists because an ANSWER that states the law must say where the law came from.
 * A LETTER states none — it is the person telling an agency what happened and asking them to
 * look again — so demanding a citation would reject every honest draft, and the only way to
 * satisfy it would be to attach a source the letter does not rely on.
 */
describe("an output that asserts no law is not asked to cite one", () => {
  const letter = "I am writing to request a review of the decision described above. They cut it off in March.";

  it("fails source-binding without the flag", () => {
    // Proof the gate is real, so the pass below means something.
    const v = verifyOutput({ text: letter, declaredSources: [], entry: verifiedEntry });
    expect(v.ok).toBe(false);
    expect(v.failures.map((f) => f.gate)).toContain("source-binding");
  });

  it("passes with it", () => {
    const v = verifyOutput({ text: letter, declaredSources: [], entry: verifiedEntry, citesNothing: true });
    expect(v.failures.map((f) => f.gate)).not.toContain("source-binding");
  });

  it("turns off ONLY that gate — advice is still refused", () => {
    const v = verifyOutput({
      text: "You should apply for judicial review, and you will certainly win.",
      declaredSources: [],
      entry: verifiedEntry,
      citesNothing: true,
    });
    expect(v.ok).toBe(false);
    expect(v.failures.length).toBeGreaterThan(0);
    expect(v.failures.map((f) => f.gate)).not.toContain("source-binding");
  });

  it("and an out-of-corpus citation is still refused", () => {
    const v = verifyOutput({
      text: letter,
      declaredSources: ["Some Act 1999 nobody gave us"],
      entry: verifiedEntry,
      citesNothing: true,
    });
    expect(v.ok).toBe(false);
  });
});
