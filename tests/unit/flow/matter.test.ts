import { describe, it, expect } from "vitest";
import { matterKey, flowForMatter } from "@/lib/flow/matter";
import { listDataEntries } from "@/lib/data";

const VIC_FINES = { id: "vic-fines", jurisdiction: "Vic" as const };
const CTH_DEBT = { id: "centrelink-debt", jurisdiction: "Cth" as const };

describe("a matter key tells one decision from another", () => {
  it("is stable for the same decision", () => {
    expect(matterKey(VIC_FINES)).toBe(matterKey({ ...VIC_FINES }));
  });

  it("differs for two decisions in the same place", () => {
    expect(matterKey(VIC_FINES)).not.toBe(matterKey({ id: "vic-renting", jurisdiction: "Vic" }));
  });

  it("differs across jurisdictions even if an id were ever shared", () => {
    expect(matterKey({ id: "shared", jurisdiction: "Vic" })).not.toBe(
      matterKey({ id: "shared", jurisdiction: "Cth" }),
    );
  });

  it("gives every real entry its own key", () => {
    const keys = listDataEntries().map((e) => matterKey(e));
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("answers are restored only into the matter they were written for", () => {
  const stored = (matter: string, account = { "q-story": "they cut me off" }) =>
    JSON.stringify({ matter, account, goals: ["fix"] });

  it("restores the answers for the decision in hand", () => {
    const f = flowForMatter<{ matter: string; account: Record<string, string> }>(
      stored(matterKey(VIC_FINES)),
      matterKey(VIC_FINES),
    );
    expect(f?.account["q-story"]).toBe("they cut me off");
  });

  it("refuses another decision's answers", () => {
    expect(flowForMatter(stored(matterKey(CTH_DEBT)), matterKey(VIC_FINES))).toBeNull();
  });

  it("refuses the same decision id in the other jurisdiction", () => {
    expect(
      flowForMatter(stored(matterKey({ id: "x", jurisdiction: "Vic" })), matterKey({ id: "x", jurisdiction: "Cth" })),
    ).toBeNull();
  });

  // A tab open across a deploy holds a blob written before matters were recorded. It could
  // have been written for any decision, so it is not restored into this one.
  it("treats a blob with no matter recorded as a mismatch, not a wildcard", () => {
    const legacy = JSON.stringify({ account: { "q-story": "written last week" }, goals: [] });
    expect(flowForMatter(legacy, matterKey(VIC_FINES))).toBeNull();
  });

  it("restores nothing when there is nothing stored", () => {
    expect(flowForMatter(null, matterKey(VIC_FINES))).toBeNull();
    expect(flowForMatter("", matterKey(VIC_FINES))).toBeNull();
    expect(flowForMatter(undefined, matterKey(VIC_FINES))).toBeNull();
  });

  it("restores nothing from something that is not what we wrote", () => {
    expect(flowForMatter("{not json", matterKey(VIC_FINES))).toBeNull();
    expect(flowForMatter("null", matterKey(VIC_FINES))).toBeNull();
    expect(flowForMatter('"Vic|vic-fines"', matterKey(VIC_FINES))).toBeNull();
    expect(flowForMatter('["Vic|vic-fines"]', matterKey(VIC_FINES))).toBeNull();
  });
});
