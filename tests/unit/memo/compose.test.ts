import { describe, it, expect } from "vitest";
import { composeMemo } from "@/lib/memo/compose";
import { getProcess, listGrounds } from "@/lib/legal";
import { getDataEntry } from "@/lib/data";
import messages from "@/lib/i18n/messages/en.json";
import patterns from "@/lib/safety/no-advice-patterns.json";

const merits = getProcess("merits-review")!;
const judicial = getProcess("judicial-review")!;
const entry = getDataEntry("cth-centrelink")!;
const R = messages.rights as unknown as Record<string, string>;
const t = (k: string) => R[k] ?? k;

const base = {
  entry,
  process: merits,
  grounds: [] as ReturnType<typeof listGrounds>,
  story: "",
  goals: [] as string[],
  goalOther: "",
  forum: "the Administrative Review Tribunal",
  t,
};

describe("the memo", () => {
  it("follows IRAC: the question, the rule, what relates, and the answer back", () => {
    const m = composeMemo({
      ...base,
      grounds: listGrounds().filter((g) => g.id === "procedural-fairness-hearing"),
    });
    const b = m.body;
    expect(b).toContain(t("memoIssue1").toUpperCase());
    expect(b).toContain(t("memoRule"));
    expect(b).toContain(t("memoArgument"));
    // The half people have no idea about: what the other side will put back.
    expect(b).toContain(t("memoCounter"));
  });

  it("never predicts an outcome and never ranks a ground", () => {
    // The owner's worked memoranda DO both — "prospects of success are high", "the strongest
    // ground". This is the line the app does not cross, so it is asserted directly rather
    // than left to the copy gate, which only reads en.json and not composed output.
    const m = composeMemo({
      ...base,
      process: judicial,
      grounds: listGrounds().slice(0, 6),
      story: "They never told me the debt existed until it went to a collector.",
      goals: ["A different decision"],
    });
    const b = m.body.toLowerCase();
    // The pattern file holds { pattern, why } objects, not bare strings.
    const rules = [...patterns.prediction, ...patterns.score] as { pattern: string; why: string }[];
    for (const r of rules) {
      expect(new RegExp(r.pattern, "i").test(b), `${r.why}: ${r.pattern}`).toBe(false);
    }
    expect(b).not.toMatch(/strongest|most likely to succeed|good chance|prospects/);
  });

  it("quotes the person's account and never characterises it", () => {
    const story = "I asked three times and nobody called me back.";
    const m = composeMemo({ ...base, story });
    expect(m.body).toContain(`"${story}"`);
  });

  it("leaves out the account section entirely when they wrote nothing", () => {
    const m = composeMemo({ ...base, story: "   " });
    expect(m.body).not.toContain(t("memoYourAccount"));
  });

  it("carries the scheme's own criteria on the merits path", () => {
    const m = composeMemo({ ...base, process: merits });
    // cth-centrelink's lawyer-supplied criteria, not the generic framing.
    expect(m.body).toMatch(/rules were applied correctly/i);
  });

  it("does not put merits criteria under judicial review", () => {
    // JR applies the grounds of review, not the enabling Act's criteria. Showing a scheme's
    // substantive test under a court would misdescribe what the court does.
    const m = composeMemo({ ...base, process: judicial });
    expect(m.body).not.toMatch(/rules were applied correctly to your situation/i);
  });

  it("says it is not advice, at the top and at the bottom", () => {
    const m = composeMemo({ ...base });
    const hits = m.body.split(t("memoNotAdvice")).length - 1;
    expect(hits).toBeGreaterThanOrEqual(2);
  });

  it("orders grounds as given and adds no commentary about which is better", () => {
    const gs = listGrounds().slice(0, 3);
    const m = composeMemo({ ...base, grounds: gs });
    const idx = gs.map((g) => m.body.indexOf(g.name));
    expect(idx.every((n) => n > -1)).toBe(true);
    expect([...idx]).toEqual([...idx].sort((a, b) => a - b));
  });

  it("tells someone whose time may have passed that a late application can be asked for", () => {
    const m = composeMemo({ ...base });
    expect(m.body.toLowerCase()).toContain("late application");
  });
});
