import { describe, it, expect } from "vitest";
import { screenMatches, MAX_SUGGESTIONS } from "@/lib/grounds/match";

const account = "They never told me about the complaint. I found out from a neighbour two weeks later.";
const m = (matches: { groundId: string; quote: string; why: string }[]) => ({ covered: true, matches, sources: [] });
const ok = { groundId: "a", quote: "They never told me about the complaint.", why: "You say you were not told." };

describe("screenMatches", () => {
  it("keeps a match whose quote is word for word theirs", () => {
    expect(screenMatches(m([ok]), account, ["a"]).suggestions).toEqual([ok]);
  });
  it("tolerates their curly quotes and spacing, never a changed word", () => {
    expect(screenMatches(m([{ ...ok, quote: "They  never told me about the complaint." }]), account, ["a"]).suggestions).toHaveLength(1);
    expect(screenMatches(m([{ ...ok, quote: "They never told me about the complaints." }]), account, ["a"]).dropped).toContain("quote-not-theirs");
  });
  it("drops a too-short quote, a case name, a time limit, a long why and a repeat", () => {
    const r = screenMatches(
      m([
        { ...ok, quote: "They never" },
        { ...ok, groundId: "b", why: "As in Kioa v West, you were not heard." },
        { ...ok, groundId: "c", why: "You have 28 days to apply to the court." },
        { ...ok, groundId: "d", why: "word ".repeat(60) },
        ok,
        ok,
      ]),
      account,
      ["a", "b", "c", "d"],
    );
    expect(r.suggestions.map((s) => s.groundId)).toEqual(["a"]);
    expect(r.dropped).toEqual(expect.arrayContaining(["quote-not-theirs", "why-law", "why-length"]));
  });
  it("never more than a phone screen's worth", () => {
    const ids = Array.from({ length: 8 }, (_, i) => `g${i}`);
    const r = screenMatches(m(ids.map((groundId) => ({ ...ok, groundId }))), account, ids);
    expect(r.suggestions).toHaveLength(MAX_SUGGESTIONS);
  });
});
