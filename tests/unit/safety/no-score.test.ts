import { describe, it, expect } from "vitest";
import { checkNoScore } from "@/lib/safety/no-advice";

describe("no-score / relates-not-satisfies gate (Review Builder)", () => {
  it("rejects ranking the strength of grounds", () => {
    expect(checkNoScore("Your strongest ground is procedural fairness.").ok).toBe(false);
    expect(checkNoScore("Focus on the strongest argument.").ok).toBe(false);
    expect(checkNoScore("You have a good chance of success.").ok).toBe(false);
  });

  it("rejects 'this fact satisfies / meets / establishes the element'", () => {
    expect(checkNoScore("This satisfies element 1.").ok).toBe(false);
    expect(checkNoScore("That meets the test for unreasonableness.").ok).toBe(false);
    expect(checkNoScore("This establishes the ground.").ok).toBe(false);
    expect(checkNoScore("This is sufficient to establish the element.").ok).toBe(false);
  });

  it("accepts neutral 'relates to' phrasing", () => {
    expect(checkNoScore("What you described relates to element 1; there is nothing yet on element 2.").ok).toBe(true);
    expect(checkNoScore("These grounds may be relevant; a free legal service can help you decide.").ok).toBe(true);
  });
});
