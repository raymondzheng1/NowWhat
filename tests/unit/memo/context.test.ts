import { describe, it, expect } from "vitest";
import { buildMemoContext, memoExtraSources } from "@/lib/memo/context";
import { getProcess, listGrounds } from "@/lib/legal";
import { getDataEntry } from "@/lib/data";
import { withCriterionIds, answerableCriteria, isOrientation } from "@/lib/memo/criteria";

const entry = getDataEntry("cth-centrelink")!;
const judicial = getProcess("judicial-review")!;
const grounds = listGrounds().filter((g) =>
  ["procedural-fairness-hearing", "relevant-considerations"].includes(g.id),
);

const context = () =>
  buildMemoContext({
    entry,
    process: judicial,
    internal: null,
    grounds,
    criteria: [],
    forum: "the Federal Court",
    pathName: "judicial review",
  });

describe("the context hands over every id the answer is keyed by", () => {
  // THE DEFECT THIS EXISTS FOR, found by calling the live API and not by any test.
  //
  // The drafted application comes back keyed by `groundId`, and the composer matches it
  // against the ground's own id. The context named the ground and never its id, so the model
  // had to infer one: given "Procedural fairness — the hearing rule" it returned
  // `procedural-fairness-hearing-rule`, which is one word away from the real id and matches
  // nothing. The composer then found no entry for the ground and dropped the entire drafted
  // application for it — no error, no gate, no trace. The memo simply did not contain the
  // work, and from outside that was indistinguishable from having no model configured.
  //
  // So the rule is: anything the model has to echo back must be in front of it verbatim.
  it("names each ground's id, not only its title", () => {
    const c = context();
    for (const g of grounds) expect(c).toContain(g.id);
  });

  it("names every part of every test with its own id", () => {
    const c = context();
    for (const g of grounds) {
      for (const el of g.elements) {
        expect(c, `${g.id}/${el.id}`).toContain(el.id);
        expect(c).toContain(el.name);
      }
    }
    // And the lay question for each part, so the draft answers the right question.
    for (const g of grounds) for (const el of g.elements) expect(c).toContain(el.layPrompt);
  });

  it("still says nothing whatever about the person", () => {
    // The corpus half is identical for everyone with the same kind of decision, which is
    // what keeps it cacheable and what keeps the line between "facts you may rely on" and
    // "what this person told us" a hard one.
    const c = context().toLowerCase();
    for (const w of ["story", "their account", "medical certificate"]) {
      expect(c).not.toContain(w);
    }
  });
});

describe("a court election is not described as a review", () => {
  // The Magistrates' Court hearing a fine on election decides the CHARGE. It is not merits
  // review and it is not a review of the decision at all, and the corpus holds no process
  // for it — only merits review and judicial review. So the context it is given must assert
  // nothing about what the body asks or what it can do: thin and true beats full and wrong.
  //
  // What makes this worth a test rather than a comment is that the mis-label has arrived
  // four separate ways — on the card, in the plan, in the hand-off and in the memo heading —
  // and each time from a line that quietly treated "not an internal review" as "merits
  // review". A sentence like "this body can set the decision aside and substitute its own"
  // would pass every gate we have, because it is true of some other body.
  const fines = getDataEntry("vic-fines")!;
  const merits = getProcess("merits-review")!;

  const courtContext = () =>
    buildMemoContext({
      entry: fines,
      process: null,
      internal: null,
      grounds: [],
      criteria: fines.courtCriteria,
      forum: fines.avenue.court.body,
      pathName: "asking a court to hear the matter itself",
    });

  it("names the court, the time limit and what the court decides", () => {
    const c = courtContext();
    expect(c).toContain(fines.avenue.court.body);
    expect(c).toContain(fines.deadlineRule);
    for (const cr of fines.courtCriteria) expect(c).toContain(cr);
  });

  it("offers the source that says the election exists", () => {
    expect(fines.avenue.court.source).toBeTruthy();
    expect(courtContext()).toContain(fines.avenue.court.source);
    // And the verifier is told it may be cited, or citing it would be refused.
    const allowed = memoExtraSources({ entry: fines, process: null, internal: null, grounds: [] });
    expect(allowed).toContain(fines.avenue.court.source);
  });

  it("says nothing a tribunal would say", () => {
    const c = courtContext();
    expect(c).not.toContain(merits.question);
    expect(c).not.toContain(merits.plainName);
    for (const r of merits.remedies) expect(c).not.toContain(r);
    for (const r of merits.canApply) expect(c).not.toContain(r);
  });

  it("would say all of it if the merits process were handed over", () => {
    // Proof the assertion above is load-bearing and not just true of an empty string.
    const wrong = buildMemoContext({
      entry: fines,
      process: merits,
      internal: null,
      grounds: [],
      criteria: fines.courtCriteria,
      forum: fines.avenue.court.body,
      pathName: merits.plainName,
    });
    expect(wrong).toContain(merits.question);
    expect(wrong).toContain(merits.remedies[0]!);
  });
});

describe("the criteria go over with an id each", () => {
  const housing = getDataEntry("vic-public-housing")!;
  const merits = getProcess("merits-review")!;

  const criteriaContext = (criteria: string[]) =>
    buildMemoContext({
      entry: housing,
      process: merits,
      internal: null,
      grounds: [],
      criteria,
      forum: "VCAT",
      pathName: merits.plainName,
    });

  // The same defect as the grounds, one layer out: the criteria were handed over as prose,
  // the answer has to say which line it is about, and there was no id to say it with. On
  // every path except judicial review these criteria ARE the legal substance, so this is
  // the common case, not the rare one.
  it("gives every answerable criterion an id, verbatim", () => {
    const c = criteriaContext(housing.mrCriteria!);
    for (const { id, text } of withCriterionIds(answerableCriteria(housing, housing.mrCriteria!))) {
      expect(c, id).toContain(id);
      expect(c).toContain(text);
    }
  });

  it("lists the routing lines without one, and says not to answer them", () => {
    const c = criteriaContext(housing.mrCriteria!);
    const routing = (housing.mrCriteria ?? []).filter((x) => isOrientation(housing, x));
    expect(routing.length).toBeGreaterThan(0);
    for (const r of routing) {
      expect(c).toContain(r);
      // Present as context, but with no id — so nothing can be drafted against it.
      expect(c).not.toContain(`id: ${withCriterionIds([r])[0]!.id}`);
    }
    expect(c).toContain("write nothing against these");
  });

  it("asks for one entry per line and says to copy the id exactly", () => {
    const c = criteriaContext(housing.mrCriteria!);
    expect(c).toContain("one entry per line in your answer, id copied exactly");
  });

  it("says nothing about criteria when the path has none", () => {
    const c = criteriaContext([]);
    expect(c).not.toContain("WHAT THIS BODY DECIDES");
    expect(c).not.toContain("HOW THE PATHS FIT TOGETHER");
  });
});
