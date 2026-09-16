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
  irAvailable: false,
  irBody: "",
  irConditional: false,
  courtAvailable: false,
  courtBody: "",
  courtConditional: false,
  mrAvailable: true,
  mrConditional: false,
  mrCharacter: "tribunal" as const,
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
    // the internal review by an Authorised Review Officer that comes first. That was first
    // fixed by naming both bodies in one string; on 2026-09-10 they became two paths, so the
    // reviewer and the tribunal each carry their own body.
    const t = triage({ jurisdiction: "Cth", decisionType: "Centrelink debt" });
    const p = plan(avenueView(t.entry));
    expect(p.paths.map((x) => x.id)).toEqual(["internal-review", "merits-review", "judicial-review"]);
    expect(p.primary?.id).toBe("internal-review");
    expect(p.primary?.body).toMatch(/Authorised Review Officer/);
    expect(p.paths.find((x) => x.id === "merits-review")?.body).toMatch(/Administrative Review Tribunal/);
  });

  it("the internal path leads, and claims none of a tribunal's powers", () => {
    // It is first because the corpus says so for the step in general — "often the first step,
    // and usually the cheapest one" — not because of anything about a person's case. And it
    // carries no question and no remedies: the same entry says the rules differ by department,
    // so there is no single answer about what the reviewer can do. Inheriting the tribunal's
    // is exactly the defect that put a departmental reviewer on a tribunal card.
    const p = plan({ ...AV, irAvailable: true, irBody: "an Authorised Review Officer" });
    const ir = p.paths.find((x) => x.id === "internal-review")!;
    expect(ir.order).toBe(1);
    expect(p.primary?.id).toBe("internal-review");
    expect(ir.question).toBe("");
    expect(ir.canDo).toEqual([]);
    expect(ir.cannotDo).toEqual([]);
    expect(ir.criteria).toEqual([]);
    expect(ir.focusKey).toBe("focusInternal");
    expect(ir.character).toBe("internal");
    // Merits review keeps everything it had; it has only moved down one place.
    const mr = p.paths.find((x) => x.id === "merits-review")!;
    expect(mr.order).toBe(2);
    expect(mr.question).toBe(merits.question);
    expect(mr.canDo).toEqual(merits.remedies);
  });

  it("a scheme with no internal review still starts at merits review", () => {
    // Renting: a notice to vacate comes from a private rental provider, so there is no
    // department to ask for another look. The path must be absent, not shown empty.
    const e = getDataEntry("vic-renting")!;
    expect(e.avenue.ir.available).toBe(false);
    const p = planFor({
      avenue: avenueView(e), meritsReview: merits, judicialReview: judicial,
      jurisdiction: e.jurisdiction,
    });
    expect(p.paths.some((x) => x.id === "internal-review")).toBe(false);
    expect(p.primary?.id).toBe("merits-review");
    expect(p.primary?.order).toBe(1);
  });

  it("an internal review with no named body is not shown as a path", () => {
    // available:true with an empty body would render a card headed "ask them to look at it
    // again" that never says who. The gap belongs to the data entry, not the reader.
    const p = plan({ ...AV, irAvailable: true, irBody: "" });
    expect(p.paths.some((x) => x.id === "internal-review")).toBe(false);
  });

  it("every lead/focus key it can emit exists in the message catalog", () => {
    const r = messages.rights as unknown as Record<string, string>;
    for (const key of [
      "analysisLeadBoth",
      "analysisLeadMerits",
      "analysisLeadJudicial",
      "analysisLeadNone",
      "focusInternal",
      "focusCourt",
      "focusMerits",
      "focusJudicial",
    ]) {
      expect(r[key], key).toBeTruthy();
    }
  });

  it("the strategy copy describes what the FORUM weighs — never what the reader must do", () => {
    const r = messages.rights as unknown as Record<string, string>;
    const prose = `${r.focusInternal} ${r.focusCourt} ${r.focusMerits} ${r.focusJudicial}`.toLowerCase();
    for (const banned of ["you should", "you must", "we recommend", "your best", "likely to succeed"]) {
      expect(prose, banned).not.toContain(banned);
    }
    // Each names the test the forum applies.
    expect(r.focusMerits!.toLowerCase()).toContain("correct or preferable");
    expect(r.focusJudicial!.toLowerCase()).toContain("how the decision was made");
  });

  it("the focus paragraph follows the BODY, not the slot it sits in", () => {
    // The last place the tribunal's test survived on a non-tribunal card, and the most
    // confusing one: for a Victorian fine the card stated "it decides what the correct or
    // preferable decision is" and then, three lines lower, that this one is a court hearing
    // the matter itself, not a review of the decision. Both on one card.
    const r = messages.rights as unknown as Record<string, string>;
    const focusOf = (character: "tribunal" | "internal" | "mixed" | "court") =>
      planFor({ avenue: { ...AV, mrCharacter: character }, meritsReview: merits, judicialReview: judicial })
        .paths.find((x) => x.id === "merits-review")!.focusKey;

    expect(focusOf("tribunal")).toBe("focusMerits");
    expect(focusOf("court")).toBe("focusCourt");
    expect(focusOf("internal")).toBe("focusInternal");
    expect(focusOf("mixed")).toBe("focusInternal");
    // The court's paragraph must not assert the tribunal's test.
    expect(r.focusCourt!.toLowerCase()).not.toContain("correct or preferable");
    expect(r.focusCourt!.toLowerCase()).toContain("hears the matter itself");
    // Judicial review is never touched by this: it is a court by design, with the corpus's
    // own question, not a borrowed one.
    expect(
      plan(AV).paths.find((x) => x.id === "judicial-review")!.focusKey,
    ).toBe("focusJudicial");
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
  function bodyFor(id: string, path: "internal-review" | "merits-review"): string | undefined {
    const e = getDataEntry(id)!;
    return planFor({
      avenue: avenueView(e),
      meritsReview: getProcess("merits-review")!,
      judicialReview: getProcess("judicial-review")!,
      jurisdiction: e.jurisdiction,
    }).paths.find((p) => p.id === path)?.body;
  }
  const meritsBody = (id: string) => bodyFor(id, "merits-review");
  const internalBody = (id: string) => bodyFor(id, "internal-review");

  it("Victorian fines have NO merits review, and the court is its own avenue", () => {
    // Three corrections live in this entry, and the last one removed the cause of the other
    // two. The forum was never VCAT — that was the original defect, and naming the wrong
    // forum is the most damaging thing this product can do. The internal review stopped
    // sharing a field with it on 2026-09-10. And on 2026-09-16 the Magistrates' Court left
    // the merits slot altogether: VCAT is Victoria's merits-review body, a court hearing an
    // infringement on election decides the CHARGE, and this scheme has no tribunal step at
    // all — which this entry's own first note has said since 2026-06-30.
    const e = getDataEntry("vic-fines")!;
    expect(e.avenue.mr.available).toBe(false);
    expect(e.avenue.court.available).toBe(true);
    expect(e.avenue.court.body).toMatch(/Magistrates' Court/);
    expect(e.avenue.court.body).not.toMatch(/VCAT/i);
    expect(internalBody("vic-fines")).toMatch(/Fines Victoria|issued the fine/i);

    const p = planFor({
      avenue: avenueView(e), meritsReview: merits, judicialReview: judicial,
      jurisdiction: e.jurisdiction, courtCriteria: e.courtCriteria,
    });
    expect(p.paths.map((x) => x.id)).toEqual([
      "internal-review",
      "court-election",
      "judicial-review",
    ]);
    // No merits card at all, so nothing can inherit a tribunal's question by sitting there.
    expect(p.paths.some((x) => x.id === "merits-review")).toBe(false);
  });

  it("the court path claims no tribunal powers, and keeps the lawyer's own line", () => {
    // It used to sit under a card headed MERITS REVIEW. Four separate patches followed — a
    // neutral title, a character flag, its own focus paragraph, a memo fix — before the
    // field itself was corrected. The path now carries no borrowed question and no borrowed
    // remedies because there is nothing to borrow from: it is not one of the two processes.
    const e = getDataEntry("vic-fines")!;
    const court = planFor({
      avenue: avenueView(e), meritsReview: merits, judicialReview: judicial,
      jurisdiction: e.jurisdiction, courtCriteria: e.courtCriteria,
    }).paths.find((x) => x.id === "court-election")!;
    expect(court.question).toBe("");
    expect(court.canDo).toEqual([]);
    expect(court.cannotDo).toEqual([]);
    expect(court.character).toBe("court");
    expect(court.focusKey).toBe("focusCourt");
    // What the lawyer supplied per scheme is sourced, and travels with the body it names.
    expect(court.criteria.join(" ")).toMatch(/the court decides the charge itself/);
  });

  it("public housing keeps the Housing Appeals Office step — now as its own path", () => {
    // The free HAO step was the thing the original VCAT-everywhere defect silently dropped.
    // It must still be reachable; since 2026-09-10 it is the internal path rather than half
    // of the merits string, which is why the tribunal card no longer claims its powers.
    expect(internalBody("vic-public-housing")).toMatch(/Housing Appeals Office/i);
    expect(meritsBody("vic-public-housing")).toMatch(/VCAT/);
  });

  it("a bare acronym is expanded from the corpus, not shown as a code", () => {
    expect(meritsBody("vic-renting")).toMatch(/^VCAT \(/);
  });

  it("Centrelink names the internal review before the tribunal", () => {
    // The lawyer's own wording wins over the corpus' general body name, which is the whole
    // point of the precedence rule above. The bare "ART" it replaced fell through to the
    // corpus and dropped a free first step people are entitled to. The order is now carried
    // by the paths themselves rather than by the word order inside one string.
    const e = getDataEntry("cth-centrelink")!;
    const p = planFor({
      avenue: avenueView(e), meritsReview: merits, judicialReview: judicial,
      jurisdiction: e.jurisdiction,
    });
    const ir = p.paths.find((x) => x.id === "internal-review")!;
    const mr = p.paths.find((x) => x.id === "merits-review")!;
    expect(ir.body).toMatch(/Services Australia/);
    expect(mr.body).toMatch(/Administrative Review Tribunal/);
    expect(ir.order).toBeLessThan(mr.order);
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
  it("every decision type carries criteria for a body it actually has", () => {
    // Asserted per AVENUE, not on mrCriteria alone. Victorian fines have no merits review
    // since 2026-09-16 — the Magistrates' Court moved to its own avenue — so an empty
    // mrCriteria there is correct, and demanding one would push the court's line back into
    // the slot the whole change was about emptying.
    for (const e of listDataEntries()) {
      const any = [...e.irCriteria, ...e.mrCriteria, ...e.courtCriteria];
      expect(any.length, e.id).toBeGreaterThan(0);
      for (const c of any) expect(c, e.id).not.toContain("VERIFY");
      if (e.avenue.mr.available) expect(e.mrCriteria.length, `${e.id} mr`).toBeGreaterThan(0);
      if (e.avenue.court.available) expect(e.courtCriteria.length, `${e.id} court`).toBeGreaterThan(0);
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
    // Asserted over IRCRITERIA since 2026-09-10: the sentence is about the Housing Appeals
    // Office, and the lists were split so each line sits under the body it names.
    const housing = getDataEntry("vic-public-housing")!;
    const all = housing.irCriteria.join(" ").toLowerCase();
    expect(all).toContain("legislation");
    expect(all).not.toMatch(/its own polic/);
    expect(all).toMatch(/housing appeals office/);
  });

  it("the heading that introduces them is customer copy and exists", () => {
    expect(messages.rights.pathCriteria).toBeTruthy();
  });
});

/**
 * The criteria follow the avenue, 2026-09-10.
 *
 * When internal review became its own path, the lawyer's per-scheme list stayed in
 * `mrCriteria`. For Victorian fines that list is the statutory grounds the ISSUING AGENCY
 * applies — mistake of identity, contrary to law, special circumstances — so they were
 * captioned "what they decide for a decision like yours" under a card naming the Magistrates'
 * Court, and appeared nowhere on the card of the body that actually applies them.
 */
describe("the criteria sit under the body they name", () => {
  const fines = () => getDataEntry("vic-fines")!;
  const housing = () => getDataEntry("vic-public-housing")!;

  it("the fines review grounds are the internal reviewer's, not the court's", () => {
    const ir = fines().irCriteria.join(" ").toLowerCase();
    const court = fines().courtCriteria.join(" ").toLowerCase();
    for (const grounds of ["mistake of identity", "contrary to law", "special circumstances"]) {
      expect(ir, grounds).toContain(grounds);
      expect(court, `${grounds} must not be attributed to the court`).not.toContain(grounds);
    }
    // What the court does is the court's line, and it moved with the court.
    expect(court).toContain("the court decides the charge itself");
    expect(fines().mrCriteria, "there is no merits review to describe").toEqual([]);
  });

  it("the fines lists carry only what each body decides, and no routing claim", () => {
    // The routing sentence used to sit on both lists. Withdrawn 2026-09-12: it was editorial
    // rather than the lawyer's, and it overstated the relationship between the two.
    for (const list of [fines().irCriteria, fines().courtCriteria]) {
      expect(list.join(" ")).not.toMatch(/not steps in order/i);
    }
    expect(fines().irCriteria.length).toBeGreaterThan(0);
    expect(fines().courtCriteria.length).toBeGreaterThan(0);
  });

  it("the housing routing line reaches the Housing Appeals Office card", () => {
    // THE most dangerous failure mode in this product: someone facing eviction sent to the
    // HAO, which is not their path, losing time they may not have. The HAO card is headed
    // "usually considered first", so the sentence saying it is the wrong body for a notice
    // to vacate must be ON that card — it was on the VCAT card only.
    const line = /the Housing Appeals Office is not the path\. That\s+goes to VCAT/i;
    expect(housing().irCriteria.join(" ")).toMatch(line);
    expect(housing().mrCriteria.join(" ")).toMatch(line);
  });

  it("VCAT's own criteria stay off the internal card", () => {
    const ir = housing().irCriteria.join(" ").toLowerCase();
    expect(ir).not.toContain("reasonable and proportionate");
    expect(housing().mrCriteria.join(" ").toLowerCase()).toContain("reasonable and proportionate");
  });

  it("planFor puts each list on its own path", () => {
    const e = fines();
    const p = planFor({
      avenue: avenueView(e), meritsReview: merits, judicialReview: judicial,
      jurisdiction: e.jurisdiction, criteria: e.mrCriteria,
      internalCriteria: e.irCriteria, courtCriteria: e.courtCriteria,
    });
    expect(p.paths.find((x) => x.id === "internal-review")!.criteria).toEqual(e.irCriteria);
    expect(p.paths.find((x) => x.id === "court-election")!.criteria).toEqual(e.courtCriteria);
    expect(p.paths.find((x) => x.id === "judicial-review")!.criteria).toEqual([]);
  });

  it("an entry with no internal criteria is unaffected", () => {
    // Centrelink's list is all about the tribunal ("The tribunal decides whether…"), so
    // there was nothing to move and the internal card carries none.
    const e = getDataEntry("cth-centrelink")!;
    expect(e.irCriteria).toEqual([]);
    expect(e.mrCriteria.length).toBeGreaterThan(0);
    const p = planFor({
      avenue: avenueView(e), meritsReview: merits, judicialReview: judicial,
      jurisdiction: e.jurisdiction, criteria: e.mrCriteria, internalCriteria: e.irCriteria,
    });
    expect(p.paths.find((x) => x.id === "internal-review")!.criteria).toEqual([]);
    expect(p.paths.find((x) => x.id === "merits-review")!.criteria.length).toBeGreaterThan(0);
  });

  it("no entry keeps internal criteria it cannot show", () => {
    // irCriteria with no internal path would be lawyer-supplied content rendered nowhere.
    for (const e of listDataEntries()) {
      if (e.irCriteria.length > 0) expect(e.avenue.ir.available, e.id).toBe(true);
    }
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

describe("a body that is not a tribunal does not borrow a tribunal's powers", () => {
  it("shows no question and no remedies for an internal or mixed body", () => {
    // The Housing Appeals Office sat in the merits field and inherited the tribunal
    // explainer whole — "set the decision aside and substitute a new one", which a
    // departmental reviewer cannot do. The owner ruled on 2026-08-23 to delete the claim
    // rather than wait for the supervising lawyer to say what the HAO can actually do.
    for (const character of ["internal", "mixed"] as const) {
      const p = planFor({
        avenue: { ...AV, mrCharacter: character },
        meritsReview: merits,
        judicialReview: judicial,
      });
      const mr = p.paths.find((x) => x.id === "merits-review")!;
      expect(mr, "the path itself must survive — it is a real, free avenue").toBeDefined();
      expect(mr.question, `${character}: no borrowed question`).toBe("");
      expect(mr.canDo, `${character}: no borrowed remedies`).toEqual([]);
      expect(mr.cannotDo, `${character}: no borrowed limits`).toEqual([]);
    }
  });

  it("a real tribunal still carries the corpus question and remedies", () => {
    const mr = plan(AV).paths.find((x) => x.id === "merits-review")!;
    expect(mr.question).toBe(merits.question);
    expect(mr.canDo).toEqual(merits.remedies);
  });

  it("public housing's tribunal half is a real tribunal, and keeps its powers", () => {
    // Until 2026-09-10 this entry was the reason the rule exists: the Housing Appeals Office
    // shared the merits field with VCAT, so the whole path was typed "mixed" and stripped of
    // the question and remedies — which cost VCAT claims that are true of it. With the HAO on
    // its own path, what is left in the merits field is VCAT alone.
    const e = getDataEntry("vic-public-housing")!;
    expect(e.avenue.mr.character).toBe("tribunal");
    const mr = planFor({
      avenue: avenueView(e), meritsReview: merits, judicialReview: judicial,
      jurisdiction: e.jurisdiction, criteria: e.mrCriteria,
    }).paths.find((x) => x.id === "merits-review")!;
    expect(mr.canDo).toEqual(merits.remedies);
    expect(mr.criteria.length).toBeGreaterThan(0);
    // And the reviewer it used to share the field with is still reachable, without them.
    const ir = planFor({
      avenue: avenueView(e), meritsReview: merits, judicialReview: judicial,
      jurisdiction: e.jurisdiction,
    }).paths.find((x) => x.id === "internal-review")!;
    expect(ir.body).toMatch(/Housing Appeals Office/i);
    expect(ir.canDo).toEqual([]);
  });
});

/**
 * Whether the paths run in order, 2026-09-11.
 *
 * The owner asked for the result to show a linear process followed in sequence. It is one
 * for some schemes and not for others, and the difference is not cosmetic: told that a
 * Victorian fine must go to internal review before court, a person can miss the
 * court-election window entirely. The corpus is explicit that it varies — "For SOME schemes
 * you have to do this first before an outside body will look at your case."
 *
 * So `pathsAre` is set only where the entry's OWN text already settles it, and the panel
 * says nothing about order where it does not.
 */
describe("whether the paths are steps or choices", () => {
  it("fines claim NEITHER order nor alternation, since the line that said so was withdrawn", () => {
    // It was marked "alternatives" on the strength of one editorial sentence — "internal
    // review and asking for the matter to be heard in court are two different choices, not
    // steps in order" — which the supervising lawyer never supplied and the owner withdrew
    // on 2026-09-12 as not right. Under the Infringements Act someone refused a review may
    // still elect to go to court while time remains, so the sentence overstated a
    // relationship the app cannot source either way. With it gone, the app claims neither.
    const e = getDataEntry("vic-fines")!;
    expect(e.avenue.pathsAre).toBeUndefined();
    const prose = [...e.irCriteria, ...e.mrCriteria].join(" ");
    expect(prose).not.toMatch(/not steps in order/i);
    expect(prose).not.toMatch(/two different choices/i);
  });

  it("public housing is alternatives, chosen by the kind of decision", () => {
    const e = getDataEntry("vic-public-housing")!;
    expect(e.avenue.pathsAre).toBe("alternatives");
    expect(e.irCriteria.join(" ")).toMatch(/depends on the decision/i);
  });

  it("Centrelink is a sequence, because its own deadline rule says so", () => {
    const e = getDataEntry("cth-centrelink")!;
    expect(e.avenue.pathsAre).toBe("sequence");
    expect(e.deadlineRule).toMatch(/first step is an internal review/i);
    expect(e.deadlineRule).toMatch(/separate step/i);
  });

  it("the catch-alls claim neither, because nothing settles it for an unknown decision", () => {
    for (const id of ["cth-generic", "vic-generic"]) {
      expect(getDataEntry(id)!.avenue.pathsAre, id).toBeUndefined();
    }
  });

  it("no entry claims a relation its own text does not support", () => {
    // The guard against someone setting this field from intuition later. An entry saying
    // "not steps in order" may never be marked a sequence, and vice versa.
    for (const e of listDataEntries()) {
      const prose = [...e.irCriteria, ...e.mrCriteria, e.deadlineRule].join(" ").toLowerCase();
      if (e.avenue.pathsAre === "sequence") {
        expect(prose, `${e.id}: marked a sequence`).not.toMatch(/not steps in order/);
      }
      if (e.avenue.pathsAre === "alternatives") {
        expect(prose, `${e.id}: marked alternatives`).toMatch(
          /not steps in order|depends on the decision|two different choices/,
        );
      }
    }
  });

  it("it reaches the plan, so the panel can say what the numbering means", () => {
    // Housing, which still carries it: the lawyer's own line is that which body applies
    // "depends on the decision". Fines lost theirs on 2026-09-12 and now claims neither.
    const e = getDataEntry("vic-public-housing")!;
    const p = planFor({
      avenue: avenueView(e), meritsReview: merits, judicialReview: judicial,
      jurisdiction: e.jurisdiction,
    });
    expect(p.pathsAre).toBe("alternatives");
    // And the numbering itself is still 1..n, in the order people consider them.
    expect(p.paths.map((x) => x.order)).toEqual([1, 2, 3]);

    const fines = getDataEntry("vic-fines")!;
    expect(
      planFor({
        avenue: avenueView(fines), meritsReview: merits, judicialReview: judicial,
        jurisdiction: fines.jurisdiction,
      }).pathsAre,
    ).toBeUndefined();
  });

  it("every line the panel can print for it exists, and the alternatives one denies order", () => {
    const r = messages.rights as unknown as Record<string, string>;
    for (const k of [
      "pathStepN", "pathOptionN",
      "pathsAreSequence", "pathsAreSequenceLabel",
      "pathsAreAlternatives", "pathsAreAlternativesLabel",
      "pathsAreUnknown", "pathsAreUnknownLabel",
    ]) {
      expect(r[k], k).toBeTruthy();
    }
    // The sentence a fines reader gets must actually deny the sequence, or the flag is
    // doing nothing.
    expect(r.pathsAreAlternatives!.toLowerCase()).toContain("not stages");
    expect(r.pathsAreAlternatives!.toLowerCase()).toContain("do not have to");
    // And it must not promise the opposite of the sequence copy.
    expect(r.pathsAreSequence!.toLowerCase()).toContain("in order");
    expect(r.pathsAreUnknown!.toLowerCase()).toContain("depends on the law");
  });
});
