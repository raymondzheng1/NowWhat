import { describe, it, expect } from "vitest";
import raw from "@/corpus/index.json";
import { CorpusIndexSchema } from "@/lib/schemas/corpus";
import { classify, classifyForDecode, getEntry, FALLBACK_ENTRY_ID } from "@/lib/corpus/index";

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
