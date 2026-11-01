import { describe, it, expect } from "vitest";
import { checkLetterFidelity } from "@/lib/letter/fidelity";
import { buildDraft } from "@/lib/draft/build";
import { verifiedEntry } from "@/tests/fixtures/entries";
import {
  SELF_WARNING_HEADING,
  SELF_WARNING_JUDICIAL_REVIEW,
  SELF_WARNING_COURT_ELECTION,
} from "@/lib/draft/warnings";

/**
 * The letter-polish gate, added 2026-09-16 when the drafts began to be rewritten by a model.
 *
 * A polished letter goes to a government office OVER THE PERSON'S NAME. If a review officer
 * asks "what makes you say that?", they must be able to answer — and they cannot defend a
 * sentence they did not write. The existing letter task forbids the model to add so much as
 * an adverb to their account; polishing loosens that for OUR framing sentences only, and
 * this gate is what makes that distinction real rather than a hope expressed in a prompt.
 */
const DRAFT = buildDraft(verifiedEntry, "internal-review-request", "They cut it off in March.");
const THEIRS = "They cut it off in March.";

describe("a polished letter keeps every blank the person still has to fill", () => {
  it("passes a rewrite that keeps them all", () => {
    // Same letter, different words around the same brackets.
    const ok = DRAFT.body.replace(
      "I am writing to ask you to review the decision described above.",
      "I am writing to request a review of the decision described above.",
    );
    expect(checkLetterFidelity(DRAFT.body, THEIRS, ok)).toEqual([]);
  });

  it("rejects a rewrite that drops one", () => {
    // A dropped "[Your name]" is a letter posted unsigned, and the person would not notice:
    // the whole point of the highlight is that they see what is still to do.
    // One of the two, deliberately: "[Your name]" is in the header AND the sign-off, and a
    // gate that only asked "is it present anywhere?" would wave this through.
    const dropped = DRAFT.body.replace("[Your name]", "");
    const bad = checkLetterFidelity(DRAFT.body, THEIRS, dropped);
    expect(bad.map((f) => f.gate)).toContain("placeholder-dropped");
  });

  it("rejects a rewrite that invents one", () => {
    // A new blank is a field the person never agreed to disclose, presented as required.
    const added = DRAFT.body.replace("Thank you for your help.", "My reference is [your customer number]. Thank you for your help.");
    const bad = checkLetterFidelity(DRAFT.body, THEIRS, added);
    expect(bad.map((f) => f.gate)).toContain("placeholder-invented");
  });

  it("rejects a rewrite that answers one", () => {
    // Filling a blank is inventing the fact it was there to collect.
    const answered = DRAFT.body.replace("[Your name]", "Jane Smith");
    const bad = checkLetterFidelity(DRAFT.body, THEIRS, answered);
    expect(bad.map((f) => f.gate)).toContain("placeholder-dropped");
  });
});

describe("a polished letter states no figure that was not already there", () => {
  it("rejects an invented date", () => {
    // The most damaging kind of invention in a letter about a decision, and the kind a model
    // is most likely to supply helpfully: a specific date where the person was vague.
    const bad = checkLetterFidelity(
      DRAFT.body,
      THEIRS,
      DRAFT.body.replace("Thank you for your help.", "I first wrote to you on 14 April. Thank you for your help."),
    );
    expect(bad.map((f) => f.gate)).toContain("invented-figure");
    expect(bad.find((f) => f.gate === "invented-figure")!.detail).toBe("14");
  });

  it("rejects an invented amount", () => {
    const bad = checkLetterFidelity(
      DRAFT.body,
      THEIRS,
      DRAFT.body.replace("Thank you for your help.", "The debt is $2,400. Thank you for your help."),
    );
    expect(bad.map((f) => f.gate)).toContain("invented-figure");
  });

  it("allows a figure the person themselves gave", () => {
    // Their own number is theirs to state. Rejecting it would mean the polished letter could
    // never repeat what they actually told us.
    const theirs = "They raised a debt of 2400 dollars in March.";
    const ok = DRAFT.body.replace("Thank you for your help.", "They raised a debt of 2400 dollars. Thank you for your help.");
    expect(checkLetterFidelity(DRAFT.body, theirs, ok)).toEqual([]);
  });

  it("allows a figure that was already in the draft", () => {
    const withNum = `${DRAFT.body}\nReference 12345.`;
    const ok = `${withNum}\nI repeat: reference 12345.`;
    expect(checkLetterFidelity(withNum, "", ok)).toEqual([]);
  });

  it("reports each invented figure once", () => {
    const bad = checkLetterFidelity(
      DRAFT.body,
      THEIRS,
      DRAFT.body.replace("Thank you for your help.", "See 99. And again 99, and 99."),
    );
    expect(bad.filter((f) => f.gate === "invented-figure")).toHaveLength(1);
  });
});

