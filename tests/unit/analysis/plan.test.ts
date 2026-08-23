import { describe, it, expect } from "vitest";
import { planFor } from "@/lib/analysis";
import { getProcess } from "@/lib/legal";
import { triage, avenueView } from "@/lib/triage";
import { getDataEntry, listDataEntries } from "@/lib/data";
import messages from "@/lib/i18n/messages/en.json";

const merits = getProcess("merits-review")!;
const judicial = getProcess("judicial-review")!;
const plan = (avenue: Parameters<typeof planFor>[0]["avenue"]) =>
  planFor({ avenue, meritsReview: merits, judicialReview: judicial });

const AV = {
  mrAvailable: true,
  mrConditional: false,
  mrBody: "ART",
  jrAvailable: true,
  jrConditional: false,
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
    // Centrelink's value used to be the bare acronym "ART", which sent people straight past
    // the internal review by an Authorised Review Officer that comes first. Corrected
    // 2026-08-23 from our own verified decode entry.
    const t = triage({ jurisdiction: "Cth", decisionType: "Centrelink debt" });
    const p = plan(avenueView(t.entry));
    expect(p.primary?.body).toBe("internal review by Services Australia, then the ART");
  });

  it("every lead/focus key it can emit exists in the message catalog", () => {
    const r = messages.rights as unknown as Record<string, string>;
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
    const r = messages.rights as unknown as Record<string, string>;
    const prose = `${r.focusMerits} ${r.focusJudicial}`.toLowerCase();
    for (const banned of ["you should", "you must", "we recommend", "your best", "likely to succeed"]) {
      expect(prose, banned).not.toContain(banned);
    }
    // Each names the test the forum applies.
    expect(r.focusMerits!.toLowerCase()).toContain("correct or preferable");
    expect(r.focusJudicial!.toLowerCase()).toContain("how the decision was made");
  });
});

/**
 * Which forum a person is sent to is decision-specific, and naming the wrong one is the
 * most damaging error this product can make. The data layer is the lawyer-verified source
 * per decision type; the legal corpus only knows the GENERAL body per jurisdiction.
 *
 * Regression: preferring the corpus unconditionally meant the lawyer's value was never
 * reached, so Victorian fines and public housing both rendered "VCAT" — the wrong forum for
 * fines, and it silently dropped the free Housing Appeals Office step for housing.
 */
