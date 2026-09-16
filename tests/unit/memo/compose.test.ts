import { describe, it, expect } from "vitest";
import { composeMemo } from "@/lib/memo/compose";
import { getConcept, getProcess, listGrounds } from "@/lib/legal";
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

describe("the person's own words on a ground", () => {
  it("appear under that ground, quoted, and are never characterised", () => {
    // Marking a ground said "this sounds like my situation" and nothing more, so the memo
    // could set out the law on a point with not a word from the person about what actually
    // happened on it. The memo read as though the points were ours.
    const g = listGrounds().filter((x) => x.id === "procedural-fairness-hearing");
    const note = "They used a report I was never shown, and nobody asked me about it.";
    const m = composeMemo({ ...base, grounds: g, groundNotes: { [g[0]!.id]: note } });
    expect(m.body).toContain(`"${note}"`);
    expect(m.body).toContain(t("memoYourNote"));
    // Quoted, not characterised: no claim it proves, supports or makes out anything.
    const around = m.body.slice(Math.max(0, m.body.indexOf(note) - 400), m.body.indexOf(note));
    expect(around.toLowerCase()).not.toMatch(/proves|shows that|establishes|supports the ground/);
  });

  it("a note for a ground they did not mark never reaches the memo", () => {
    const g = listGrounds().filter((x) => x.id === "procedural-fairness-hearing");
    const m = composeMemo({
      ...base,
      grounds: g,
      groundNotes: { "improper-purpose": "Something about a different ground entirely." },
    });
    expect(m.body).not.toContain("a different ground entirely");
  });

  it("composes without notes at all — the field is optional", () => {
    const g = listGrounds().filter((x) => x.id === "procedural-fairness-hearing");
    expect(() => composeMemo({ ...base, grounds: g })).not.toThrow();
    expect(composeMemo({ ...base, grounds: g }).body).not.toContain(t("memoYourNote"));
  });

  it("still never predicts or ranks, with notes attached", () => {
    const rules = [...patterns.prediction, ...patterns.score] as { pattern: string; why: string }[];
    const m = composeMemo({
      ...base,
      grounds: listGrounds().slice(0, 4),
      groundNotes: Object.fromEntries(listGrounds().slice(0, 4).map((x) => [x.id, "It happened to me."])),
    });
    for (const r of rules) {
      expect(new RegExp(r.pattern, "i").test(m.body.toLowerCase()), r.why).toBe(false);
    }
  });
});

describe("the memo opens with the shape of the matter", () => {
  it("summarises the decision, what they want, and the approach — before quoting anyone", () => {
    // Someone handing this to a duty lawyer needs the shape in the first few lines. It used
    // to open on the header block and go straight to quoting the person back at themselves.
    const m = composeMemo({
      ...base,
      goals: ["A different decision"],
      decisionDate: "2026-08-01",
      grounds: listGrounds().slice(0, 2),
    });
    // Section headings are uppercased by the composer, so match that form.
    const summaryAt = m.body.indexOf(t("memoSummary").toUpperCase());
    const toldAt = m.body.indexOf(t("memoWhatYouTold").toUpperCase());
    expect(summaryAt).toBeGreaterThan(-1);
    expect(summaryAt, "the summary comes before the quotes").toBeLessThan(toldAt);
    expect(m.body).toContain("2026-08-01");
    expect(m.body.toLowerCase()).toContain("a different decision");
    // Two points marked, so it says so — a count, never a view on their worth.
    expect(m.body).toContain(t("memoSummaryPoints").replace("{n}", "2"));
  });

  it("merits-review criteria carry the person's own words too", () => {
    // Merits review is not argued on grounds of review, so a memo about it needs their words
    // against what the tribunal actually decides.
    const merits = getProcess("merits-review")!;
    const c = entry.mrCriteria[0]!;
    const m = composeMemo({
      ...base,
      process: merits,
      criteriaNotes: { [c]: "The income figure they used was from the wrong year." },
    });
    expect(m.body).toContain(c);
    expect(m.body).toContain('"The income figure they used was from the wrong year."');
  });

  it("still never predicts or ranks, summary and criteria notes included", () => {
    const rules = [...patterns.prediction, ...patterns.score] as { pattern: string; why: string }[];
    const m = composeMemo({
      ...base,
      goals: ["A different decision", "To be treated fairly"],
      grounds: listGrounds().slice(0, 3),
      criteriaNotes: Object.fromEntries(entry.mrCriteria.map((x) => [x, "This happened to me."])),
    });
    for (const r of rules) {
      expect(new RegExp(r.pattern, "i").test(m.body.toLowerCase()), r.why).toBe(false);
    }
  });
});

