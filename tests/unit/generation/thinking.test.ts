import { describe, it, expect } from "vitest";
import { THINKING_OFF_OK } from "@/lib/generation/anthropic";
import { MODELS } from "@/lib/config";

/**
 * Thinking ate the analysis's token budget and cut it off mid-sentence (live, 2026-11-01).
 * It is turned off only where the model accepts that; newer models 400 on it.
 */
describe("which models have thinking turned off", () => {
  it("the configured models do", () => {
    expect(THINKING_OFF_OK.test("claude-sonnet-5")).toBe(true);
    expect(THINKING_OFF_OK.test(MODELS.small)).toBe(true);
  });
  // Haiku 5.5 accepts "disabled" at its default effort (the API reference, checked 2026-11-02):
  // only xhigh/max refuse it, and this app never sets either.
  it("Haiku 5.5, the small model, has it off", () => {
    expect(THINKING_OFF_OK.test("claude-haiku-5-5")).toBe(true);
  });
  it("models that reject 'disabled' never get it", () => {
    for (const m of ["claude-opus-5-5", "claude-sonnet-5-5", "claude-fable-5-1", "claude-fable-5"]) {
      expect(THINKING_OFF_OK.test(m)).toBe(false);
    }
  });
});

// The efficiency review, 2026-11-02: Sonnet 5 was metered at $3/$15 (official $2/$10) and cached
// tokens were not metered at all.
describe("the meter", () => {
  it("prices Sonnet 5 as the price list does, and counts cache writes and reads", async () => {
    const { estimateCostUsd } = await import("@/lib/cost/guard");
    expect(estimateCostUsd("claude-sonnet-5", 1_000_000, 0)).toBeCloseTo(2);
    expect(estimateCostUsd("claude-sonnet-5", 0, 1_000_000)).toBeCloseTo(10);
    expect(estimateCostUsd("claude-sonnet-5", 0, 0, { write: 1_000_000, read: 1_000_000 })).toBeCloseTo(2.7);
  });
  it("meters an unknown model dearer than any it knows", async () => {
    const { estimateCostUsd } = await import("@/lib/cost/guard");
    expect(estimateCostUsd("claude-some-new-model", 1_000_000, 1_000_000)).toBeGreaterThan(
      estimateCostUsd("claude-opus-5", 1_000_000, 1_000_000),
    );
  });
});
