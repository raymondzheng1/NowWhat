import { describe, it, expect } from "vitest";
import { getDataEntry } from "@/lib/data";
import { getProcess } from "@/lib/legal";
import { avenueView } from "@/lib/triage";
import { planFor } from "@/lib/analysis";
import { buildMemoContext } from "@/lib/memo/context";
import { composeMemo } from "@/lib/memo/compose";
import messages from "@/lib/i18n/messages/en.json";

const R = messages.rights as unknown as Record<string, string>;
const t = (k: string) => R[k] ?? k;
const merits = getProcess("merits-review")!;
const judicial = getProcess("judicial-review")!;

/**
 * Renting is a DISPUTE VCAT decides, not a government decision it reviews. The analysis
 * applied the merits process to a landlord's notice — "stands in the shoes of the original
 * decision-maker", standing to challenge a decision (the end-to-end QA).
 */
describe("a renting dispute is not merits review", () => {
  const entry = getDataEntry("vic-renting")!;
  const plan = planFor({
    avenue: avenueView(entry),
    meritsReview: merits,
    judicialReview: judicial,
    jurisdiction: "Vic",
    criteria: entry.mrCriteria ?? [],
  });
  const path = plan.paths.find((p) => p.id === "merits-review")!;

  it("the card claims no tribunal question or remedies, and has its own focus", () => {
    expect(path.character).toBe("dispute");
    expect(path.question).toBe("");
    expect(path.canDo).toEqual([]);
    expect(path.focusKey).toBe("focusDispute");
  });

  it("the full notes say what it is, and never borrow the merits process", () => {
    const memo = composeMemo({
      entry,
      process: merits,
      character: "dispute",
      criteria: path.criteria,
      grounds: [],
      story: "My rental provider gave me a notice to vacate.",
      goals: [],
      goalOther: "",
      forum: "VCAT",
      pathId: "merits-review",
      t,
    });
    expect(memo.body).toContain(R.memoDisputeNote);
    expect(memo.body).not.toMatch(/stands in the shoes|correct or preferable/i);
  });
});

describe("the analysis is offered the sources for its own path and jurisdiction", () => {
  const ctx = (id: string, pathId: "merits-review" | "judicial-review" | "internal-review") =>
    buildMemoContext({
      entry: getDataEntry(id)!,
      process: pathId === "merits-review" ? merits : pathId === "judicial-review" ? judicial : null,
      internal: null,
      grounds: [],
      criteria: [],
      forum: "x",
      pathName: "x",
      pathId,
    }).split("SOURCES")[1]!;

  it("a Victorian VCAT analysis is not offered the ART or the Supreme Court", () => {
    const s = ctx("vic-generic", "merits-review");
    expect(s).toContain("vcat.vic.gov.au");
    expect(s).not.toMatch(/art\.gov\.au|Administrative Review Tribunal|supremecourt/i);
  });

  it("a Victorian judicial review is not offered the Federal Court", () => {
    const s = ctx("vic-generic", "judicial-review");
    expect(s).toMatch(/supremecourt\.vic\.gov\.au/);
    expect(s).not.toMatch(/fedcourt|Federal Court/);
  });

  it("a Commonwealth review is not offered VCAT", () => {
    const s = ctx("cth-centrelink", "merits-review");
    expect(s).toMatch(/art\.gov\.au/);
    expect(s).not.toMatch(/vcat/i);
  });

  it("a fines internal review is not offered the court-election page", () => {
    const s = ctx("vic-fines", "internal-review");
    expect(s).not.toMatch(/go to court/i);
  });

  it("the analysis is told how the tribunal works", () => {
    const full = buildMemoContext({
      entry: getDataEntry("vic-generic")!, process: merits, internal: null, grounds: [], criteria: [],
      forum: "VCAT", pathName: "merits review", pathId: "merits-review",
    });
    expect(full).toContain("HOW THIS BODY WORKS");
    expect(full).toMatch(/best and most current information/);
  });
});

import { listDataEntries } from "@/lib/data";
import { getEntry } from "@/lib/corpus/index";
import { verifyOutput } from "@/lib/verification/verify";
import { memoExtraSources } from "@/lib/memo/context";

/** Every source line the analysis is OFFERED must be one it is ALLOWED to cite back. */
describe("offered sources are allowed sources, for every decision and path", () => {
  for (const entry of listDataEntries()) {
    for (const pathId of ["internal-review", "merits-review", "court-election", "judicial-review"] as const) {
      it(`${entry.id} / ${pathId}`, () => {
        const process = pathId === "merits-review" ? merits : pathId === "judicial-review" ? judicial : null;
        const context = buildMemoContext({
          entry, process, internal: null, grounds: [], criteria: [], forum: "x", pathName: "x", pathId,
        });
        const offered = context
          .slice(context.indexOf("SOURCES ("))
          .split("\n")
          .slice(1)
          .map((l) => l.replace(/^\s*-\s*/, "").trim())
          .filter(Boolean);
        const v = verifyOutput({
          text: "You can ask for the decision to be looked at again.",
          declaredSources: offered,
          entry: getEntry(entry.id)!,
          extraSources: memoExtraSources({ entry, process, internal: null, grounds: [] }),
        });
        expect(v.failures.filter((f) => f.gate === "source-allowlist")).toEqual([]);
      });
    }
  }
});
