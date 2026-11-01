import { describe, it, expect } from "vitest";
import { suggestEntry, classifyData } from "@/lib/data";
import { titleAsPhrase, titleAsNoun } from "@/lib/text/title";

/** The account reported from the live site, filed under "A Victorian government decision". */
const PARKING =
  "On 14 October 2026, my vehicle was parked in a designated on-street parking bay along " +
  "Batman Street, West Melbourne. At approximately 2:15 PM, an infringement notice was issued " +
  "by a parking enforcement officer for the alleged offence of parking for a period longer than " +
  "indicated. The parking control sign was obscured by foliage.";

describe("noticing when what someone wrote is a different kind of decision", () => {
  it("sees a parking infringement written under the generic Victorian page", () => {
    const s = suggestEntry(PARKING, "vic-generic");
    expect(s?.entryId).toBe("vic-fines");
    expect(s?.matched).toContain("infringement notice");
  });

  it("works across jurisdictions — a Centrelink story under a Victorian choice", () => {
    const s = suggestEntry(
      "Centrelink says I was overpaid and sent me a debt notice for my JobSeeker payments.",
      "vic-generic",
    );
    expect(s?.entryId).toBe("cth-centrelink");
  });

  it("stays quiet when they already picked the right one", () => {
    expect(suggestEntry(PARKING, "vic-fines")).toBeNull();
  });

  // The ways it must NOT fire. A wrong suggestion on someone's own account of their own
  // matter is worse than none, so the bar is plain evidence.
  it("never fires on one common word", () => {
    expect(suggestEntry("I'm fine, but the department refused my permit.", "vic-generic")).toBeNull();
  });

  it("never fires on nothing", () => {
    expect(suggestEntry("", "vic-generic")).toBeNull();
    expect(suggestEntry("   ", "vic-generic")).toBeNull();
  });

  it("never suggests a generic catch-all page", () => {
    const s = suggestEntry("A Victorian government decision that I disagree with.", "vic-fines");
    expect(s === null || !s.entryId.endsWith("-generic")).toBe(true);
  });

  it("does not move someone whose own choice fits their words at least as well", () => {
    // A renting story that mentions a fine in passing: they picked renting, renting wins.
    const text =
      "My landlord gave me a notice to vacate after I complained about repairs. I also got a parking fine.";
    expect(suggestEntry(text, "vic-renting")).toBeNull();
  });

  it("leaves classifyData's behaviour exactly as it was", () => {
    expect(classifyData(PARKING, "Vic").entryId).toBe("vic-fines");
    expect(classifyData("nothing recognisable here", "Vic").isFallback).toBe(true);
  });
});

// Found by the end-to-end QA: each of these used to fire, and each was wrong.
describe("the suggestion stays quiet on weak evidence", () => {
  it("a body's name alone is not a kind of decision", () => {
    expect(suggestEntry("The local council refused my planning permit.", "vic-generic")).toBeNull();
    expect(suggestEntry("Victoria Police and the local council both wrote to me.", "vic-generic")).toBeNull();
  });

  it("words match whole, not as prefixes", () => {
    expect(suggestEntry("The finest enforcement of the rules, they said.", "vic-generic")).toBeNull();
  });

  // Was "only someone who chose a general page is asked". The owner's ruling, 2026-11-02: a
  // story plainly about another decision is recognised from any page (see the bar below).
  it("a story wholly about another decision is recognised from a specific page too", () => {
    expect(
      suggestEntry("Centrelink sent me a debt notice for my JobSeeker payments.", "vic-renting")?.entryId,
    ).toBe("cth-centrelink");
  });

  it("a match in their own jurisdiction wins", () => {
    const text =
      "I got an infringement notice for parking. Centrelink also sent me a debt notice for my JobSeeker payments.";
    expect(suggestEntry(text, "vic-generic")?.entryId).toBe("vic-fines");
  });

  it("a decision term with the body's name is enough", () => {
    expect(suggestEntry("The local council gave me a parking fine.", "vic-generic")?.entryId).toBe("vic-fines");
  });
});

describe("a title inside a sentence", () => {
  // Reported from the live site: "This note is about a a victorian government decision".
  it("never doubles the article", () => {
    expect(titleAsPhrase("A Victorian government decision")).toBe("a Victorian government decision");
    expect(titleAsPhrase("A Commonwealth government decision")).toBe("a Commonwealth government decision");
  });

  it("keeps names capitalised and lowercases ordinary words", () => {
    expect(titleAsPhrase("Centrelink / social-security decision or debt")).toBe(
      "a Centrelink / social-security decision or debt",
    );
    expect(titleAsPhrase("Fine or infringement notice")).toBe("a fine or infringement notice");
    expect(titleAsPhrase("Public or social housing decision")).toBe("a public or social housing decision");
    expect(titleAsPhrase("Renting decision (notice to vacate, rental dispute)")).toBe(
      "a renting decision (notice to vacate, rental dispute)",
    );
  });

  it("uses 'an' before a vowel", () => {
    expect(titleAsPhrase("Australian Government decision")).toBe("an Australian Government decision");
    expect(titleAsPhrase("Infringement notice")).toBe("an infringement notice");
  });

  it("gives the bare noun when no article is wanted", () => {
    expect(titleAsNoun("A Victorian government decision")).toBe("Victorian government decision");
  });
});

// Reported live, 2026-11-02: the parking account filed under renting, or under public housing,
// was never recognised as a fine, because only the general pages were ever checked.
describe("a fine written up under a specific page", () => {
  it("is recognised under renting and under public housing", () => {
    expect(suggestEntry(PARKING, "vic-renting")?.entryId).toBe("vic-fines");
    expect(suggestEntry(PARKING, "vic-public-housing")?.entryId).toBe("vic-fines");
  });

  it("but a renting story that mentions a fine in passing stays where they put it", () => {
    const RENT =
      "My landlord gave me a notice to vacate because he says I owe two months rent. The rental " +
      "provider did not do the repairs, so I stopped paying. I also got a parking fine last week.";
    expect(suggestEntry(RENT, "vic-renting")).toBeNull();
  });
});
