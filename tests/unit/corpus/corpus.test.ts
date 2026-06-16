import { describe, it, expect } from "vitest";
import raw from "@/corpus/index.json";
import { CorpusIndexSchema } from "@/lib/schemas/corpus";
import { classify, classifyForDecode, getEntry, FALLBACK_ENTRY_ID } from "@/lib/corpus/index";

describe("corpus index", () => {
  it("validates against the Zod schema (authoritative gate, no drift)", () => {
    expect(() => CorpusIndexSchema.parse(raw)).not.toThrow();
  });

  it("classifies a Centrelink letter to the centrelink entry", () => {
    const r = classify("Services Australia debt notice — you have an overpayment");
    expect(r?.entryId).toBe("centrelink-debt");
  });

  it("classifies an NDIS letter to the ndis entry", () => {
    const r = classify("The NDIA decided your plan funding was reduced");
    expect(r?.entryId).toBe("ndis-plan");
  });

  it("falls back to the generic entry for an unrecognised government letter", () => {
    const r = classifyForDecode("This is a notice of decision from an Australian Government office");
    expect(r?.entryId).toBe(FALLBACK_ENTRY_ID);
    expect(r?.isFallback).toBe(true);
  });

  it("every entry offers at least one help service (always escalate)", () => {
    for (const e of CorpusIndexSchema.parse(raw).entries) {
      expect(e.getHelp.length).toBeGreaterThan(0);
    }
  });

  it("no SEED entry asserts a computable deadline (never an unsourced deadline)", () => {
    for (const e of CorpusIndexSchema.parse(raw).entries) {
      if (e.status === "seed") {
        for (const p of e.pathways) {
          expect(p.deadlineDays).toBeNull();
          expect(p.deadlineVerified).toBe(false);
        }
      }
    }
  });

  it("getEntry returns undefined for an unknown id", () => {
    expect(getEntry("does-not-exist")).toBeUndefined();
  });
});
