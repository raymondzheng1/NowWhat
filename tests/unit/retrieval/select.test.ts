import { describe, it, expect } from "vitest";
import { retrieveForAsk, buildContext } from "@/lib/retrieval/select";

describe("retrieval", () => {
  it("retrieves the renting entry for a renting question", () => {
    const r = retrieveForAsk("I got a notice to vacate from my rental provider. Can I challenge it?");
    expect(r?.entry.id).toBe("vic-renting");
  });

  it("returns null when nothing relevant matches (routes to not-covered)", () => {
    const r = retrieveForAsk("zxqw qwzx flarn blibble");
    expect(r).toBeNull();
  });

  it("buildContext only contains corpus facts (the grounding allow-list)", () => {
    const r = retrieveForAsk("I got a fine and want to ask for a review");
    const ctx = buildContext(r!.entry);
    expect(ctx).toContain("SOURCES:");
    expect(ctx).toContain("GET HELP:");
  });
});