/**
 * The internal-review memo, added 2026-09-10 with the third path.
 *
 * Internal review is not one of the two lawyer-verified PROCESSES, so `process` is null and
 * everything the memo says about the step comes from the corpus CONCEPT instead. The defect
 * this guards against is the one that started the whole split: a departmental reviewer
 * inheriting a tribunal's question, remedies and limits because it happened to share a field
 * with one.
 */
describe("a memo about internal review borrows nothing from a tribunal", () => {
  const internal = getConcept("internal-review")!;
  const base = {
    entry: getDataEntry("cth-centrelink")!,
    grounds: [],
    story: "They cut my payment without telling me why.",
    goals: ["The decision changed"],
    goalOther: "",
    forum: "Services Australia — an Authorised Review Officer (ARO)",
    t: (k: string) => k,
  };

  it("composes from the concept when there is no process", () => {
    const m = composeMemo({ ...base, process: null, internal });
    expect(m.body).toContain("memoIssue1Internal".toUpperCase());
    expect(m.body).toContain("memoIssue2Internal".toUpperCase());
    // The concept's own words, not ours.
    expect(m.body).toContain(internal.keyPoints[0]!);
    expect(m.body).toContain("Many schemes let you ask the department");
  });

  it("carries no tribunal question, no remedies and no limits", () => {
    // The exact strings the composer emits, NOT prettier-looking variants of them. An
    // earlier draft of this test asserted the absence of "MEMOWHATITCANDO", which the
    // composer never writes in ANY memo — a check that could not fail and proved nothing.
    // `h()` upper-cases its heading; `sub()` writes the key as it is. The casing follows that.
    const m = composeMemo({ ...base, process: null, internal });
    expect(m.body).not.toContain("correct or preferable");
    expect(m.body, "sub() writes the key as it is").not.toContain("memoWhatItCanDo");
    expect(m.body).not.toContain("memoWhatItCannotDo");
    expect(m.body).not.toContain("memoQuestionAsked");
    // Trailing newline, because h() writes the heading and then a rule line — and
    // "MEMOISSUE1" is a prefix of the internal heading "MEMOISSUE1INTERNAL".
    expect(m.body, "the process heading, not the internal one").not.toContain("MEMOISSUE1\n");
    expect(m.body).not.toContain("MEMOISSUE2\n");
  });

  it("quotes what they said they want looked at again, and never characterises it", () => {
    // Asserted STRUCTURALLY, not by banned phrases. An earlier draft checked that the body
    // did not contain "this shows" or "supports" — strings the composer never emits in any
    // branch, so the check could not fail and proved nothing about characterisation.
    //
    // What can fail: the section holds a label and the quote, and nothing else. Any sentence
    // added around their words — "this supports the ground", "this indicates…" — is a line
    // this does not allow, whatever it is worded as.
    const note = "They never got the medical certificate I sent in March.";
    const m = composeMemo({ ...base, process: null, internal, internalNote: note });
    const lines = m.body.split("\n");
    const at = lines.findIndex((l) => l.includes(note));
    expect(at, "the note must appear").toBeGreaterThan(-1);
    expect(lines[at]!.trim()).toBe(`"${note}"`);
    expect(lines[at - 1]!.trim()).toBe("memoYourNote:");
    // The heading above it, and then nothing else on the subject.
    expect(lines.filter((l) => l.includes(note))).toHaveLength(1);
    expect(lines[at + 1] ?? "").toBe("");
  });

  it("still carries the time-limit warning and the source block", () => {
    const m = composeMemo({ ...base, process: null, internal });
    expect(m.body).toContain("memoTimeCheck");
    expect(m.body).toContain(base.entry.sourceUrl);
    expect(m.body).toContain(base.entry.verifiedAsAt);
  });

  it("names the reviewer as the path, not merits review", () => {
    const m = composeMemo({ ...base, process: null, internal });
    expect(m.body).toContain(internal.plainName);
    expect(m.body).not.toContain("Merits review");
  });

  it("a process memo is unchanged by any of this", () => {
    const m = composeMemo({ ...base, process: getProcess("merits-review")!, internal: null });
    expect(m.body).toContain("correct or preferable");
    expect(m.body).toContain("MEMOISSUE1\n");
    expect(m.body).toContain("memoWhatItCanDo");
    expect(m.body).not.toContain("MEMOISSUE1INTERNAL");
  });
});

/**
 * A body that is not a tribunal does not get a tribunal's question, remedies or limits — the
 * rule `planFor` and the result card have applied since 2026-08-23. The memo went on breaking
 * it, because it re-derived everything from the PROCESS rather than from the path: choose the
 * merits path for a Victorian fine and the memo told a duty lawyer that the Magistrates' Court
 * asks "Is this the correct or preferable decision?" and can substitute its own decision.
 */