describe("a polished letter is still a letter", () => {
  for (const [needle, what] of [
    ["Yours faithfully", "sign-off"],
    ["Re:", "subject line"],
    ["To:", "addressee"],
  ] as const) {
    it(`rejects a rewrite that loses the ${what}`, () => {
      // A "more professional" rewrite that drops these has produced a nicer paragraph and a
      // worse letter — and an unsigned one cannot be acted on at all.
      const bad = checkLetterFidelity(DRAFT.body, THEIRS, DRAFT.body.replace(needle, ""));
      expect(bad.map((f) => f.gate)).toContain("not-a-letter");
      expect(bad.find((f) => f.gate === "not-a-letter")!.detail).toBe(what);
    });
  }

  it("passes the untouched draft, so an honest no-op is never rejected", () => {
    // If this failed, every safe rewrite would be thrown away and nobody would ever see one.
    expect(checkLetterFidelity(DRAFT.body, THEIRS, DRAFT.body)).toEqual([]);
  });
});

describe("a warning written to the person, not the office", () => {
  // Built from the REAL templates, not from a stand-in draft written in this file. The gate
  // and the drafts now share `lib/draft/warnings.ts`, and these tests are what makes the
  // share worth having: a warning reworded in the template and still waved through by the
  // gate is exactly the failure the gate exists to prevent, and it would be invisible,
  // because the letter would still read well.
  const THEIRS_FINE = "They fined me in March.";
  const COURT = buildDraft(verifiedEntry, "court-election-enquiry", THEIRS_FINE);
  const JR = buildDraft(verifiedEntry, "judicial-review-application", THEIRS_FINE);

  it("the templates still carry the blocks the gate is holding", () => {
    // Without this, a template that stopped using the constant would make every test below
    // pass vacuously — the gate would be guarding a string no letter contains.
    expect(COURT.body).toContain(SELF_WARNING_HEADING);
    expect(COURT.body).toContain(SELF_WARNING_COURT_ELECTION);
    expect(JR.body).toContain(SELF_WARNING_HEADING);
    expect(JR.body).toContain(SELF_WARNING_JUDICIAL_REVIEW);
  });

  it("passes the untouched drafts, so an honest no-op is never refused", () => {
    expect(checkLetterFidelity(COURT.body, THEIRS_FINE, COURT.body)).toEqual([]);
    expect(checkLetterFidelity(JR.body, THEIRS_FINE, JR.body)).toEqual([]);
  });

  it("allows a rewrite that only reflows the block", () => {
    // The renderer wraps, so re-wrapping has changed nothing. If this failed, the gate would
    // be refusing rewrites over whitespace and nobody would ever see a polished letter.
    const reflowed = COURT.body.replace(
      SELF_WARNING_COURT_ELECTION,
      SELF_WARNING_COURT_ELECTION.replace(/\. /g, ".\n"),
    );
    expect(reflowed).not.toBe(COURT.body);
    expect(checkLetterFidelity(COURT.body, THEIRS_FINE, reflowed)).toEqual([]);
  });

  it("allows a rewrite that polishes the sentences around the block", () => {
    const ok = COURT.body.replace(
      "I am writing about the notice described above.",
      "I am writing in relation to the notice described above.",
    );
    expect(checkLetterFidelity(COURT.body, THEIRS_FINE, ok)).toEqual([]);
  });

  it("refuses a rewrite that drops the block", () => {
    const rewritten = COURT.body.replace(
      `${SELF_WARNING_HEADING}\n${SELF_WARNING_COURT_ELECTION}\n`,
      "",
    );
    expect(rewritten).not.toContain(SELF_WARNING_HEADING);
    expect(
      checkLetterFidelity(COURT.body, THEIRS_FINE, rewritten).some((x) => x.gate === "warning-dropped"),
    ).toBe(true);
  });

  it("refuses a rewrite that softens the heading away", () => {
    const rewritten = COURT.body.replace(SELF_WARNING_HEADING, "A note before you begin");
    const bad = checkLetterFidelity(COURT.body, THEIRS_FINE, rewritten);
    expect(bad.map((f) => f.gate)).toContain("warning-dropped");
    expect(bad.map((f) => f.detail)).toContain("the NOTE TO YOURSELF heading");
  });

  // ---- THE GAP THIS SUITE WAS WRITTEN FOR -------------------------------------------
  //
  // Until 2026-10-31 the gate checked the string "NOTE TO YOURSELF" and nothing else, so
  // every case below PASSED: the heading stayed, the sentences under it stopped saying what
  // they exist to say, and the letter still read well enough that nobody would look. Each
  // one asserts the heading survived first, because that is all the old gate ever asked.

  it("refuses a rewrite that keeps the heading and softens the warning", () => {
    const softened = COURT.body.replace(
      "Please talk to a free legal service before you elect.",
      "You may wish to seek advice before proceeding.",
    );
    expect(softened).toContain(SELF_WARNING_HEADING);
    const bad = checkLetterFidelity(COURT.body, THEIRS_FINE, softened);
    expect(bad.map((f) => f.gate)).toContain("warning-dropped");
    expect(bad.map((f) => f.detail)).toContain("the court-election warning");
  });

  it("refuses a rewrite that drops the consequence for being alarming", () => {
    // The sentence a person needs most, and the first one a "warmer" rewrite cuts: a court
    // hearing can end worse than the notice they already have, and it can carry costs.
    const trimmed = COURT.body.replace(
      " A court hearing decides the charge itself. The court can dismiss it, or find you guilty, record a conviction, and order you to pay more or less than the fine, plus costs.",
      "",
    );
    expect(trimmed).toContain(SELF_WARNING_HEADING);
    expect(trimmed).not.toBe(COURT.body);
    expect(
      checkLetterFidelity(COURT.body, THEIRS_FINE, trimmed).map((f) => f.gate),
    ).toContain("warning-dropped");
  });

  it("refuses a rewrite that stops the judicial-review draft saying it is not a filing", () => {
    const softened = JR.body.replace(
      "This draft is a starting point for that conversation, not a court document.",
      "This draft is a helpful starting point.",
    );
    expect(softened).toContain(SELF_WARNING_HEADING);
    const bad = checkLetterFidelity(JR.body, THEIRS_FINE, softened);
    expect(bad.map((f) => f.gate)).toContain("warning-dropped");
    expect(bad.map((f) => f.detail)).toContain("the judicial-review warning");
  });

  it("says nothing about letters that carry no such block", () => {
    // The internal-review request is addressed wholly to the agency. A gate that fired here
    // would refuse every rewrite of the letter most people actually send.
    const plain = buildDraft(verifiedEntry, "internal-review-request", THEIRS_FINE);
    expect(plain.body).not.toContain(SELF_WARNING_HEADING);
    expect(checkLetterFidelity(plain.body, THEIRS_FINE, plain.body)).toEqual([]);
  });
});

