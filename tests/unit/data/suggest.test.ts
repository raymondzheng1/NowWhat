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
