import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import messages from "@/lib/i18n/messages/en.json";

const ROOT = resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");
const home = messages.home as unknown as Record<string, string>;
const about = messages.about as unknown as Record<string, string>;
const rights = messages.rights as unknown as Record<string, string>;

/**
 * WHAT THIS SERVICE SAYS IT COVERS.
 *
 * The owner's framing: the Australian Government and Victoria, and Victoria is the worked
 * example of a state because every state sets review up in much the same way.
 *
 * That second half is a claim about law this service does NOT hold. The corpus covers two
 * jurisdictions; nothing in it grounds a sentence about New South Wales. What is safe to say
 * is that the SHAPE repeats — ask the decision-maker to look again, then a tribunal, then a
 * court — and that everything a person would actually act on does not: which body, which
 * form, how long. So the rule these tests hold is that the two halves are never separated.
 * A reader who takes "much the same" without "the detail is set by that state's own laws"
 * reads a Victorian time limit as their own, and a missed time limit is the one harm this
 * whole product is built to prevent.
 */
describe("Victoria is named as the example, and the limit travels with it", () => {
  // Every passage that says other states resemble this one.
  const claims: [string, string][] = [
    ["home.heroLead", home.heroLead!],
    ["home.coverageLead", home.coverageLead!],
    ["home.covFoot", home.covFoot!],
    ["about.coverageBody", about.coverageBody!],
    ["rights.whoVicDesc", rights.whoVicDesc!],
  ];

  const SIMILAR = /much the same|the same way|similar/i;
  const LIMIT = /own laws|that state'?s own|check (them|the rules)|not a time limit for another/i;

  it("calls Victoria the example where the scope is stated", () => {
    expect(home.heroLead).toMatch(/example/i);
    expect(home.coverageTitle).toMatch(/example/i);
    expect(home.covVicTitle).toMatch(/example/i);
    expect(about.coverageBody).toMatch(/example/i);
  });

  it("never says other states are similar without saying what differs", () => {
    for (const [key, text] of claims) {
      if (!SIMILAR.test(text)) continue;
      expect(text, `${key} says the states are alike — it must also say what is not`).toMatch(
        LIMIT,
      );
    }
    // And at least one of them does make the claim, or the rule above is checking nothing.
    expect(claims.filter(([, t]) => SIMILAR.test(t)).length).toBeGreaterThan(2);
  });

  it("says plainly that no date here is another state's time limit", () => {
    const all = claims.map(([, t]) => t).join(" ");
    expect(all).toMatch(/no date on this site is a time limit for another state/i);
    expect(about.coverageBody).toMatch(/no time limit on this site is a time limit for another/i);
  });

  it("still offers a human service to someone in another state", () => {
    // CLAUDE.md: human help in every flow. It matters most for the reader this copy is
    // addressed to, because they are the one the knowledge base cannot answer.
    expect(home.covFoot).toMatch(/human service/i);
    expect(about.coverageBody).toMatch(/free service/i);
  });

  it("names no other state's review body anywhere in customer copy", () => {
    // The jurisdiction gate rejects these in model output. Copy must not do it either: naming
    // NCAT as a path would be an unsourced claim about a body outside the knowledge base.
    // Whole words only: "vacate" contains "acat", and a notice to vacate is half this
    // product's subject matter.
    const blob = JSON.stringify(messages).toLowerCase();
    for (const body of ["ncat", "qcat", "sacat", "tascat", "acat", "namb"]) {
      expect(blob, `customer copy names ${body}`).not.toMatch(new RegExp(`\b${body}\b`));
    }
  });

  it("renders both coverage passages, so they are not orphaned keys", () => {
    const aboutPage = read("app/about/page.tsx");
    expect(aboutPage).toContain('t("coverageTitle")');
    expect(aboutPage).toContain('t("coverageBody")');
    const landing = read("app/page.tsx");
    expect(landing).toContain('t("covFoot")');
    expect(landing).toContain('t("coverageLead")');
  });
});

/**
 * A COURT ELECTION IS NOT A REVIEW, INCLUDING IN THE HEADING ABOVE IT.
 *
 * Reported from the live site: on a Victorian fine, the explainer list's second item is the
 * court election, where a reader expects merits review. The list is right — `vic-fines` has
 * `avenue.mr.available: false` and `avenue.court.available: true`, lawyer-verified, sourced
 * to the Infringements Act — but two headings above it said otherwise:
 *
 *   · "The ways a decision gets looked at again", over a panel whose own text reads "This is
 *     not a review of the decision. The court does not look at whether the decision was right
 *     or wrong. It hears the matter itself."
 *   · "Apply for review", over the letter for that same election.
 *
 * This is the fifth and sixth place that one mis-label has had to be removed — the card, the
 * plan, the hand-off, the memo heading, and now these. A heading that spans four paths may
 * not name what only two of them do.
 */
describe("no heading calls every path a review", () => {
  const spansEveryPath = ["learnTitle", "learnLead", "applyTitle", "learnMore"];

  it("does not say review, or looked at again, over a court election", () => {
    for (const key of spansEveryPath) {
      const text = rights[key]!;
      expect(text, `rights.${key} spans all four paths`).not.toMatch(/looked at again/i);
    }
    // The two headings themselves must not name a review at all.
    expect(rights.learnTitle).not.toMatch(/\breview/i);
    expect(rights.applyTitle).not.toMatch(/\breview/i);
  });

  it("still says plainly, where it matters, that the court is not reviewing anything", () => {
    // The guard on the test above: this is an absence that must not become a silence.
    expect(rights.courtIsNot).toMatch(/not a review of the decision/i);
    expect(rights.pathGlossCourtElection).toMatch(/instead of a review/i);
  });

  it("explains the gap where a tribunal would be", () => {
    expect(rights.learnNoTribunal).toMatch(/tribunal/i);
    // It states what our rules list, not what the law forbids, and it routes to a person.
    expect(rights.learnNoTribunal).toMatch(/our checked rules|not one of the paths/i);
    expect(rights.learnNoTribunal).toMatch(/free legal service/i);
  });

  it("renders that note only where no tribunal is available", () => {
    const client = read("components/feature/RightsSaverClient.tsx");
    expect(client).toContain('{!av.mrAvailable && (');
    expect(client).toContain('t("learnNoTribunal")');
  });
});
