import { describe, it, expect, afterEach } from "vitest";
import { runOcr, ocrProvider } from "@/lib/intake/ocr";
import { __setVisionForTests, __setModelForTests } from "@/lib/generation/anthropic";

afterEach(() => {
  __setVisionForTests(null);
  __setModelForTests(null);
});

describe("OCR (in-memory, provider-pluggable)", () => {
  it("is disabled when no model or provider is configured", () => {
    expect(ocrProvider()).toBe("none");
  });

  it("defaults to the vision model when a model is configured", () => {
    __setModelForTests(async () => ({ text: "", inputTokens: 0, outputTokens: 0, model: "m" }));
    expect(ocrProvider()).toBe("anthropic");
  });

  it("respects OCR_PROVIDER=none even with a model configured", () => {
    __setModelForTests(async () => ({ text: "", inputTokens: 0, outputTokens: 0, model: "m" }));
    process.env.OCR_PROVIDER = "none";
    expect(ocrProvider()).toBe("none");
    delete process.env.OCR_PROVIDER;
  });

  it("transcribes an image to text in memory and reports token usage (for metering)", async () => {
    __setModelForTests(async () => ({ text: "", inputTokens: 0, outputTokens: 0, model: "m" }));
    __setVisionForTests(async (c) => ({
      text: "  NOTICE TO VACATE\nFrom your rental provider.  ",
      inputTokens: 820,
      outputTokens: 44,
      model: c.model,
    }));
    const r = await runOcr(new Uint8Array([137, 80, 78, 71]), "image/png");
    expect(r.available).toBe(true);
    expect(r.text).toContain("NOTICE TO VACATE");
    expect(r.text?.startsWith(" ")).toBe(false); // trimmed
    expect(r.inputTokens).toBe(820);
  });

  it("returns unreadable (not a crash) when the provider throws", async () => {
    __setModelForTests(async () => ({ text: "", inputTokens: 0, outputTokens: 0, model: "m" }));
    __setVisionForTests(async () => {
      throw new Error("vision down");
    });
    const r = await runOcr(new Uint8Array([1]), "image/png");
    expect(r.available).toBe(true);
    expect(r.text).toBe("");
  });
});
