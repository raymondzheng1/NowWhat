import { describe, it, expect } from "vitest";
import { triage, avenueView } from "@/lib/triage";
import { listDataEntries } from "@/lib/data";
import { deadlineRuleView } from "@/lib/deadline/rule";
import { reasonsView, reasonsRequestTemplate, REASONS_CLOCK_WARNING } from "@/lib/reasons";
import {
  checkTripwire,
  capabilitiesForStop,
  TRIPWIRE_MESSAGE_KEYS,
  URGENT_REASONS,
} from "@/lib/tripwire";
import messages from "@/lib/i18n/messages/en.json";
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

  it("no entry ever leaks a VERIFY placeholder as a provision", () => {
    // Provisions were real as at 2026-08-17. This asserts the invariant rather than the
    // value, so it keeps holding whichever way the data moves.
    for (const e of listDataEntries()) {
      expect(e.reasonsRequest.provision, e.id).toBeTruthy();
      expect(reasonsView(e).provision ?? "", e.id).not.toContain("VERIFY");
    }
  });

  it("a provision still carrying VERIFY is suppressed, not shown", () => {
    const real = triage({ jurisdiction: "Cth", decisionType: "Centrelink debt" }).entry;
    const unconfirmed = {
      ...real,
      reasonsRequest: { ...real.reasonsRequest, provision: "VERIFY (not yet confirmed)" },
    };
    expect(reasonsView(unconfirmed).provision).toBeNull();
    expect(reasonsRequestTemplate(unconfirmed, { decisionMaker: "X" }).toLowerCase()).not.toContain("verify");
  });

  it("the reasons template carries no advice", () => {
    const r = triage({ jurisdiction: "Cth", decisionType: "Centrelink debt" });
    const tpl = reasonsRequestTemplate(r.entry, { decisionMaker: "Services Australia" });
    expect(tpl.toLowerCase()).not.toContain("verify");
    expect(tpl.toLowerCase()).not.toContain("you should");
    expect(tpl).toContain("statement of the reasons");
  });
});

describe("tripwire — two tiers: STOP (out of scope) vs URGENT (timing)", () => {
  it("stops for the high-harm / out-of-scope decisions", () => {
    for (const flags of [{ family: true }, { criminal: true }, { detention: true }, { migration: true }]) {
      const r = checkTripwire({ jurisdiction: "Vic", flags });
      expect(r.stop, JSON.stringify(flags)).toBe(true);
    }
    expect(checkTripwire({ jurisdiction: "Vic", flags: {}, entry: { privativeClause: true } }).stop).toBe(true);
  });

  it("a family/guardianship/mental-health DECISION still routes to a person", () => {
    const r = checkTripwire({ jurisdiction: "Vic", flags: { family: true } });
    expect(r.stop).toBe(true);
    expect(r.stopReasons).toContain("family-guardianship-mental-health");
  });

  it("timing flags are URGENT, not a stop — the person still gets their options", () => {
    // This is the fix for the service being a dead end: the two most commonly ticked
    // boxes are about being in a hurry, which is when guidance matters most.
    for (const flags of [{ deadlineImminentOrPassed: true }, { hearingBooked: true }]) {
      const r = checkTripwire({ jurisdiction: "Vic", flags });
      expect(r.stop, JSON.stringify(flags)).toBe(false);
      expect(r.urgent, JSON.stringify(flags)).toBe(true);
      expect(r.urgentReasons.length).toBeGreaterThan(0);
    }
  });

  it("a stop still wins when it coincides with an urgent timing flag", () => {
    const r = checkTripwire({
      jurisdiction: "Vic",
      flags: { criminal: true, deadlineImminentOrPassed: true },
    });
    expect(r.stop).toBe(true);
    expect(r.urgent).toBe(true);
    expect(r.stopReasons).toContain("criminal");
    expect(r.urgentReasons).toContain("deadline-imminent-or-passed");
  });

  it("does not stop a clean matter", () => {
    const r = checkTripwire({ jurisdiction: "Vic", flags: {}, entry: { privativeClause: false } });
    expect(r.stop).toBe(false);
    expect(r.urgent).toBe(false);
    expect(r.reasons).toEqual([]);
  });

  it("every urgent reason tells the person to act today", () => {
    const tw = messages.rights.tripwire as Record<string, string>;
    for (const r of URGENT_REASONS) {
      const key = TRIPWIRE_MESSAGE_KEYS[r].split(".")[1]!;
      expect(tw[key]!.toLowerCase()).toMatch(/today/);
    }
  });

  it("every tripwire reason resolves to a real message", () => {
    const tw = messages.rights.tripwire as Record<string, string>;
    for (const key of Object.values(TRIPWIRE_MESSAGE_KEYS)) {
      expect(tw[key.split(".")[1]!], key).toBeTruthy();
    }
  });

  it("no stop reason offers a draft letter; the serious cohorts are marked urgent", () => {
    // Writing unsupervised to a child-protection department, a treating authority or a
    // prosecuting agency creates evidence in forums none of our sources cover.
    expect(capabilitiesForStop(["criminal"]).urgentPerson).toBe(true);
    expect(capabilitiesForStop(["family-guardianship-mental-health"]).urgentPerson).toBe(true);
    expect(capabilitiesForStop(["detention"]).urgentPerson).toBe(true);
    expect(capabilitiesForStop(["migration"]).urgentPerson).toBe(false);
    // Most-restrictive wins across a mixed set.
    expect(capabilitiesForStop(["migration", "criminal"]).urgentPerson).toBe(true);
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
