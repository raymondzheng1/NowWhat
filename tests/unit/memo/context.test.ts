import { describe, it, expect } from "vitest";
import { buildMemoContext } from "@/lib/memo/context";
import { getProcess, listGrounds } from "@/lib/legal";
import { getDataEntry } from "@/lib/data";

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