/**
 * SINCE 2026-10-31 THE REWRITE MAY SUMMARISE THEIR ACCOUNT — the owner's call, because the
 * whole account pasted in is not a good letter. That loosens what the model may do to their
 * words, so these are the matching tightenings: no new name or place, and it must actually be
 * shorter than a page a review officer reads in a minute.
 */
describe("a shorter letter adds no name or place", () => {
  const LONG = buildDraft(
    verifiedEntry,
    "internal-review-request",
    "My car was parked in a bay on Batman Street in West Melbourne. The sign was hidden by a tree.",
  ).body;
  const MINE = "My car was parked in a bay on Batman Street in West Melbourne. The sign was hidden by a tree.";

  it("accepts a faithful summary that keeps their names", () => {
    const short = LONG.replace(
      "My car was parked in a bay on Batman Street in West Melbourne. The sign was hidden by a tree.",
      "I parked on Batman Street in West Melbourne, where the sign was hidden by a tree.",
    );
    expect(checkLetterFidelity(LONG, MINE, short).filter((f) => f.gate === "invented-name")).toEqual([]);
  });

  it("refuses a name they never gave", () => {
    const short = LONG.replace(
      "The sign was hidden by a tree.",
      "I spoke to Officer Brown, who agreed the sign was hidden by a tree.",
    );
    const f = checkLetterFidelity(LONG, MINE, short);
    expect(f.some((x) => x.gate === "invented-name" && x.detail === "Officer")).toBe(true);
    expect(f.some((x) => x.gate === "invented-name" && x.detail === "Brown")).toBe(true);
  });

  it("refuses a place they never gave", () => {
    const short = LONG.replace("on Batman Street", "on Batman Street near Flagstaff Gardens");
    expect(checkLetterFidelity(LONG, MINE, short).some((x) => x.gate === "invented-name")).toBe(true);
  });

  it("does not treat an ordinary sentence opening, or their own 'I', as a name", () => {
    const short = LONG.replace(
      "The sign was hidden by a tree.",
      "Unfortunately the sign was hidden by a tree. I could not read it.",
    );
    expect(checkLetterFidelity(LONG, MINE, short).filter((f) => f.gate === "invented-name")).toEqual([]);
  });

  it("does not treat a capitalised word they wrote in lowercase as new", () => {
    const short = LONG.replace("hidden by a tree", "hidden by a Tree");
    expect(checkLetterFidelity(LONG, MINE, short).filter((f) => f.gate === "invented-name")).toEqual([]);
  });

  // A case letter has headings, which end in no full stop: the word starting the next line
  // opens a sentence, and was being read as a name.
  it("does not treat the first word under a heading as a name", () => {
    const short = LONG.replace("The sign was hidden by a tree.", "The sign\nUnfortunately it was hidden by a tree.");
    expect(checkLetterFidelity(LONG, MINE, short).filter((f) => f.gate === "invented-name")).toEqual([]);
  });

  it("still refuses a new name that follows a heading mid-line", () => {
    const short = LONG.replace("The sign was hidden by a tree.", "The sign\nThe officer, Constable Brown, agreed.");
    expect(checkLetterFidelity(LONG, MINE, short).some((x) => x.gate === "invented-name")).toBe(true);
  });
});

