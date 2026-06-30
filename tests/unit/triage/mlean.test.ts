import { describe, it, expect } from "vitest";
import { triage, avenueView } from "@/lib/triage";
import { listDataEntries } from "@/lib/data";
import { deadlineRuleView } from "@/lib/deadline/rule";
import { reasonsView, reasonsRequestTemplate, REASONS_CLOCK_WARNING } from "@/lib/reasons";
import { checkTripwire } from "@/lib/tripwire";
import { buildHandoff } from "@/lib/handoff";

describe("M-Lean triage (deterministic Rights Saver)", () => {
  it("branches on jurisdiction and selects the matching entry", () => {
    const vic = triage({ jurisdiction: "Vic", decisionType: "notice to vacate" });
    expect(vic.entry.id).toBe("vic-renting");
    expect(vic.avenue.mrBody).toBe("VCAT");

    const cth = triage({ jurisdiction: "Cth", decisionType: "Centrelink debt" });
    expect(cth.entry.id).toBe("cth-centrelink");
    expect(cth.avenue.mrBody).toBe("ART");
  });

  it("routes an unmatched decision to the jurisdiction fallback (still gets a path + help)", () => {
    const r = triage({ jurisdiction: "Vic", decisionType: "something unusual zzz" });
    expect(r.isFallback).toBe(true);
    expect(r.entry.id).toBe("vic-generic");
    expect(r.entry.getHelp.length).toBeGreaterThan(0);
  });

  it("never shows a body string with a VERIFY/source note", () => {
    const r = triage({ jurisdiction: "Vic", decisionType: "fine" });
    expect(/verify/i.test(r.avenue.mrBody)).toBe(false);
    expect(r.avenue.mrBody).not.toContain("(");
  });

  it("never leaks a VERIFY marker into any displayed avenue field (incl. noReviewEndpoint)", () => {
    for (const e of listDataEntries()) {
      const a = avenueView(e);
      expect(/verify/i.test(a.mrBody)).toBe(false);
      expect(/verify/i.test(a.jrForum)).toBe(false);
      expect(/verify/i.test(a.noReviewEndpoint ?? "")).toBe(false);
    }
  });
});

describe("time-limit note (brief + generic; no countdown, no VERIFY)", () => {
  it("every entry yields a non-empty rule with no day-count countdown and no VERIFY leak", () => {
    for (const e of listDataEntries()) {
      const dl = deadlineRuleView(e);
      expect(dl.rule.length).toBeGreaterThan(0);
      // No computed countdown / "X days left", and no leaked placeholder.
      expect(dl.rule.toLowerCase()).not.toContain("days left");
      expect(/verify/i.test(dl.rule)).toBe(false);
      expect(/verify/i.test(dl.sourceUrl ?? "")).toBe(false);
    }
  });

  it("points the renter to the relevant Act + a way to confirm the exact limit", () => {
    const r = triage({ jurisdiction: "Vic", decisionType: "notice to vacate" });
    const dl = deadlineRuleView(r.entry);
    expect(dl.rule).toContain("Residential Tenancies Act 1997");
    expect(dl.rule.toLowerCase()).toContain("check the exact limit");
  });
});

describe("reasons (corrected clock warning)", () => {
  it("the clock warning says reasons never pause judicial review", () => {
    expect(REASONS_CLOCK_WARNING.toLowerCase()).toContain("does not pause");
    expect(REASONS_CLOCK_WARNING.toLowerCase()).toContain("judicial review");
  });

  it("a seed provision is hidden (no VERIFY leak) and the template has no advice", () => {
    const r = triage({ jurisdiction: "Cth", decisionType: "Centrelink debt" });
    const v = reasonsView(r.entry);
    expect(v.provision).toBeNull();
    const tpl = reasonsRequestTemplate(r.entry, { decisionMaker: "Services Australia" });
    expect(tpl.toLowerCase()).not.toContain("verify");
    expect(tpl.toLowerCase()).not.toContain("you should");
    expect(tpl).toContain("statement of the reasons");
  });
});

describe("tripwire (stop and route)", () => {
  it("stops for family/guardianship/mental-health", () => {
    const r = checkTripwire({ jurisdiction: "Vic", flags: { family: true } });
    expect(r.stop).toBe(true);
    expect(r.reasons).toContain("family-guardianship-mental-health");
  });

  it("stops for migration (out of scope), imminent deadline, and a privative clause", () => {
    expect(checkTripwire({ jurisdiction: "Cth", flags: { migration: true } }).stop).toBe(true);
    expect(checkTripwire({ jurisdiction: "Vic", flags: { deadlineImminentOrPassed: true } }).stop).toBe(true);
    expect(checkTripwire({ jurisdiction: "Vic", flags: {}, entry: { privativeClause: true } }).stop).toBe(true);
    expect(checkTripwire({ jurisdiction: "Vic", flags: {}, unclassifiable: true }).stop).toBe(true);
  });

  it("does not stop a clean matter", () => {
    expect(checkTripwire({ jurisdiction: "Vic", flags: {}, entry: { privativeClause: false } }).stop).toBe(false);
  });
});

describe("handoff pack", () => {
  it("summarises the matter without leaking VERIFY and states the generic time-limit rule", () => {
    const r = triage({ jurisdiction: "Vic", decisionType: "notice to vacate" });
    const pack = buildHandoff({ triage: r, decisionAbout: "a notice to vacate", reasonsRequested: false });
    expect(pack.toLowerCase()).not.toContain("verify");
    expect(pack).toContain("MATTER SUMMARY");
    expect(pack).toContain("Victoria");
    expect(pack).toContain("TIME LIMIT:");
    expect(pack.toLowerCase()).toContain("check the exact limit");
    expect(pack.toLowerCase()).toContain("not stored");
  });

  it("includes the person's selected grounds as neutral points to discuss, not conclusions", () => {
    const r = triage({ jurisdiction: "Vic", decisionType: "notice to vacate" });
    const pack = buildHandoff({
      triage: r,
      relatedGrounds: ["You weren't given a fair chance"],
    });
    expect(pack).toContain("GROUNDS THAT MIGHT RELATE");
    expect(pack).toContain("You weren't given a fair chance");
    expect(pack.toLowerCase()).toContain("not conclusions");
  });
});
