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
  it("models that reject 'disabled' never get it", () => {
    for (const m of ["claude-opus-5-5", "claude-sonnet-5-5", "claude-fable-5-1", "claude-fable-5", "claude-haiku-5-5"]) {
      expect(THINKING_OFF_OK.test(m)).toBe(false);
    }
  });
});
