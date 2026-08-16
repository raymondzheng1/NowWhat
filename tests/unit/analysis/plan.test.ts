import { describe, it, expect } from "vitest";
import { planFor } from "@/lib/analysis";
import { getProcess } from "@/lib/legal";
import { triage, avenueView } from "@/lib/triage";
import messages from "@/lib/i18n/messages/en.json";

const merits = getProcess("merits-review")!;
const judicial = getProcess("judicial-review")!;
const plan = (avenue: Parameters<typeof planFor>[0]["avenue"]) =>
  planFor({ avenue, meritsReview: merits, judicialReview: judicial });

const AV = {
  mrAvailable: true,
  mrBody: "ART",
  jrAvailable: true,
  jrForum: "Federal Court",
  noReviewEndpoint: null,
};

describe("analysis plan (what this means, and in what order)", () => {
  it("leads with merits review when it is available — only a tribunal can substitute a decision", () => {
    const p = plan(AV);
    expect(p.primary?.id).toBe("merits-review");
    expect(p.paths.map((x) => x.id)).toEqual(["merits-review", "judicial-review"]);
    expect(p.paths[0]!.order).toBe(1);
    expect(p.leadKey).toBe("analysisLeadBoth");
  });

  it("falls back to judicial review when merits review is not available", () => {
    const p = plan({ ...AV, mrAvailable: false });
    expect(p.primary?.id).toBe("judicial-review");
    expect(p.primary?.order).toBe(1);
    expect(p.leadKey).toBe("analysisLeadJudicial");
  });

  it("has no primary path — and says so — when neither review is available", () => {
    const p = plan({ ...AV, mrAvailable: false, jrAvailable: false });
    expect(p.primary).toBeNull();
    expect(p.paths).toEqual([]);
    expect(p.leadKey).toBe("analysisLeadNone");
  });

  it("carries the corpus question, remedies and limits verbatim (never invented)", () => {
    const p = plan(AV);
    const mr = p.paths.find((x) => x.id === "merits-review")!;
    const jr = p.paths.find((x) => x.id === "judicial-review")!;
    // The foundation each path rests on.
    expect(mr.question).toBe("Is this the correct or preferable decision?");
    expect(jr.question).toBe("Was the decision made lawfully?");
    expect(mr.canDo).toEqual(merits.remedies);
    expect(jr.cannotDo).toEqual(judicial.limits);
    // The key distinction a person needs: a court cannot hand them the outcome.
    expect(jr.cannotDo.join(" ").toLowerCase()).toContain("cannot substitute");
  });

  it("names the real body for each path, from the decision's own data entry", () => {
    const t = triage({ jurisdiction: "Cth", decisionType: "Centrelink debt" });
    const p = plan(avenueView(t.entry));
    expect(p.primary?.body).toBe("ART");
  });

  it("every lead/focus key it can emit exists in the message catalog", () => {
    const r = messages.rights as Record<string, string>;
    for (const key of [
      "analysisLeadBoth",
      "analysisLeadMerits",
      "analysisLeadJudicial",
      "analysisLeadNone",
      "focusMerits",
      "focusJudicial",
    ]) {
      expect(r[key], key).toBeTruthy();
    }
  });

  it("the strategy copy describes what the FORUM weighs — never what the reader must do", () => {
    const r = messages.rights as Record<string, string>;
    const prose = `${r.focusMerits} ${r.focusJudicial}`.toLowerCase();
    for (const banned of ["you should", "you must", "we recommend", "your best", "likely to succeed"]) {
      expect(prose, banned).not.toContain(banned);
    }
    // Each names the test the forum applies.
    expect(r.focusMerits!.toLowerCase()).toContain("correct or preferable");
    expect(r.focusJudicial!.toLowerCase()).toContain("how the decision was made");
  });
});
