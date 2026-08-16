import { describe, it, expect } from "vitest";
import { composeLetter, LETTER_GROUND_HEADINGS, LAWYER_NOTE_ONLY } from "@/lib/letter/compose";
import { getEntry } from "@/lib/corpus/index";
import messages from "@/lib/i18n/messages/en.json";

const entry = getEntry("cth-centrelink")!;
const L = messages.letter as unknown as Record<string, string>;

function compose(answers: Record<string, string>, groundIds: string[]) {
  return composeLetter({
    entry,
    kind: "merits-review-application",
    account: { answers, groundIds },
    headingFor: (k) => L[k]!,
    groundsLead: L.groundsLead!,
    otherConcerns: L.otherConcerns!,
    universal: [
      { id: "q-what", label: "What was the decision about?" },
      { id: "q-story", label: "What happened, in your own words?" },
    ],
  });
}

describe("the letter is the person's account, not our argument", () => {
  it("writing nothing still produces the letter they would have had before", () => {
    const out = compose({}, []);
    expect(out.body.length).toBeGreaterThan(100);
    expect(out.body).not.toContain(L.groundsLead);
  });

  it("puts their own words under their own headings", () => {
    const out = compose(
      { "q-story": "They cut my payment with no warning.", "g-procedural-fairness-hearing": "Nobody rang me or wrote to me first." },
      ["procedural-fairness-hearing"],
    );
    expect(out.body).toContain("They cut my payment with no warning.");
    expect(out.body).toContain(L.groundHearing);
    expect(out.body).toContain("Nobody rang me or wrote to me first.");
  });

  it("drops a marked point they wrote nothing under — an unexplained heading is our assertion", () => {
    const out = compose({}, ["procedural-fairness-hearing"]);
    expect(out.body).not.toContain(L.groundHearing);
  });

  it("tells the agency the letter is not everything, when something was left out", () => {
    const out = compose({ "g-bad-faith": "ignored" }, ["bad-faith"]);
    expect(out.body).toContain(L.otherConcerns);
  });

  it("never puts a lawyer-note-only point in a letter to the agency", () => {
    const out = compose({ "g-invalid-delegation": "A different person signed it." }, ["invalid-delegation"]);
    expect(out.body).not.toContain(L.groundSigner);
    expect(out.body).toContain(L.otherConcerns);
  });

  it("closes properly — the account goes above the sign-off", () => {
    const out = compose({ "q-story": "MY ACCOUNT HERE" }, []);
    expect(out.body.indexOf("MY ACCOUNT HERE")).toBeLessThan(out.body.lastIndexOf("Yours faithfully"));
  });
});

describe("which grounds may carry a heading", () => {
  it("only the six that a person could say from their own knowledge", () => {
    expect(Object.keys(LETTER_GROUND_HEADINGS).sort()).toEqual(
      [
        "inflexible-policy",
        "invalid-delegation",
        "irrelevant-considerations",
        "no-evidence",
        "procedural-fairness-hearing",
        "relevant-considerations",
      ].sort(),
    );
  });

  it("bias, bad faith and improper purpose never appear — they impute a state of mind", () => {
    for (const id of ["bad-faith", "procedural-fairness-bias", "improper-purpose"]) {
      expect(LETTER_GROUND_HEADINGS[id]).toBeUndefined();
    }
  });

  it("no heading names a legal test, standard, power or duty", () => {
    const banned = /\b(unlawful|invalid|breach|duty|jurisdiction|unreasonable|procedural fairness|natural justice|ultra vires|power to)\b/i;
    for (const key of Object.values(LETTER_GROUND_HEADINGS)) {
      expect(L[key], key).toBeTruthy();
      expect(L[key]!, key).not.toMatch(banned);
    }
  });

  it("every heading is written in the first person, as something that happened", () => {
    for (const key of Object.values(LETTER_GROUND_HEADINGS)) {
      expect(L[key]!, key).toMatch(/^(I |The )/);
    }
    expect(LAWYER_NOTE_ONLY.has("invalid-delegation")).toBe(true);
  });
});