describe("the memo does not lend a tribunal's powers to a body that is not one", () => {
  const fines = getDataEntry("vic-fines")!;
  const shared = {
    entry: fines,
    grounds: [],
    story: "",
    goals: [],
    goalOther: "",
    forum: "the Magistrates' Court, if you elect to have it heard there",
    t: (k: string) => k,
  };

  it("a court on the merits path carries no tribunal question and no remedies", () => {
    const m = composeMemo({
      ...shared,
      process: merits,
      character: "court",
      // The scheme that prompted this rule, vic-fines, no longer has a merits path at all:
      // the Magistrates' Court became its own avenue on 2026-09-16. The RULE still matters —
      // housing still puts a non-tribunal in that slot — so the example is the character,
      // with the court's own criterion standing in for whatever sits there.
      criteria: fines.courtCriteria,
    });
    expect(m.body).not.toContain("correct or preferable");
    expect(m.body).not.toContain("memoWhatItCanDo");
    expect(m.body).not.toContain("memoWhatItCannotDo");
    expect(m.body).not.toContain("memoQuestionAsked");
    // It says so, rather than leaving a blank where the powers were.
    expect(m.body).toContain("memoNotATribunal");
    // And the lawyer's line about what the court does is still there.
    expect(m.body).toContain("the court decides the charge itself");
  });

  it("the same memo for a real tribunal is unchanged", () => {
    const m = composeMemo({ ...shared, process: merits, character: "tribunal" });
    expect(m.body).toContain("correct or preferable");
    expect(m.body).toContain("memoWhatItCanDo");
    expect(m.body).not.toContain("memoNotATribunal");
  });

  it("judicial review keeps its own question and remedies — it is a court by design", () => {
    // The court process's question and remedies are the corpus's own for that path, not
    // borrowed ones, so the non-tribunal rule must never strip them.
    const m = composeMemo({ ...shared, process: judicial, character: "court" });
    expect(m.body).toContain(judicial.question);
    expect(m.body).toContain("memoWhatItCanDo");
    expect(m.body).not.toContain("memoNotATribunal");
  });

  it("the internal memo shows the scheme's own criteria where the lawyer supplied them", () => {
    const m = composeMemo({
      ...shared,
      process: null,
      internal: getConcept("internal-review")!,
      criteria: fines.irCriteria,
      forum: "the agency that issued the fine, or Fines Victoria",
    });
    expect(m.body).toContain("mistake of identity");
    expect(m.body).toContain("special circumstances");
  });

  it("the summary counts the sections the memo actually has", () => {
    const withNote = composeMemo({
      ...shared, process: null, internal: getConcept("internal-review")!,
      internalNote: "They never saw my medical certificate.",
    });
    expect(withNote.body).toContain("memoSummaryReadsInternal");
    expect(withNote.body).toContain("MEMOISSUE3INTERNAL");

    // Blank box: the third section does not exist, so the summary must not announce it.
    const blank = composeMemo({
      ...shared, process: null, internal: getConcept("internal-review")!, internalNote: "  ",
    });
    expect(blank.body).toContain("memoSummaryReadsInternalShort");
    expect(blank.body).not.toContain("memoSummaryReadsInternal\n");
    expect(blank.body).not.toContain("MEMOISSUE3INTERNAL");
  });
});

/**
 * The memo became THE document on 2026-09-11.
 *
 * The hand-over used to build a second, thinner "matter summary" from lib/handoff, so a
 * person walked through an analysis on one step and was handed a different paper on the
 * next — and the thinner one was the one offered to the legal service. That module is gone;
 * the one thing it carried that the memo did not was the list of every avenue, which is the
 * first thing a duty lawyer asks. It lives here now.
 */
