import { describe, it, expect } from "vitest";
import {
  CONNECTIVES,
  checkOwnWords,
  checkQuoteAnchored,
  checkHedgePreserved,
  checkNoLegalConclusion,
  checkNoTimeLimitClaim,
  checkNoCaseCitation,
  looksThirdParty,
  sensitiveFlags,
} from "@/lib/verification/own-words";

describe("own-words: the model may delete, reorder and split — never add", () => {
  const quote = "I sent my doctors letter to Centrelink on 3 March. The debt notice does not mention it anywhere.";

  it("accepts a sentence built only from the person's own words", () => {
    expect(checkOwnWords("I sent my doctors letter on 3 March.", quote).ok).toBe(true);
    expect(checkOwnWords("The debt notice does not mention it.", quote).ok).toBe(true);
  });

  it("rejects a fact the person never wrote, however plausible", () => {
    // The classic embellishment: an agency name they did not type.
    expect(checkOwnWords("Services Australia stopped my payment.", quote).ok).toBe(false);
    // And the subtler one — no number, no proper noun, no term of art.
    const q2 = "i bring my cousin for help translate";
    const r = checkOwnWords("I asked for an interpreter and my request was refused.", q2);
    expect(r.ok).toBe(false);
    expect(r.novel).toContain("interpreter");
  });

  it("holds a number to the exact digits the person used", () => {
    const q = "they gave me about two weeks to reply";
    expect(checkOwnWords("They gave me 14 days to reply.", q).ok).toBe(false);
  });

  it("has no modal or causal words in the connective list", () => {
    for (const w of ["should", "must", "would", "could", "may", "might", "will", "can", "because", "therefore", "so"]) {
      expect(CONNECTIVES.has(w), w).toBe(false);
    }
  });
});

describe("the quote must really be theirs", () => {
  const account = "They cut my payment with no warning. I rang twice and nobody called back.";
  it("accepts a continuous run of their text", () => {
    expect(checkQuoteAnchored("I rang twice and nobody called back.", account)).toBe(true);
  });
  it("rejects two fragments stitched together", () => {
    expect(checkQuoteAnchored("They cut my payment and nobody called back.", account)).toBe(false);
  });
});

describe("their doubt survives", () => {
  it("rejects a sentence more certain than what they wrote", () => {
    const q = "i think it was around the 3rd of march, i cant remember exactly";
    expect(checkHedgePreserved(["It was the 3rd of March."], q)).toBe(false);
  });
  it("accepts one that keeps the hedge", () => {
    const q = "i think it was around the 3rd of march";
    expect(checkHedgePreserved(["I think it was around the 3rd of March."], q)).toBe(true);
  });
});

describe("no legal conclusions, no time claims, no citations", () => {
  it("blocks terms of art even when the person used them first", () => {
    expect(checkNoLegalConclusion(["This was unfair and they breached my rights."]).ok).toBe(false);
    expect(checkNoLegalConclusion(["They failed to consider my letter."]).ok).toBe(false);
  });
  it("allows a reported event but blocks an entitlement claim", () => {
    expect(checkNoTimeLimitClaim(["They gave me 14 days. The letter took 9 days to reach me."])).toBe(true);
    expect(checkNoTimeLimitClaim(["I have 28 days to reply."])).toBe(false);
  });
  it("never lets a case citation into a letter", () => {
    expect(checkNoCaseCitation(["As held in Kioa v West (1985) 159 CLR 550."])).toBe(false);
  });
});

describe("who is writing, and what may cost them", () => {
  it("spots an account written for someone else", () => {
    expect(looksThirdParty("I am helping my mum, she got a letter about her pension")).toBe(true);
    expect(looksThirdParty("They cut my payment with no warning")).toBe(false);
  });
  it("flags disclosures that could hurt the person if sent to the agency", () => {
    expect(sensitiveFlags("i did a few cash in hand shifts to get by")).toContain("cash-work");
    expect(sensitiveFlags("there was family violence at the time")).toContain("family-violence");
    expect(sensitiveFlags("the officer lied about what I said")).toContain("person");
    expect(sensitiveFlags("they cut my payment with no warning")).toEqual([]);
  });
});
