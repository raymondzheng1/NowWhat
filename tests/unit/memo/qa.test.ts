import { describe, it, expect } from "vitest";
import { checkMemoCitations } from "@/lib/memo/qa";
import { buildMemoContext, memoExtraSources } from "@/lib/memo/context";
import { getDataEntry } from "@/lib/data";
import { getConcept, getGround, getProcess } from "@/lib/legal";

/**
 * The memo's own gate, added 2026-09-12 when the memo began to be drafted by a model.
 *
 * A fabricated citation is the single most damaging thing this product could produce. It
 * looks exactly like a real one, a self-represented person cannot tell the difference, and
 * the place it would surface is the document they hand to a lawyer. The shared verifier
 * catches advice, predictions and out-of-corpus facts; this catches the citation itself.
 *
 * The rule is ALLOW-LIST, not blocklist: a case the knowledge base did not supply is
 * rejected whether or not it happens to be real. The drafter is not permitted to be right
 * by accident.
 */
const ALLOWED = `
GROUND: Procedural fairness — the hearing rule
  test: A person affected must be given a fair chance to respond.
  cases:
    - Kioa v West (1985) 159 CLR 550 — the duty to hear
    - Badari v Minister (2026) — what a fair chance looks like
SOURCES:
  - Administrative Decisions (Judicial Review) Act 1977 (Cth) s 5
  - https://www.servicesaustralia.gov.au/reviews-and-appeals
`;

describe("the memo never ships a citation the knowledge base did not supply", () => {
  it("passes text that cites only what it was given", () => {
    const text =
      "Kioa v West is the case the test comes from. The Administrative Decisions (Judicial Review) Act 1977 s 5 is named in your sources.";
    expect(checkMemoCitations(text, ALLOWED)).toEqual([]);
  });

  it("rejects a case that is not in the context, even though it is a real one", () => {
    // Craig v South Australia is a genuine and famous administrative-law case. It is still
    // rejected here, because it was not supplied — being right by accident is not a defence.
    const bad = checkMemoCitations("This follows Craig v South Australia.", ALLOWED);
    expect(bad.map((f) => f.gate)).toContain("invented-citation");
    expect(bad[0]!.detail).toMatch(/Craig v South Australia/);
  });

  it("rejects an Act it was not given", () => {
    const bad = checkMemoCitations("See the Migration Act 1958 for the rule.", ALLOWED);
    expect(bad.map((f) => f.gate)).toContain("invented-act");
  });

  it("rejects a section number that appears nowhere, even under a real Act", () => {
    // "s 5" is supplied; "s 13" is not. A section of the right Act but the wrong number is
    // the kind of error that survives a casual read.
    expect(checkMemoCitations("Under s 5 of that Act.", ALLOWED)).toEqual([]);
    const bad = checkMemoCitations("Under s 13 of that Act.", ALLOWED);
    expect(bad.map((f) => f.gate)).toContain("invented-section");
  });

  it("reports each invented citation once, however often it is repeated", () => {
    const bad = checkMemoCitations(
      "Craig v South Australia says so. As Craig v South Australia held, and see Craig v South Australia.",
      ALLOWED,
    );
    expect(bad.filter((f) => f.gate === "invented-citation")).toHaveLength(1);
  });

  it("does not fire on ordinary prose that merely contains a capital V word", () => {
    // "Victoria" and "Services Australia" must not be read as a case name, or the gate would
    // reject every honest draft and the person would always get the deterministic memo.
    const clean = checkMemoCitations(
      "Services Australia decided this in Victoria. They never asked you about the medical certificate.",
      ALLOWED,
    );
    expect(clean).toEqual([]);
  });
});

/**
 * The context IS the allow-list. If a ground's test or its cases are missing from it, the
 * drafter cannot use them — and the gate above would reject them if it tried.
 */
describe("the context handed to the drafter carries the knowledge base, and nothing about anyone", () => {
  const entry = getDataEntry("cth-centrelink")!;
  const grounds = [getGround("procedural-fairness-hearing")!];
  const built = buildMemoContext({
    entry,
    process: getProcess("judicial-review")!,
    internal: null,
    grounds,
    criteria: entry.mrCriteria,
    forum: "the Federal Court",
    pathName: "Judicial review",
  });

  it("carries the test and the cases verbatim, so the drafter can lean on them", () => {
    expect(built).toContain(grounds[0]!.test);
    for (const c of grounds[0]!.leadingCases) expect(built).toContain(c.name);
  });

  it("carries the time-limit rule but adds no figure of its own", () => {
    expect(built).toContain(entry.deadlineRule);
    expect(built).toContain("never add a number");
  });

  it("says nothing about the person — their words travel separately", () => {
    // The prompt keeps a hard line between "facts you may rely on" and "what this person
    // told us", and the corpus half is identical for everyone with this kind of decision.
    expect(built.toLowerCase()).not.toContain("their account");
    expect(built).not.toContain("q-story");
  });

  it("every case it names is also in the verifier's allow-list", () => {
    // Otherwise an honest draft citing a case it was handed would be rejected for citing it.
    const extra = memoExtraSources({ entry, process: getProcess("judicial-review")!, internal: null, grounds });
    for (const c of grounds[0]!.leadingCases) expect(extra).toContain(c.name);
  });

  it("an internal-review context carries the concept instead of a process", () => {
    const ir = buildMemoContext({
      entry,
      process: null,
      internal: getConcept("internal-review")!,
      grounds: [],
      criteria: entry.irCriteria,
      forum: "an Authorised Review Officer",
      pathName: "Internal review",
    });
    expect(ir).toContain("WHAT AN INTERNAL REVIEW IS");
    expect(ir).not.toContain("WHAT THIS BODY IS ASKING");
  });
});

/**
 * The leading-word trap, found by the tests above on 2026-09-12.
 *
 * "v" is the only fixed part of a case name, so the pattern matches whatever capitalised
 * words happen to precede it. Checking THAT against the allow-list rejects an honest
 * citation for the crime of following the word "In" — which would make the gate fire on good
 * drafts and quietly send every person to the fallback memo. The check tries each suffix of
 * the left-hand side instead.
 */
describe("a supplied case is recognised however the sentence around it runs", () => {
  for (const sentence of [
    "Kioa v West is the source of the test.",
    "In Kioa v West the High Court said so.",
    "As Kioa v West held, a person must be heard.",
    "See Kioa v West.",
    "This follows the reasoning in Kioa v West, which is where the duty comes from.",
  ]) {
    it(`accepts: ${sentence}`, () => {
      expect(checkMemoCitations(sentence, ALLOWED)).toEqual([]);
    });
  }

  it("still rejects an unsupplied case behind the same leading words", () => {
    const bad = checkMemoCitations("In Craig v South Australia the Court held otherwise.", ALLOWED);
    expect(bad.map((f) => f.gate)).toContain("invented-citation");
  });
});
