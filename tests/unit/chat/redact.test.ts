import { describe, it, expect } from "vitest";
import { redactPii } from "@/lib/chat/redact";

describe("chat PII redaction", () => {
  it("removes card-length and TFN/Medicare-length digit runs", () => {
    expect(redactPii("my card is 4111 1111 1111 1111")).toContain("[number removed]");
    expect(redactPii("my card is 4111 1111 1111 1111")).not.toContain("4111");
    expect(redactPii("TFN 123456789")).toBe("TFN [number removed]");
  });

  it("preserves meaningful short numbers (dates, day counts)", () => {
    const t = "I got the notice on 8 June 2025 and have 30 days to act.";
    expect(redactPii(t)).toBe(t);
  });
});
