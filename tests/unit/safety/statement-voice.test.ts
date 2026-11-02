import { describe, it, expect } from "vitest";
import { checkStatementVoice } from "@/lib/safety/no-advice";
import { numberWordsToDigits } from "@/lib/text/numbers";
import { periodsAreTheirs } from "@/lib/grounds/match";
import { checkNoTimeLimitClaim } from "@/lib/verification/own-words";

// Found by the quality review, 2026-11-02: the advice and prediction gates were all written in
// the second person, so a first-person statement could concede or predict and pass them all.
describe("the person's own statement concedes nothing and predicts nothing", () => {
  for (const bad of [
    "I accept the tribunal can consider conduct beyond convictions.", // live, 2026-11-01
    "I concede that the GP note exists.",
    "I acknowledge the notice was clear.",
    "I will succeed on this ground.",
    "My case is bound to succeed.",
    "This ground is made out on the facts.",
    "The court will set aside the decision.",
  ]) {
    it(`refuses: ${bad}`, () => {
      expect(checkStatementVoice(bad).ok).toBe(false);
    });
  }

  for (const good of [
    "I ask the court to set aside the decision and send it back to be decided again according to law.",
    "It may be said the sign was visible. But the photos show the branches covered it.",
    "I was not given a chance to answer the complaint.",
    "I accepted the offer of a meeting, but nobody came.", // a past event, not a concession
  ]) {
    it(`allows: ${good}`, () => {
      expect(checkStatementVoice(good).ok).toBe(true);
    });
  }
});

// Found by the quality review, 2026-11-02: every time gate needed digits, so "sixty days" passed.
describe("a period written in words is a period", () => {
  it("reads number words as digits", () => {
    expect(numberWordsToDigits("sixty days, twenty-eight days, twenty eight days, fourteen days")).toBe(
      "60 days, 28 days, 28 days, 14 days",
    );
    expect(numberWordsToDigits("someone, anyone, often")).toBe("someone, anyone, often");
  });

  it("a period they did not give is refused, in words or digits", () => {
    expect(periodsAreTheirs("I have sixty days to apply.", "They cancelled my permit.")).toBe(false);
    expect(periodsAreTheirs("I have 60 days to apply.", "They cancelled my permit.")).toBe(false);
    // Theirs, however either side wrote it.
    expect(periodsAreTheirs("They gave me fourteen days.", "They gave me 14 days to reply.")).toBe(true);
  });

  it("an entitlement to time is refused in words too", () => {
    expect(checkNoTimeLimitClaim(["I have twenty-eight days to apply."])).toBe(false);
  });
});
