import { describe, it, expect } from "vitest";
import { composeBrief, type BriefDraft } from "@/lib/memo/brief";
import { getDataEntry } from "@/lib/data";
import { listGrounds } from "@/lib/legal";
import { withCriterionIds, answerableCriteria } from "@/lib/memo/criteria";
import messages from "@/lib/i18n/messages/en.json";

const R = messages.rights as unknown as Record<string, string>;
const t = (k: string) => R[k] ?? k;
const housing = getDataEntry("vic-public-housing")!;
const fines = getDataEntry("vic-fines")!;
const criterion = withCriterionIds(answerableCriteria(housing, housing.mrCriteria!))[0]!;

const BRIEF: BriefDraft = {
  situation: "You got a notice to vacate. You say you have nowhere else to go.",
  path: "VCAT looks at whether the notice is valid.",
  points: [{ ref: criterion.id, relates: "You say the notice gave you ten days.", needed: "The notice itself." }],
  otherSide: "They may say the notice was served properly.",
  toGather: ["the notice", "any letters from the housing office"],
  sources: ["https://www.housing.vic.gov.au"],
};

const doc = (brief: BriefDraft | null, over: Partial<Parameters<typeof composeBrief>[0]> = {}) =>
  composeBrief({
    brief,
    entry: housing,
    pathName: "Asking for a fresh look at the decision",
    forum: "VCAT",
    decisionDate: "2026-10-14",
    grounds: [],
    criteria: housing.mrCriteria!,
    t,
    ...over,
  });

/**
 * The split of who writes what is the whole safety design of the short analysis: the model
 * writes prose ABOUT the law, and everything a person could lose a right by misreading — the
 * time limit, the law itself, the sources — is ours, from the corpus.
 */
describe("the short analysis keeps the law and the time limit ours", () => {
  it("prints the entry's own time-limit rule, verbatim, before anything the model wrote", () => {
    const b = doc(BRIEF).body;
    const rule = housing.deadlineRule.replace(/\s+/g, " ").trim();
    expect(b).toContain(rule);
    expect(b.indexOf(rule)).toBeLessThan(b.indexOf(BRIEF.situation));
    expect(b).toContain(housing.verifiedAsAt);
  });

  it("shows the time limit and free help while the brief is still being written", () => {
    const frame = doc(null).body;
    expect(frame).toContain(housing.deadlineRule.replace(/\s+/g, " ").trim());
    expect(frame).toContain(housing.getHelp[0]!.service);
    expect(frame).not.toContain(t("briefSituation").toUpperCase());
  });

  it("heads each point with the corpus's words, never the model's", () => {
    const b = doc(BRIEF);
    const items = b.blocks.filter((x) => x.kind === "item").map((x) => (x as { text: string }).text);
    expect(items).toContain(criterion.text);
    expect(b.body).toContain("You say the notice gave you ten days.");
  });

  it("drops a point whose id we never supplied", () => {
    const b = doc({ ...BRIEF, points: [{ ref: "c-made-up", relates: "This must not appear.", needed: "" }] });
    expect(b.body).not.toContain("This must not appear.");
    expect(b.body).not.toContain(t("briefPoints").toUpperCase());
  });

  it("keeps at most four points and four things to gather", () => {
    const all = withCriterionIds(answerableCriteria(housing, housing.mrCriteria!));
    const g = listGrounds().filter((x) => x.id === "procedural-fairness-hearing");
    const refs = [...all.map((c) => c.id), ...g[0]!.elements.map((e) => `procedural-fairness-hearing/${e.id}`)];
    const b = doc(
      {
        ...BRIEF,
        points: refs.map((ref, i) => ({ ref, relates: `Point ${i} relates.`, needed: "" })),
        toGather: ["a", "b", "c", "d", "e", "f"],
      },
      { grounds: g },
    );
    expect(b.blocks.filter((x) => x.kind === "note" && /relates\./.test(x.text)).length).toBeLessThanOrEqual(4);
    expect(b.body).not.toContain("  - e");
  });

  it("accepts a part of a ground by groundId/partId, and by the bare part id", () => {
    const g = listGrounds().filter((x) => x.id === "procedural-fairness-hearing");
    const el = g[0]!.elements[0]!;
    for (const ref of [`procedural-fairness-hearing/${el.id}`, el.id]) {
      const b = doc({ ...BRIEF, points: [{ ref, relates: "Relates here.", needed: "" }] }, { grounds: g });
      expect(b.body, ref).toContain(el.name);
      expect(b.body).toContain("Relates here.");
    }
  });

  it("names the free services from the entry itself", () => {
    const b = doc(BRIEF, { entry: fines, criteria: fines.irCriteria! }).body;
    expect(b).toContain(fines.getHelp[0]!.service);
  });

  it("carries the disclaimer and the official source once the brief is there", () => {
    const b = doc(BRIEF).body;
    expect(b).toContain(t("memoNotAdvice"));
    expect(b).toContain(housing.sourceUrl);
  });
});

describe("the brief's sources are ones a person can look up", () => {
  it("leaves out the corpus's internal provenance line", () => {
    const b = doc({
      ...BRIEF,
      sources: ["Owner's administrative-law knowledge base (Combined MR/JR Framework, 2026-08-22)", "https://www.vcat.vic.gov.au"],
    }).body;
    expect(b).not.toMatch(/knowledge base/i);
    expect(b).toContain("https://www.vcat.vic.gov.au");
  });
});
