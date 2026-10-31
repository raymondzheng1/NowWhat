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

  // THE GAP THIS CLOSES, and the test that found it was written for something else.
  //
  // Every pattern in this group read FORWARDS — "satisfies the element" — so the same
  // judgment written the natural way round walked through all four of them. The per-criterion
  // analysis is where it surfaced, because "this criterion is satisfied" is the obvious
  // sentence to write there, but it was open on the elements the whole time.
  it("rejects the same judgment written the other way round", () => {
    expect(checkNoScore("This criterion is satisfied on your facts.").ok).toBe(false);
    expect(checkNoScore("The element of notice is satisfied here.").ok).toBe(false);
    expect(checkNoScore("Your ground is made out.").ok).toBe(false);
    expect(checkNoScore("That part of the test has been met.").ok).toBe(false);
    expect(checkNoScore("These criteria are established by what you sent.").ok).toBe(false);
  });

  // A criterion is now a noun this gate watches, and the paths that have criteria are the
  // ones most people take.
  it("rejects a criterion being called met, satisfied or made out", () => {
    expect(checkNoScore("What you sent satisfies the criterion.").ok).toBe(false);
    expect(checkNoScore("This meets each criterion.").ok).toBe(false);
    expect(checkNoScore("Your account establishes this criterion.").ok).toBe(false);
  });

  // The carve-out, and it is in lawyer-signed corpus copy: "If a ground is made out, the
  // court can set the decision aside" states what a court can do, in general, for anyone.
  // It is not a judgment about the person reading it, and a gate that rejected it would be
  // refusing the law itself.
  it("still allows the law stated in general terms", () => {
    expect(checkNoScore("If a ground is made out, the court can set the decision aside.").ok).toBe(true);
    expect(checkNoScore("A criterion is met when the Act says it is.").ok).toBe(true);
  });

  it("accepts neutral 'relates to' phrasing", () => {
    expect(checkNoScore("What you described relates to element 1; there is nothing yet on element 2.").ok).toBe(true);
    expect(checkNoScore("These grounds may be relevant; a free legal service can help you decide.").ok).toBe(true);
  });
});