describe("the memo lists every path, not only the one being worked through", () => {
  const base = {
    entry: getDataEntry("cth-centrelink")!,
    process: merits,
    grounds: [],
    story: "",
    goals: [],
    goalOther: "",
    forum: "the Administrative Review Tribunal",
    t: (k: string) => k,
  };
  const PATHS = [
    { name: "Internal review", body: "an Authorised Review Officer", question: "", conditional: false },
    { name: "Merits review", body: "the ART", question: "Is this the correct or preferable decision?", conditional: false },
    { name: "Judicial review", body: "the Federal Court", question: "Was the decision made lawfully?", conditional: true },
  ];

  it("names each avenue and the body that hears it", () => {
    const m = composeMemo({ ...base, paths: PATHS });
    expect(m.body).toContain("MEMOPATHSTITLE");
    expect(m.body).toContain("Internal review: an Authorised Review Officer");
    expect(m.body).toContain("Merits review: the ART");
    expect(m.body).toContain("Judicial review: the Federal Court");
  });

  it("marks a conditional path as one that may not apply", () => {
    const m = composeMemo({ ...base, paths: PATHS });
    const jr = m.body.split("\n").find((l) => l.includes("Judicial review:"))!;
    expect(jr).toContain("memoPathsConditional");
    const mr = m.body.split("\n").find((l) => l.includes("Merits review:"))!;
    expect(mr).not.toContain("memoPathsConditional");
  });

  it("says nothing at all when there is only one path — there is no choice to report", () => {
    const m = composeMemo({ ...base, paths: [PATHS[1]!] });
    expect(m.body).not.toContain("MEMOPATHSTITLE");
  });

  it("composes without the field, because it is optional", () => {
    expect(() => composeMemo({ ...base })).not.toThrow();
    expect(composeMemo({ ...base }).body).not.toContain("MEMOPATHSTITLE");
  });

  it("still predicts nothing and ranks nothing with the paths attached", () => {
    const rules = [...patterns.prediction, ...patterns.score] as { pattern: string; why: string }[];
    const m = composeMemo({ ...base, paths: PATHS, t });
    for (const r of rules) {
      expect(new RegExp(r.pattern, "i").test(m.body.toLowerCase()), r.why).toBe(false);
    }
  });
});

/**
 * The memo links back into the app's own guides (2026-09-11).
 *
 * It set out the test for each point and the cases it comes from, then stopped — so someone
 * holding the memo who wanted the full explanation of a ground had no route from the paper
 * to the page that explains it. All 17 grounds already have one.
 */
describe("the memo points back at the knowledge base", () => {
  const g = listGrounds().filter((x) => x.id === "procedural-fairness-hearing");
  const base = {
    entry: getDataEntry("cth-centrelink")!,
    process: judicial,
    grounds: g,
    story: "",
    goals: [],
    goalOther: "",
    forum: "the Federal Court",
    t: (k: string) => k,
  };

  it("links each ground to its own explainer", () => {
    const m = composeMemo({ ...base, siteUrl: "https://example.test" });
    expect(m.body).toContain("https://example.test/learn/grounds/procedural-fairness-hearing");
  });

  it("links the path being worked through", () => {
    const m = composeMemo({
      ...base, siteUrl: "https://example.test/", pathHref: "/learn/judicial-review",
    });
    // Trailing slash on the base must not double up.
    expect(m.body).toContain("https://example.test/learn/judicial-review");
    expect(m.body).not.toContain("example.test//learn");
  });

  it("composes with no links at all when no base URL is known", () => {
    const m = composeMemo({ ...base });
    expect(m.body).not.toContain("memoReadMore");
    expect(m.body).not.toContain("/learn/");
  });

  it("every ground the memo can name has a page to link to", () => {
    // The link is built from the ground id, so a ground without a page would publish a 404
    // into a document someone hands to a lawyer. The route generates one per listed ground,
    // which is the invariant this pins.
    const ids = new Set(listGrounds().map((x) => x.id));
    const m = composeMemo({ ...base, grounds: listGrounds(), siteUrl: "https://example.test" });
    const linked = [...m.body.matchAll(/\/learn\/grounds\/([a-z-]+)/g)].map((x) => x[1]!);
    expect(linked.length).toBe(listGrounds().length);
    for (const id of linked) expect(ids.has(id), id).toBe(true);
  });

  it("still predicts nothing, with the links attached", () => {
    const rules = [...patterns.prediction, ...patterns.score] as { pattern: string; why: string }[];
    const m = composeMemo({ ...base, grounds: listGrounds(), siteUrl: "https://example.test", t });
    for (const r of rules) {
      expect(new RegExp(r.pattern, "i").test(m.body.toLowerCase()), r.why).toBe(false);
    }
  });
});

/**
 * Options, not a recommended course of action (2026-09-11, on the owner's instruction).
 */
describe("the memo offers options and recommends none of them", () => {
  it("the closing section names what they CAN do, and does not tell them to do it", () => {
    const r = messages.rights as unknown as Record<string, string>;
    const close = r.memoNextBody!.toLowerCase();
    expect(close).toContain("these are the options");
    expect(close).toContain("not a recommendation");
    // The old wording opened "Take these notes to a human legal service" — an instruction.
    expect(close).not.toMatch(/^take these notes/);
    // Doing nothing is a real option and is named as one.
    expect(close).toMatch(/neither|or wait/);
  });
});