describe("a shorter letter is actually short", () => {
  it("refuses a rewrite that grew past the draft and past a one-minute read", () => {
    const padded = DRAFT.body.replace(THEIRS, `${THEIRS} ${"I am very upset about all of this. ".repeat(80)}`);
    const f = checkLetterFidelity(DRAFT.body, THEIRS, padded);
    expect(f.some((x) => x.gate === "too-long")).toBe(true);
  });

  it("accepts a rewrite no longer than the draft it came from", () => {
    expect(checkLetterFidelity(DRAFT.body, THEIRS, DRAFT.body).filter((x) => x.gate === "too-long")).toEqual([]);
  });
});

describe("a blank made from the person's own note is theirs", () => {
  const MINE = "My car (Insert Rego) was parked on Batman Street.";
  const D = buildDraft(verifiedEntry, "internal-review-request", MINE).body;

  it("accepts their '(Insert Rego)' turned into '[Insert Rego]'", () => {
    const out = D.replace("(Insert Rego)", "[Insert Rego]");
    expect(checkLetterFidelity(D, MINE, out).filter((f) => f.gate === "placeholder-invented")).toEqual([]);
  });

  it("still refuses a blank whose words they never wrote", () => {
    const out = D.replace("(Insert Rego)", "[Insert your licence number]");
    expect(checkLetterFidelity(D, MINE, out).some((f) => f.gate === "placeholder-invented")).toBe(true);
  });
});

// Measured live, 2026-11-01, on a Centrelink account: four case letters out of four refused
// for writing the person's own names and figures in another ordinary form.
describe("their own words in another form are still theirs", () => {
  const ACCOUNT =
    "My surgeon Dr Marchetti wrote a report. Services Australia sent a letter. My psychologist Ruth Okonkwo has seen me since Feb 2025. I studied 4-5 hrs a week. Rent is $420/wk. It took five weeks.";
  const D = "To: x\nRe: y\n\nI ask for a review.\n\nYours faithfully,\n[Your name]";
  const gates = (body: string) =>
    checkLetterFidelity(D, ACCOUNT, D.replace("I ask for a review.", body)).map((f) => `${f.gate}:${f.detail}`);

  for (const ok of [
    "I rely on Dr Marchetti's report.",
    "The letter is Services Australia's.",
    "My psychologist, Ms Okonkwo, has seen me since February 2025.",
    "I studied 4 to 5 hours a week.",
    "My rent is $420 a week.",
    "It took 5 weeks.",
  ]) {
    it(`accepts: ${ok}`, () => expect(gates(ok)).toEqual([]));
  }

  for (const [bad, gate] of [
    ["I rely on Dr Brennan's report.", "invented-name:Brennan's"],
    ["My psychologist has seen me since March 2025.", "invented-name:March"],
    ["I studied 4 to 6 hours a week.", "invented-figure:6"],
    ["I studied 3-5 hours a week.", "invented-figure:3-5"],
  ] as const) {
    it(`still refuses: ${bad}`, () => expect(gates(bad)).toContain(gate));
  }
});

// Live, 2026-11-02: the person's own reminder in their account ("[Insert Rego]") is not our blank.
describe("a blank from their own account", () => {
  const theirs = "My car [Insert Rego] was parked on Batman Street.";
  const draft = `To: x\n\nRe: y\n\n[Your name]\n\n${theirs}\n\nYours faithfully,\n[Your name]`;
  it("may be left out of a rewrite", () => {
    const out = checkLetterFidelity(draft, theirs, "To: x\n\nRe: y\n\n[Your name]\n\nMy car was parked on Batman Street.\n\nYours faithfully,\n[Your name]");
    expect(out.map((f) => f.gate)).not.toContain("placeholder-dropped");
  });
  it("while ours may not", () => {
    const out = checkLetterFidelity(draft, theirs, "To: x\n\nRe: y\n\nMy car was parked on Batman Street.\n\nYours faithfully,\n[Your name]");
    expect(out.map((f) => f.gate)).toContain("placeholder-dropped");
  });
});
