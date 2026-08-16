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