describe("the merits-review body is the one the lawyer verified for THAT decision", () => {
  function meritsBody(id: string): string | undefined {
    const e = getDataEntry(id)!;
    return planFor({
      avenue: avenueView(e),
      meritsReview: getProcess("merits-review")!,
      judicialReview: getProcess("judicial-review")!,
      jurisdiction: e.jurisdiction,
    }).paths.find((p) => p.id === "merits-review")?.body;
  }

  it("Victorian fines go to internal review then the Magistrates' Court, NOT VCAT", () => {
    const body = meritsBody("vic-fines");
    expect(body).toBe("internal review then Magistrates' Court");
    expect(body).not.toMatch(/VCAT/i);
  });

  it("public housing keeps the Housing Appeals Office step", () => {
    expect(meritsBody("vic-public-housing")).toMatch(/Housing Appeals Office/i);
  });

  it("a bare acronym is expanded from the corpus, not shown as a code", () => {
    expect(meritsBody("vic-renting")).toMatch(/^VCAT \(/);
  });

  it("Centrelink names the internal review before the tribunal", () => {
    // The lawyer's own wording wins over the corpus' general body name, which is the whole
    // point of the precedence rule above. The bare "ART" it replaced fell through to the
    // corpus and dropped a free first step people are entitled to.
    const body = meritsBody("cth-centrelink")!;
    expect(body).toMatch(/internal review/i);
    expect(body).toMatch(/ART/);
    expect(body.indexOf("internal review")).toBeLessThan(body.indexOf("ART"));
  });

  it("no entry ever renders an internal judicial-review code", () => {
    for (const e of listDataEntries()) {
      const plan = planFor({
        avenue: avenueView(e),
        meritsReview: getProcess("merits-review")!,
        judicialReview: getProcess("judicial-review")!,
        jurisdiction: e.jurisdiction,
      });
      for (const p of plan.paths) {
        // The codes themselves — not any slash: "The Federal Court / Federal Circuit and
        // Family Court" is the corpus' real name for the forum.
        expect(p.body).not.toMatch(/ADJR|SCV-O56/);
      }
    }
  });
});

/**
 * The scheme-specific criteria the supervising lawyer supplied on 2026-08-19. Until then the
 * field had no consumer at all, so these assert the wiring as much as the content.
 */
describe("merits-review criteria (what the tribunal decides for THIS decision)", () => {
  it("every decision type now carries criteria, and none leaks a placeholder", () => {
    for (const e of listDataEntries()) {
      expect(e.mrCriteria.length, e.id).toBeGreaterThan(0);
      for (const c of e.mrCriteria) expect(c, e.id).not.toContain("VERIFY");
    }
  });

  it("criteria reach the merits path and never the judicial one", () => {
    // Judicial review applies the grounds of review, not the enabling Act's criteria.
    // Showing a scheme's substantive test under a court would misdescribe what it does.
    const p = planFor({
      avenue: AV, meritsReview: merits, judicialReview: judicial,
      criteria: ["The tribunal decides whether the rules were applied correctly."],
    });
    expect(p.paths.find((x) => x.id === "merits-review")!.criteria).toHaveLength(1);
    expect(p.paths.find((x) => x.id === "judicial-review")!.criteria).toEqual([]);
  });

  it("omitting criteria is safe — the panel simply renders nothing", () => {
    const p = plan(AV);
    expect(p.paths[0]!.criteria).toEqual([]);
  });

  it("the housing criteria lead with legislation, not departmental policy", () => {
    // The draft put to the lawyer said the reviewer checks "its own policies and procedures".
    // They replaced it: policy guides a statutory decision, it does not supply the test — which
    // is also what our own unlawful-policy and inflexible-policy grounds hold.
    // Asserted over the whole set, not mrCriteria[0]: the housing entry now leads with the
    // routing split (Housing Appeals Office for a housing decision, VCAT for a notice to
    // vacate), so pinning this to an index made it break for the right reason.
    const housing = getDataEntry("vic-public-housing")!;
    const all = housing.mrCriteria.join(" ").toLowerCase();
    expect(all).toContain("legislation");
    expect(all).not.toMatch(/its own polic/);
    // And the routing split itself, which is what displaced it.
    expect(all).toMatch(/housing appeals office/);
    expect(all).toMatch(/notice to vacate/);
  });

  it("the heading that introduces them is customer copy and exists", () => {
    expect(messages.rights.pathCriteria).toBeTruthy();
  });
});

describe("conditional merits review (the catch-all entries)", () => {
  it("a conditional path is still SHOWN, not dropped", () => {
    // Setting available:false would have removed the merits path from the analysis entirely,
    // so a person using a catch-all entry would see only judicial review — hiding the cheaper
    // route from exactly the people least able to work out it might exist.
    const p = planFor({
      avenue: { ...AV, mrConditional: true },
      meritsReview: merits,
      judicialReview: judicial,
    });
    const mr = p.paths.find((x) => x.id === "merits-review");
    expect(mr, "merits path must survive").toBeDefined();
    expect(mr!.conditional).toBe(true);
    expect(p.primary?.id).toBe("merits-review");
  });

  it("both catch-all entries are marked conditional, and the specific ones are not", () => {
    for (const id of ["cth-generic", "vic-generic"]) {
      expect(getDataEntry(id)!.avenue.mr.conditional, id).toBe(true);
      expect(getDataEntry(id)!.avenue.mr.available, id).toBe(true);
    }
    for (const id of ["cth-centrelink", "vic-fines", "vic-public-housing", "vic-renting"]) {
      expect(getDataEntry(id)!.avenue.mr.conditional, id).toBe(false);
    }
  });

  it("the condition has customer copy to render", () => {
    expect(messages.rights.pathConditional).toBeTruthy();
  });
});

describe("conditional judicial review (public housing)", () => {
  it("a conditional judicial-review path is shown with its condition, not dropped", () => {
    // The public-housing entry covers the Director of Housing AND a community housing
    // provider. Judicial review supervises conferred PUBLIC power, and the flow never learns
    // which of them made the decision — the person picks an area, not a body. Dropping the
    // path would take a real route from the people who do have it; asserting it
    // unconditionally offers a Supreme Court proceeding to someone whose provider may not be
    // amenable to one. So it shows, with the condition attached.
    const p = planFor({
      avenue: { ...AV, jrConditional: true },
      meritsReview: merits,
      judicialReview: judicial,
    });
    const jr = p.paths.find((x) => x.id === "judicial-review");
    expect(jr, "judicial path must survive").toBeDefined();
    expect(jr!.conditional).toBe(true);
  });

  it("the housing entry is the one that carries it, and its copy exists", () => {
    const housing = getDataEntry("vic-public-housing")!;
    expect(housing.avenue.jr.available).toBe(true);
    expect(housing.avenue.jr.conditional).toBe(true);
    // A different condition from merits review, so a different sentence.
    expect(messages.rights.pathConditionalJudicial).toBeTruthy();
    expect(messages.rights.pathConditionalJudicial).not.toBe(messages.rights.pathConditional);
  });

  it("renting carries no judicial-review path at all, conditional or otherwise", () => {
    // A notice to vacate comes from a private rental provider. Settled 2026-08-23.
    expect(getDataEntry("vic-renting")!.avenue.jr.available).toBe(false);
  });
});

describe("the opening line matches the cards under it", () => {
  it("a conditional path gets the hedged lead, not the confident one", () => {
    const both = planFor({ avenue: AV, meritsReview: merits, judicialReview: judicial });
    expect(both.leadKey).toBe("analysisLeadBoth");

    for (const av of [{ ...AV, mrConditional: true }, { ...AV, jrConditional: true }]) {
      const p = planFor({ avenue: av, meritsReview: merits, judicialReview: judicial });
      expect(p.leadKey).toBe("analysisLeadBothConditional");
    }
  });

  it("the three entries that carry a condition all get it", () => {
    // Both catch-alls (merits review only where the enabling Act provides it) and public
    // housing (the court path, only where a public body decided).
    for (const id of ["cth-generic", "vic-generic", "vic-public-housing"]) {
      const e = getDataEntry(id)!;
      const p = planFor({
        avenue: avenueView(e),
        meritsReview: merits,
        judicialReview: judicial,
        jurisdiction: e.jurisdiction,
      });
      expect(p.leadKey, id).toBe("analysisLeadBothConditional");
    }
  });

  it("the specific entries keep the confident lead", () => {
    for (const id of ["cth-centrelink", "vic-fines"]) {
      const e = getDataEntry(id)!;
      const p = planFor({
        avenue: avenueView(e),
        meritsReview: merits,
        judicialReview: judicial,
        jurisdiction: e.jurisdiction,
      });
      expect(p.leadKey, id).toBe("analysisLeadBoth");
    }
  });

  it("the hedged lead exists and does not simply repeat the confident one", () => {
    const r = messages.rights as unknown as Record<string, string>;
    expect(r.analysisLeadBothConditional).toBeTruthy();
    expect(r.analysisLeadBothConditional).not.toBe(r.analysisLeadBoth);
    expect(r.analysisLeadBothConditional!.toLowerCase()).toContain("may be open");
  });
});
