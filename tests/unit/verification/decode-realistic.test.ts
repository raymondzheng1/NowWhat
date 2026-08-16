import { describe, it, expect } from "vitest";
import { verifyOutput } from "@/lib/verification/verify";
import { getEntry } from "@/lib/corpus/index";

/**
 * Regression guard for a production outage that the existing tests could not see.
 *
 * The /api/decode integration test injects a hand-written model response that is already
 * verifier-clean, so it proves the route never echoes the letter but says nothing about
 * whether a REAL decode survives our own gates. In production every decode of a plain
 * Centrelink letter came back "not-covered" while the suite stayed green.
 *
 * These cases run realistic decode output — the shape a model actually returns, assembled
 * the way lib/generation/runner.ts assembles it for verification
 * (`[whatItIs, whatItMeans, ...options].join(" ")`) — through the real verifier. A gate that
 * rejects honest, grounded, non-advisory text is a bug in the gate, not in the answer.
 */
describe("verifier: a realistic decode must not be rejected", () => {
  const entry = getEntry("cth-centrelink")!;

  function verifyDecode(d: {
    whatItIs: string;
    whatItMeans: string;
    options: string[];
    sources: string[];
  }) {
    return verifyOutput({
      text: [d.whatItIs, d.whatItMeans, ...d.options].filter(Boolean).join(" "),
      declaredSources: d.sources,
      entry,
    });
  }

  it("passes a plain, grounded, non-advisory Centrelink debt decode", () => {
    const verdict = verifyDecode({
      whatItIs: "This is a letter from Services Australia about a Centrelink debt.",
      whatItMeans:
        "It says you were paid more than you were entitled to, and that the extra amount is now owed. You can ask for the decision to be looked at again.",
      options: [
        "You can ask Services Australia for the reasons in writing.",
        "You can ask Services Australia to look at the decision again. This is called an internal review, and it is done by an Authorised Review Officer.",
        "If you still disagree after the internal review, you can apply to the Administrative Review Tribunal.",
        "A free service can help you at any stage.",
      ],
      sources: [
        "Services Australia — Reviews and appeals — servicesaustralia.gov.au",
        "Administrative Review Tribunal — art.gov.au",
      ],
    });
    expect(verdict.failures.map((f) => `${f.gate}: ${f.detail}`)).toEqual([]);
    expect(verdict.ok).toBe(true);
  });

  it("passes when the letter's own figures are restated (they are the person's facts, not our legal claims)", () => {
    const verdict = verifyDecode({
      whatItIs: "This is a letter from Services Australia about a Centrelink debt.",
      whatItMeans:
        "It says you were overpaid $4,182.60 between 1 July 2025 and 30 June 2026, and that repayments start on 1 September 2026.",
      options: [
        "You can ask Services Australia to look at the decision again.",
        "A free service can help you check the amount.",
      ],
      sources: ["Services Australia — Reviews and appeals — servicesaustralia.gov.au"],
    });
    expect(verdict.failures.map((f) => `${f.gate}: ${f.detail}`)).toEqual([]);
    expect(verdict.ok).toBe(true);
  });

  it("still rejects advice, prediction and an invented time limit", () => {
    const verdict = verifyDecode({
      whatItIs: "This is a Centrelink debt letter.",
      whatItMeans: "You should appeal — you will probably win.",
      options: ["Apply to the tribunal within 28 days."],
      sources: ["Services Australia — Reviews and appeals — servicesaustralia.gov.au"],
    });
    expect(verdict.ok).toBe(false);
  });
});

/**
 * The measurement behind the fix. A decode that mirrors a government letter's register
 * scores far above the ceiling purely on sentence length; the same content in short
 * sentences scores near the bottom of the scale. Guards the prompt rule that produced it.
 */
describe("readability: sentence length is the lever", () => {
  const NAMES = "Services Australia Administrative Review Tribunal Authorised Review Officer";

  it("long bureaucratic sentences blow the ceiling, short ones clear it easily", async () => {
    const { fkGrade } = await import("@/lib/text/readability");
    const long =
      "Services Australia has decided that you received more JobSeeker Payment than you were entitled to during the period covered by the letter, because income from employment was not declared, and the difference is now recorded as a debt that you are required to repay. If you remain dissatisfied following the internal review, you may apply to the Administrative Review Tribunal for an independent external review of the decision.";
    const short =
      "This is a notice from Services Australia. It says you have a Centrelink debt. It says you were paid more than you should have been. The extra amount is now a debt you owe. You can ask them to look at it again. You can ask for the reasons in writing. You can ask for an internal review. An Authorised Review Officer does that review.";
    expect(fkGrade(long)!).toBeGreaterThan(11);
    expect(fkGrade(short)!).toBeLessThan(9);
  });

  it("the mandatory body names alone do not blow the ceiling", async () => {
    const { fkGrade } = await import("@/lib/text/readability");
    // Every agency and tribunal we must name, in short sentences, still reads simply.
    const text = `You can contact ${NAMES.split(" ").slice(0, 2).join(" ")}. You can ask for an internal review. An Authorised Review Officer does it. You can then go to the Administrative Review Tribunal. A free service can help you.`;
    expect(fkGrade(text)!).toBeLessThan(11);
  });
});
