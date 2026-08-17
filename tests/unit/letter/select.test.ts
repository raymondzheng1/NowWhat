import { describe, it, expect } from "vitest";
import { screenSelection, retryHintFor } from "@/lib/letter/select";

const ACCOUNT =
  "They cut my payment with no warning. I rang twice and nobody called back. I think it was around the 3rd of March.";

function screen(points: { groundId: string; items: { quote: string; sentences: string[] }[] }[]) {
  return screenSelection({ points }, ACCOUNT, ["procedural-fairness-hearing", "bad-faith"]);
}

describe("screening: a failing point is dropped, never repaired", () => {
  it("keeps sentences built from the person's own quote", () => {
    const r = screen([
      {
        groundId: "procedural-fairness-hearing",
        items: [{ quote: "I rang twice and nobody called back.", sentences: ["I rang twice.", "Nobody called back."] }],
      },
    ]);
    expect(r.points).toHaveLength(1);
    expect(r.points[0]!.sentences.map((s) => s.text)).toEqual(["I rang twice.", "Nobody called back."]);
  });

  it("drops a sentence containing a word the person never wrote", () => {
    const r = screen([
      {
        groundId: "procedural-fairness-hearing",
        items: [{ quote: "I rang twice and nobody called back.", sentences: ["I rang Centrelink twice."] }],
      },
    ]);
    expect(r.points).toHaveLength(0);
    expect(r.droppedGates).toContain("own-words");
  });

  it("drops a quote that is not a continuous run of their text", () => {
    const r = screen([
      {
        groundId: "procedural-fairness-hearing",
        items: [{ quote: "They cut my payment and nobody called back.", sentences: ["They cut my payment."] }],
      },
    ]);
    expect(r.droppedGates).toContain("quote-anchored");
  });

  it("drops a sentence that strips the person's doubt", () => {
    const r = screen([
      {
        groundId: "procedural-fairness-hearing",
        items: [{ quote: "I think it was around the 3rd of March.", sentences: ["It was the 3rd of March."] }],
      },
    ]);
    expect(r.droppedGates).toContain("hedge-preservation");
  });

  it("refuses a point the person never marked, or one that carries no heading", () => {
    const r = screen([
      { groundId: "unreasonableness", items: [{ quote: "I rang twice", sentences: ["I rang twice."] }] },
      { groundId: "bad-faith", items: [{ quote: "I rang twice", sentences: ["I rang twice."] }] },
    ]);
    expect(r.points).toHaveLength(0);
    expect(r.droppedGates).toContain("not-marked");
  });

  it("keeps the good sentence beside a bad one, rather than losing both", () => {
    const r = screen([
      {
        groundId: "procedural-fairness-hearing",
        items: [
          { quote: "I rang twice and nobody called back.", sentences: ["I rang twice.", "They ignored me deliberately."] },
        ],
      },
    ]);
    expect(r.points[0]!.sentences.map((s) => s.text)).toEqual(["I rang twice."]);
  });

  it("flags a line that could count against the person, without dropping it", () => {
    const acct = "i did a few cash in hand shifts to get by";
    const r = screenSelection(
      {
        points: [
          {
            groundId: "procedural-fairness-hearing",
            items: [{ quote: "i did a few cash in hand shifts to get by", sentences: ["I did a few cash in hand shifts."] }],
          },
        ],
      },
      acct,
      ["procedural-fairness-hearing"],
    );
    expect(r.points[0]!.sentences[0]!.sensitive).toContain("cash-work");
  });
});

describe("retry hints never carry the person's words", () => {
  it("maps gate names to fixed remediation text", () => {
    const hint = retryHintFor(["own-words", "hedge-preservation"]);
    expect(hint).toContain("own quote");
    expect(hint).toContain("maybe");
    expect(hint).not.toContain("Centrelink");
  });
});
