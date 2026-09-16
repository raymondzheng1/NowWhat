import { describe, it, expect } from "vitest";
import { checkLetterFidelity } from "@/lib/letter/fidelity";
import { buildDraft } from "@/lib/draft/build";
import { verifiedEntry } from "@/tests/fixtures/entries";

/**
 * The letter-polish gate, added 2026-09-16 when the drafts began to be rewritten by a model.
 *
 * A polished letter goes to a government office OVER THE PERSON'S NAME. If a review officer
 * asks "what makes you say that?", they must be able to answer — and they cannot defend a
 * sentence they did not write. The existing letter task forbids the model to add so much as
 * an adverb to their account; polishing loosens that for OUR framing sentences only, and
 * this gate is what makes that distinction real rather than a hope expressed in a prompt.
 */
const DRAFT = buildDraft(verifiedEntry, "internal-review-request", "They cut it off in March.");
const THEIRS = "They cut it off in March.";

describe("a polished letter keeps every blank the person still has to fill", () => {
  it("passes a rewrite that keeps them all", () => {
    // Same letter, different words around the same brackets.
    const ok = DRAFT.body.replace(
      "I am writing to ask you to review the decision described above.",
      "I am writing to request a review of the decision described above.",
    );
    expect(checkLetterFidelity(DRAFT.body, THEIRS, ok)).toEqual([]);
  });

  it("rejects a rewrite that drops one", () => {
    // A dropped "[Your name]" is a letter posted unsigned, and the person would not notice:
    // the whole point of the highlight is that they see what is still to do.
    // One of the two, deliberately: "[Your name]" is in the header AND the sign-off, and a
    // gate that only asked "is it present anywhere?" would wave this through.
    const dropped = DRAFT.body.replace("[Your name]", "");
    const bad = checkLetterFidelity(DRAFT.body, THEIRS, dropped);
    expect(bad.map((f) => f.gate)).toContain("placeholder-dropped");
  });

  it("rejects a rewrite that invents one", () => {
    // A new blank is a field the person never agreed to disclose, presented as required.
    const added = DRAFT.body.replace("Thank you for your help.", "My reference is [your customer number]. Thank you for your help.");
    const bad = checkLetterFidelity(DRAFT.body, THEIRS, added);
    expect(bad.map((f) => f.gate)).toContain("placeholder-invented");
  });

  it("rejects a rewrite that answers one", () => {
    // Filling a blank is inventing the fact it was there to collect.
    const answered = DRAFT.body.replace("[Your name]", "Jane Smith");
    const bad = checkLetterFidelity(DRAFT.body, THEIRS, answered);
    expect(bad.map((f) => f.gate)).toContain("placeholder-dropped");
  });
});

describe("a polished letter states no figure that was not already there", () => {
  it("rejects an invented date", () => {
    // The most damaging kind of invention in a letter about a decision, and the kind a model
    // is most likely to supply helpfully: a specific date where the person was vague.
    const bad = checkLetterFidelity(
      DRAFT.body,
      THEIRS,
      DRAFT.body.replace("Thank you for your help.", "I first wrote to you on 14 April. Thank you for your help."),
    );
    expect(bad.map((f) => f.gate)).toContain("invented-figure");
    expect(bad.find((f) => f.gate === "invented-figure")!.detail).toBe("14");
  });

  it("rejects an invented amount", () => {
    const bad = checkLetterFidelity(
      DRAFT.body,
      THEIRS,
      DRAFT.body.replace("Thank you for your help.", "The debt is $2,400. Thank you for your help."),
    );
    expect(bad.map((f) => f.gate)).toContain("invented-figure");
  });

  it("allows a figure the person themselves gave", () => {
    // Their own number is theirs to state. Rejecting it would mean the polished letter could
    // never repeat what they actually told us.
    const theirs = "They raised a debt of 2400 dollars in March.";
    const ok = DRAFT.body.replace("Thank you for your help.", "They raised a debt of 2400 dollars. Thank you for your help.");
    expect(checkLetterFidelity(DRAFT.body, theirs, ok)).toEqual([]);
  });

  it("allows a figure that was already in the draft", () => {
    const withNum = `${DRAFT.body}\nReference 12345.`;
    const ok = `${withNum}\nI repeat: reference 12345.`;
    expect(checkLetterFidelity(withNum, "", ok)).toEqual([]);
  });

  it("reports each invented figure once", () => {
    const bad = checkLetterFidelity(
      DRAFT.body,
      THEIRS,
      DRAFT.body.replace("Thank you for your help.", "See 99. And again 99, and 99."),
    );
    expect(bad.filter((f) => f.gate === "invented-figure")).toHaveLength(1);
  });
});

describe("a polished letter is still a letter", () => {
  for (const [needle, what] of [
    ["Yours faithfully", "sign-off"],
    ["Re:", "subject line"],
    ["To:", "addressee"],
  ] as const) {
    it(`rejects a rewrite that loses the ${what}`, () => {
      // A "more professional" rewrite that drops these has produced a nicer paragraph and a
      // worse letter — and an unsigned one cannot be acted on at all.
      const bad = checkLetterFidelity(DRAFT.body, THEIRS, DRAFT.body.replace(needle, ""));
      expect(bad.map((f) => f.gate)).toContain("not-a-letter");
      expect(bad.find((f) => f.gate === "not-a-letter")!.detail).toBe(what);
    });
  }

  it("passes the untouched draft, so an honest no-op is never rejected", () => {
    // If this failed, every safe rewrite would be thrown away and nobody would ever see one.
    expect(checkLetterFidelity(DRAFT.body, THEIRS, DRAFT.body)).toEqual([]);
  });
});
