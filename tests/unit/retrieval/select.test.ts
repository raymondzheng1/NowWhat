import { describe, it, expect } from "vitest";
import { retrieveForAsk, buildContext } from "@/lib/retrieval/select";

describe("retrieval", () => {
  it("retrieves the centrelink entry for a centrelink question", () => {
    const r = retrieveForAsk("Centrelink says I owe a debt. Can I ask for it to be reviewed?");
    expect(r?.entry.id).toBe("centrelink-debt");
  });

  it("returns null when nothing relevant matches (routes to not-covered)", () => {
    const r = retrieveForAsk("zxqw qwzx flarn blibble");
    expect(r).toBeNull();
  });

  it("buildContext only contains corpus facts (the grounding allow-list)", () => {
    const r = retrieveForAsk("NDIS plan funding reduced");
    const ctx = buildContext(r!.entry);
    expect(ctx).toContain("SOURCES:");
    expect(ctx).toContain("GET HELP:");
  });
});
