import { describe, it, expect } from "vitest";
import raw from "@/data/index.json";
import { DataIndexSchema, dataIsConfirmable } from "@/lib/schemas/data";
import { classifyData, getDataEntry, fallbackId } from "@/lib/data/index";

describe("procedural data layer", () => {
  it("validates against the Zod schema (authoritative gate, no drift)", () => {
    expect(() => DataIndexSchema.parse(raw)).not.toThrow();
  });

  it("every entry has a source, a verifiedAsAt, a cadence, and ≥1 help service", () => {
    for (const e of DataIndexSchema.parse(raw).entries) {
      expect(e.sourceUrl.length).toBeGreaterThan(0);
      expect(e.verifiedAsAt.length).toBeGreaterThan(0);
      expect(e.reviewCadenceDays).toBeGreaterThan(0);
      expect(e.getHelp.length).toBeGreaterThan(0);
    }
  });

  it("never asserts a numeric deadline figure on a non-verified/unsourced entry", () => {
    const timeFigure = /\b\d+\s*(day|days|week|weeks|month|months|business day)/i;
    for (const e of DataIndexSchema.parse(raw).entries) {
      if (timeFigure.test(e.deadlineRule)) {
        expect(dataIsConfirmable(e)).toBe(true);
      }
    }
  });

  it("all seed entries are non-confirmable (degrade to source+help, never a number)", () => {
    for (const e of DataIndexSchema.parse(raw).entries) {
      if (e.status === "seed") expect(dataIsConfirmable(e)).toBe(false);
    }
  });

  it("classifies a renting decision to the renting entry within Victoria", () => {
    const r = classifyData("I got a notice to vacate from my rental provider", "Vic");
    expect(r.entryId).toBe("vic-renting");
    expect(r.isFallback).toBe(false);
  });

  it("classifies a Centrelink debt to the Cth entry", () => {
    const r = classifyData("Centrelink says I have a debt / overpayment", "Cth");
    expect(r.entryId).toBe("cth-centrelink");
  });

  it("routes an unrecognised decision to the jurisdiction's generic fallback", () => {
    const vic = classifyData("zzz qqq nothing matches here", "Vic");
    expect(vic.entryId).toBe(fallbackId("Vic"));
    expect(vic.isFallback).toBe(true);
    const cth = classifyData("zzz qqq nothing matches here", "Cth");
    expect(cth.entryId).toBe("cth-generic");
  });

  it("never shows a countdown — deadlineRule carries no '... days left' phrasing", () => {
    for (const e of DataIndexSchema.parse(raw).entries) {
      expect(/days?\s+left|left to|remaining/i.test(e.deadlineRule)).toBe(false);
    }
  });

  it("getDataEntry returns undefined for an unknown id", () => {
    expect(getDataEntry("nope")).toBeUndefined();
  });
});

/**
 * An `example` chip is a COVERAGE CLAIM, not decoration: it asserts that the Act this entry
 * names governs that decision, that the review body is right for it, that the reasons
 * request addresses the right decision-maker, and that the help services actually help with
 * it. So it may only appear on a verified, sourced entry — enforced by data-check too, so
 * the rule survives a reviewer forgetting it.
 */
describe("tile examples are a coverage claim", () => {
  const index = DataIndexSchema.parse(raw);

  it("only verified entries declare examples", () => {
    for (const e of index.entries) {
      if (e.examples.length > 0) expect(e.status, e.id).toBe("verified");
    }
  });

  it("no example states a time figure", () => {
    for (const e of index.entries) {
      for (const x of e.examples) {
        expect(x, `${e.id}: ${x}`).not.toMatch(/\b\d+\s*(day|days|week|weeks|month|months|year|years)\b/i);
      }
    }
  });

  it("examples never leak into classification — they describe, they do not match", () => {
    const tokens = new Set(index.classification.map((t) => t.token));
    for (const e of index.entries) {
      for (const x of e.examples) expect(tokens.has(x.toLowerCase())).toBe(false);
    }
  });
});
