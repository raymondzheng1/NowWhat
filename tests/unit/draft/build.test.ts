import { describe, it, expect } from "vitest";
import { buildDraft } from "@/lib/draft/build";
import { checkNoAdvice, checkNoAiMentions } from "@/lib/safety/no-advice";
import { verifiedEntry } from "@/tests/fixtures/entries";
import { getEntry } from "@/lib/corpus/index";

describe("draft builder", () => {
  it("reasons-request and review-application templates contain no advice or AI mentions (drift defence)", () => {
    for (const kind of ["reasons-request", "internal-review-request", "review-application"] as const) {
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

describe("merits vs judicial review drafts (each written to what that forum decides)", () => {
  const entry = verifiedEntry;

  it("the merits-review letter asks for the correct or preferable decision, on the facts", () => {
    const d = buildDraft(entry, "merits-review-application");
    expect(d.body).toContain("correct or");
    expect(d.body.toLowerCase()).toContain("afresh on the facts");
    expect(d.title.toLowerCase()).toContain("merits review");
    expect(d.filename).toContain("merits-review");
  });

  it("the judicial-review letter is about HOW the decision was made, and names a ground", () => {
    const d = buildDraft(entry, "judicial-review-application");
    const body = d.body.toLowerCase();
    expect(body).toContain("the way the");
    expect(body).toContain("name the ground");
    // It must not ask the court to remake the decision on the facts.
    expect(body).not.toContain("afresh on the facts");
    expect(d.filename).toContain("judicial-review");
  });

  it("the judicial-review letter warns that it is technical and points to free help first", () => {
    const body = buildDraft(entry, "judicial-review-application").body.toLowerCase();
    expect(body).toContain("free legal service");
    expect(body).toContain("technical");
    expect(body).toContain("not a court document");
  });

  it("the legacy 'review-application' kind still produces the merits-review letter", () => {
    expect(buildDraft(entry, "review-application").body).toEqual(
      buildDraft(entry, "merits-review-application").body,
    );
  });

  it("neither review letter gives advice or predicts an outcome", () => {
    for (const kind of ["merits-review-application", "judicial-review-application"] as const) {
      const body = buildDraft(entry, kind).body.toLowerCase();
      for (const banned of ["you should", "you will win", "we recommend", "guarantee"]) {
        expect(body, `${kind} / ${banned}`).not.toContain(banned);
      }
    }
  });
});

/**
 * Internal review. The letter that goes with the third path, added 2026-09-10 when internal
 * review stopped being half of the merits-review string and became a path of its own.
 *
 * The thing it must NOT do is borrow from either of the other two. An internal reviewer is
 * not a tribunal and not a court: our own corpus entry for the step says the rules are
 * different for every department, so there is no single answer about how it works. A letter
 * that asked for the "correct or preferable decision", or that named a ground of review,
 * would be asserting powers and tests nobody has confirmed this body has.
 */
describe("the internal-review letter asks for another look, and claims nothing else", () => {
  const entry = verifiedEntry;

  it("asks the decision-maker to look again, in the person's own voice", () => {
    const d = buildDraft(entry, "internal-review-request");
    expect(d.body).toContain("I am writing to ask you to look at the decision described above again.");
    expect(d.filename).toContain("internal-review");
    expect(d.title.toLowerCase()).toContain("internal review");
  });

  it("borrows neither a tribunal's test nor a court's grounds", () => {
    const body = buildDraft(entry, "internal-review-request").body.toLowerCase();
    expect(body, "that is what a tribunal decides").not.toContain("correct or");
    expect(body, "that is what a tribunal does").not.toContain("afresh on the facts");
    expect(body, "grounds of review belong to judicial review").not.toContain("name the ground");
    expect(body).not.toContain("tribunal");
  });

  it("asks what the time limit is for the next step, because this step may not pause it", () => {
    // Straight out of the corpus entry: an internal review "does not always pause the clock
    // for the next step". Someone who writes this letter and then waits can lose a tribunal
    // or a court they still had, so the letter asks the question for them.
    const body = buildDraft(entry, "internal-review-request").body;
    expect(body).toContain("time limit for any next step");
    expect(body).toContain("If an internal review is not available");
  });

  it("names no provision and no period — the data layer verifies neither for this step", () => {
    const body = buildDraft(entry, "internal-review-request").body;
    expect(body, "no time figure may be stated").not.toMatch(/\b\d+\s*(days?|weeks?|months?)\b/i);
    expect(body).not.toMatch(/\bs\s?\d+\b/);
    expect(body).not.toMatch(/\bAct\s+\d{4}\b/);
    expect(body.toLowerCase()).not.toContain("verify");
  });

  it("gives no advice and predicts nothing", () => {
    const body = buildDraft(entry, "internal-review-request").body;
    expect(checkNoAdvice(body).ok).toBe(true);
    expect(checkNoAiMentions(body).ok).toBe(true);
    for (const banned of ["you should", "you will win", "we recommend", "guarantee", "likely"]) {
      expect(body.toLowerCase(), banned).not.toContain(banned);
    }
  });
});
