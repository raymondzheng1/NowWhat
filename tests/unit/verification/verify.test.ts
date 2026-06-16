import { describe, it, expect } from "vitest";
import { verifyOutput } from "@/lib/verification/verify";
import { verifiedEntry } from "@/tests/fixtures/entries";
import { getEntry } from "@/lib/corpus/index";

const seed = getEntry("centrelink-debt")!;

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

  it("rejects an unsourced/fabricated deadline (seed entry has no verified figure)", () => {
    const r = verifyOutput({
      text: "You must apply within 28 days of the decision.",
      declaredSources: [seed.sources[0]!],
      entry: seed,
    });
    expect(r.ok).toBe(false);
    expect(r.failures.some((f) => f.gate === "no-fabricated-deadline")).toBe(true);
  });

  it("accepts a deadline figure that the entry verifies", () => {
    const r = verifyOutput({
      text: "There is a time limit of 28 days for the internal review.",
      declaredSources: [verifiedEntry.sources[0]!],
      entry: verifiedEntry,
    });
    expect(r.ok).toBe(true);
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
