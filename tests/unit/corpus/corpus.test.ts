import { describe, it, expect } from "vitest";
import raw from "@/corpus/index.json";
import { CorpusIndexSchema } from "@/lib/schemas/corpus";
import {
  classify,
  classifyForDecode,
  getEntry,
  getCorpus,
  listEntries,
  guessJurisdiction,
  FALLBACK_ENTRY_ID,
} from "@/lib/corpus/index";

describe("corpus index", () => {
  it("validates against the Zod schema (authoritative gate, no drift)", () => {
    expect(() => CorpusIndexSchema.parse(raw)).not.toThrow();
  });

  it("classifies a renting letter to the renting entry", () => {
    const r = classify("I got a notice to vacate from my landlord");
    expect(r?.entryId).toBe("vic-renting");
  });

  it("classifies a fine to the fines entry", () => {
    const r = classify("I got a parking infringement notice / fine");
    expect(r?.entryId).toBe("vic-fines");
  });

  it("classifies a public-housing decision to the housing entry", () => {
    const r = classify("the housing office did not approve my public housing application");
    expect(r?.entryId).toBe("vic-public-housing");
  });

  it("routes an unrecognised Victorian decision to the generic fallback", () => {
    const r = classifyForDecode("I disagree with a decision from a Victorian government agency");
    expect(r?.entryId).toBe(FALLBACK_ENTRY_ID);
    expect(r?.isFallback).toBe(true);
  });

  it("every entry offers at least one help service (always escalate)", () => {
    for (const e of CorpusIndexSchema.parse(raw).entries) {
      expect(e.getHelp.length).toBeGreaterThan(0);
    }
  });

  it("never asserts a numeric deadline without a verified, real source", () => {
    for (const e of CorpusIndexSchema.parse(raw).entries) {
      for (const p of e.pathways) {
        if (typeof p.deadlineDays === "number") {
          expect(p.deadlineVerified).toBe(true);
          expect(/verify/i.test(p.source)).toBe(false);
        }
      }
    }
  });

  it("every entry is in a supported jurisdiction (Victoria or Commonwealth)", () => {
    for (const e of CorpusIndexSchema.parse(raw).entries) {
      const j = e.jurisdiction.toLowerCase();
      expect(j.includes("victoria") || j.includes("commonwealth")).toBe(true);
    }
  });

  it("getEntry returns undefined for an unknown id", () => {
    expect(getEntry("does-not-exist")).toBeUndefined();
  });
});

/**
 * The catch-all entry must never COMPETE for a match.
 *
 * "A Victorian government decision I disagree with" is deliberately broad — its tokens
 * include "decision", "notice of decision", "government agency" and "review", which appear
 * in essentially every government letter, Commonwealth ones included. While it took part in
 * classification it could outscore the specific entry a letter belonged to, and a
 * Commonwealth letter would then be explained against Victorian law and pointed at VCAT.
 * It stays reachable: classifyForDecode selects it explicitly when nothing else matches.
 */
describe("the fallback entry is chosen, never matched", () => {
  it("contributes no classification tokens", () => {
    const index = getCorpus();
    const fallbacks = index.entries.filter((e) => e.isFallback).map((e) => e.id);
    expect(fallbacks).toContain("vic-generic");
    for (const id of fallbacks) {
      expect(index.classification.filter((t) => t.entryId === id)).toEqual([]);
    }
  });

  it("a Commonwealth letter reaches the Centrelink guide, not the Victorian catch-all", () => {
    const letter =
      "Services Australia. Notice of decision about your Centrelink payment. We have decided you were overpaid. This is a decision of a government agency. You can ask for a review.";
    const match = classifyForDecode(letter);
    expect(match?.entryId).toBe("cth-centrelink");
    expect(match?.isFallback).toBe(false);
  });

  it("a letter matching nothing specific still reaches the fallback", () => {
    const match = classifyForDecode(
      "We write about the matter previously discussed. Please contact this office if you wish to discuss it further.",
    );
    expect(match?.entryId).toBe("vic-generic");
    expect(match?.isFallback).toBe(true);
  });
});


/**
 * The Commonwealth catch-all, and the fallback that had to change with it.
 *
 * A single "vic-generic" fallback meant a Commonwealth letter matching no specific guide was
 * routed to a VICTORIAN entry and told about VCAT. Adding a Commonwealth catch-all achieves
 * nothing unless the fallback is chosen by jurisdiction too.
 */
describe("the catch-all matches the government that wrote the letter", () => {
  it("routes a Commonwealth letter to the Commonwealth catch-all", () => {
    const m = classifyForDecode(
      "This letter is from the National Disability Insurance Agency about your plan. The NDIA has decided to change your funding.",
    );
    expect(m?.entryId).toBe("cth-generic");
    expect(m?.isFallback).toBe(true);
  });

  it("routes a Victorian letter to the Victorian catch-all", () => {
    const m = classifyForDecode(
      "This is a notice from the Victorian Ombudsman about a decision of a state body.",
    );
    expect(m?.entryId).toBe("vic-generic");
  });

  it("does NOT treat a Victorian postal address as a Victorian decision", () => {
    // Commonwealth letters carry "Victoria 3000" in the address block, which would misroute
    // exactly the people this is meant to help.
    expect(guessJurisdiction("Services Australia. GPO Box 1234, Melbourne Victoria 3000.")).toBe("Cth");
  });

  it("keeps a specific guide ahead of either catch-all", () => {
    const m = classifyForDecode("Notice of decision about your Centrelink debt from Services Australia.");
    expect(m?.entryId).toBe("cth-centrelink");
    expect(m?.isFallback).toBe(false);
  });

  it("publishes only verified entries", () => {
    for (const e of listEntries()) expect(e.status, e.id).toBe("verified");
  });

  it("the Commonwealth catch-all never competes for a match", () => {
    const index = getCorpus();
    expect(index.classification.filter((t) => t.entryId === "cth-generic")).toEqual([]);
  });
});
