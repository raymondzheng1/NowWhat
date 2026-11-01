import { describe, it, expect } from "vitest";
import { presentLetter, isHeadingLine } from "@/lib/letter/present";
import { SELF_WARNING_HEADING, SELF_WARNING_JUDICIAL_REVIEW } from "@/lib/draft/warnings";

const LETTER = [
  "[Your name]",
  "",
  "To: Services Australia",
  "",
  "Re: Concern about how a decision was made",
  "",
  SELF_WARNING_HEADING,
  SELF_WARNING_JUDICIAL_REVIEW,
  "",
  "I am writing about the decision.",
  "",
  "Background",
  "I claimed the pension in June 2026.",
  "",
  "A report I sent in was not mentioned",
  "Dr Marchetti's report is not in the letter.",
  "",
  "Yours faithfully,",
  "[Your name]",
].join("\n");

describe("a letter as shown and copied", () => {
  it("takes the note to yourself out of the letter and hands it back to show above it", () => {
    const { warnings, letter } = presentLetter(LETTER);
    expect(warnings).toEqual([SELF_WARNING_JUDICIAL_REVIEW]);
    expect(letter).not.toContain("NOTE TO YOURSELF");
    expect(letter).not.toContain("Judicial review is a court process");
    expect(letter).not.toMatch(/\n{3,}/);
  });

  it("puts a blank line after each heading, and nowhere else", () => {
    const { letter } = presentLetter(LETTER);
    expect(letter).toContain("Background\n\nI claimed the pension");
    expect(letter).toContain("A report I sent in was not mentioned\n\nDr Marchetti");
    expect(letter).toContain("To: Services Australia\n\nRe:");
    expect(letter).toContain("Yours faithfully,\n[Your name]");
  });

  it("still finds the heading once the blank line is in, and adds no second one", () => {
    const { letter } = presentLetter(LETTER);
    const lines = letter.split("\n");
    expect(isHeadingLine(lines, lines.indexOf("Background"))).toBe(true);
    expect(presentLetter(letter).letter).toBe(letter);
  });

  it("does not take a labelled line, a blank or a sentence for a heading", () => {
    const lines = ["", "To: VCAT", "x", "", "[Your name]", "x", "", "I was not told.", "x"];
    expect(isHeadingLine(lines, 1)).toBe(false);
    expect(isHeadingLine(lines, 4)).toBe(false);
    expect(isHeadingLine(lines, 7)).toBe(false);
  });

  it("takes a numbered ground or reason for a heading, colon and all, but not a party line", () => {
    const lines = [
      "",
      "Ground 1: I was not given a chance to answer the complaint before the decision was made",
      "x",
      "",
      "Reason 2: The decision rests on a conviction I do not have",
      "x",
      "",
      "Applicant: [Your name]",
      "x",
    ];
    expect(isHeadingLine(lines, 1)).toBe(true);
    expect(isHeadingLine(lines, 4)).toBe(true);
    expect(isHeadingLine(lines, 7)).toBe(false);
  });

  it("leaves a letter with no note as it was, apart from the spacing", () => {
    const plain = "To: x\n\nRe: y\n\nI ask for a review.\n\nYours faithfully,\n[Your name]";
    expect(presentLetter(plain)).toEqual({ warnings: [], letter: plain });
  });
});
