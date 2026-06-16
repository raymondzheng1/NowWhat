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
