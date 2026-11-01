import { describe, it, expect } from "vitest";
import { helpForPlace, namesOtherState } from "@/lib/help/elsewhere";
import { NATIONAL_HELP } from "@/lib/tripwire";

// Measured live, 2026-11-01: a New South Wales fine was handed Fines Victoria and VLA.
describe("a matter from another state gets the national finders", () => {
  it("names another state in words or in capitals", () => {
    for (const t of ["I got a parking fine in Sydney", "a NSW fine", "Queensland council refused", "I live in the ACT"]) {
      expect(namesOtherState(t)).toBe(true);
    }
  });

  it("is not fooled by 'the Act', 'was' or a Victorian place", () => {
    for (const t of ["Under the Act I was fined", "Werribee council in Victoria", "The fine says act now"]) {
      expect(namesOtherState(t)).toBe(false);
    }
  });

  it("swaps the help only when it is elsewhere", () => {
    const vic = [{ service: "Fines Victoria", who: "x", link: "https://www.fines.vic.gov.au" }];
    expect(helpForPlace("a fine in Brisbane", vic)).toEqual(NATIONAL_HELP);
    expect(helpForPlace("a fine in Melbourne", vic)).toEqual(vic);
  });
});
