import { describe, it, expect } from "vitest";
import { verifyOutput } from "@/lib/verification/verify";
import { getEntry } from "@/lib/corpus/index";

/**
 * The analysis may restate what the PERSON said — an Act they named, a figure from their own
 * life, an officer's words in quotes — and what our corpus HANDED it. It was refused on every
 * realistic account because the allow-list knew only the decode entry (the judicial-review
 * benchmark, Ms Anand's cat-breeding case). Advice in our own voice is still refused.
 */
const entry = getEntry("vic-generic")!;
const source = entry.sources[0]!;
const account =
  'The council officer told me "you should never be allowed to breed cats again". ' +
  "They relied on the Animal Welfare Act 2002. I have bred cats for 15 years.";

function gatesFor(text: string, extra: { accountText?: string; groundedText?: string } = {}) {
  return verifyOutput({ text, declaredSources: [source], entry, ...extra }).failures.map((f) => f.gate);
}

describe("their own words are theirs", () => {
  it("an officer's words, quoted and in their account, are not our advice", () => {
    const text = 'The officer said "you should never be allowed to breed cats again".';
    expect(gatesFor(text)).toContain("no-advice");
    expect(gatesFor(text, { accountText: account })).not.toContain("no-advice");
  });

  it("advice in our own voice beside the quote is still refused", () => {
    const text = 'The officer said "you should never be allowed to breed cats again". You should apply to VCAT.';
    expect(gatesFor(text, { accountText: account })).toContain("no-advice");
  });

  it("a quote they never wrote is still checked", () => {
    const text = 'The officer said "you should appeal this".';
    expect(gatesFor(text, { accountText: account })).toContain("no-advice");
  });

  // Writing to "you", the analysis reports the officer's post in second person. Not verbatim,
  // so the quote allowance missed it — but it says who said it, in words they wrote.
  it("reported speech from their account, attributed, is not our advice", () => {
    const acct =
      'He posted that "people who put profit before animals, like the Lotus Cattery operator, should never be allowed to breed animals in this city".';
    const text = "Mr Boyle posted that you should never be allowed to breed animals in this city.";
    expect(gatesFor(text)).toContain("no-advice");
    expect(gatesFor(text, { accountText: acct })).not.toContain("no-advice");
  });

  it("an unattributed 'you should', or one in words they never wrote, is still advice", () => {
    const acct = "He posted that I should never be allowed to breed animals in this city.";
    expect(gatesFor("You should never be allowed to breed animals in this city.", { accountText: acct })).toContain("no-advice");
    expect(gatesFor("He said you should apply to the court quickly.", { accountText: acct })).toContain("no-advice");
  });

  it("an Act they named may be repeated", () => {
    const text = "You say the council relied on the Animal Welfare Act 2002.";
    expect(gatesFor(text)).toContain("no-out-of-corpus-citation");
    expect(gatesFor(text, { accountText: account })).not.toContain("no-out-of-corpus-citation");
  });

  it("a figure from their own life is not a deadline", () => {
    const text = "You have bred cats for 15 years.";
    expect(gatesFor(text)).toContain("no-fabricated-deadline");
    expect(gatesFor(text, { accountText: account })).not.toContain("no-fabricated-deadline");
  });

  it("a figure from neither is still refused", () => {
    expect(gatesFor("You have 21 days to apply.", { accountText: account })).toContain("no-fabricated-deadline");
  });
});

describe("what our corpus handed it is grounded", () => {
  const given = "TIME LIMIT: Under Order 56 an application must be filed within 60 days.";
  it("a figure from the verified rule it was given passes", () => {
    const text = "The court rule allows 60 days.";
    expect(gatesFor(text)).toContain("no-fabricated-deadline");
    expect(gatesFor(text, { groundedText: given })).not.toContain("no-fabricated-deadline");
  });
});
