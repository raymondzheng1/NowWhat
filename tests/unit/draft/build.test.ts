import { describe, it, expect } from "vitest";
import { buildDraft } from "@/lib/draft/build";
import { checkNoAdvice, checkNoAiMentions } from "@/lib/safety/no-advice";
import { verifiedEntry } from "@/tests/fixtures/entries";
import { getEntry } from "@/lib/corpus/index";

describe("draft builder", () => {
  it("reasons-request and review-application templates contain no advice or AI mentions (drift defence)", () => {
    for (const kind of ["reasons-request", "review-application"] as const) {
      const d = buildDraft(verifiedEntry, kind);
      expect(checkNoAdvice(d.body).ok).toBe(true);
      expect(checkNoAiMentions(d.body).ok).toBe(true);
    }
  });

  it("includes a real provision and never leaks a VERIFY placeholder", () => {
    const withReal = buildDraft(verifiedEntry, "reasons-request");
    expect(withReal.body).toContain("s 1 Test Act 2000");

    const generic = getEntry("vic-generic")!; // real provision (VCAT Act s 45)
    const fromGeneric = buildDraft(generic, "reasons-request");
    expect(fromGeneric.body).toContain("s 45");
    expect(fromGeneric.body.toLowerCase()).not.toContain("verify");
  });

  it("review-application lists the evidence checklist", () => {
    const d = buildDraft(verifiedEntry, "review-application");
    expect(d.body).toContain("your records");
  });

  it("is written in the person's own voice (no 'you should')", () => {
    const d = buildDraft(verifiedEntry, "review-application");
    expect(d.body).toContain("I am writing");
  });
});
