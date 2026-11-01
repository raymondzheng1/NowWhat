import type { PathwayEntry } from "@/lib/schemas/corpus";
import {
  SELF_WARNING_HEADING,
  SELF_WARNING_JUDICIAL_REVIEW,
  SELF_WARNING_COURT_ELECTION,
  SELF_WARNING_MERITS,
} from "@/lib/draft/warnings";

/**
 * Deterministic draft skeletons (PRD §6.6). Built from the corpus entry — no model
 * call (so no cost, no advice risk). Drafts are written in the PERSON's own voice
 * ("I am writing to…"); they are scaffolds the person edits, never filed for them.
 * A provision/figure is only included when it is a real (non-VERIFY) corpus value.
 */

/**
 * "review-application" is kept as an alias for the merits-review letter so older links and
 * saved requests keep working; new callers should pick the specific path.
 */
export type DraftKind =
  | "reasons-request"
  | "internal-review-request"
  | "review-application"
  | "merits-review-application"
  | "judicial-review-application"
  | "court-election-enquiry";

function isVerify(s: string | undefined): boolean {
  return !s || /\bverify\b/i.test(s);
}

export interface Draft {
  title: string;
  filename: string;
  body: string;
}

const SIGN_OFF = "Yours faithfully,\n[Your name]\n[Your contact details]";
/** A statement to a court is signed by the party, not closed like a letter. */
const SIGN_OFF_APPLICANT = "Signed: [Your name]\nApplicant";

// The paragraph that starts each letter's close. What the person adds under headings goes
// ABOVE it: appended at the sign-off, their points printed after "Thank you for your help",
// as an afterthought to a letter that had already finished (the owner's internal review).
const CLOSE_REASONS = "Please send the statement to the contact details above. Thank you for your help.";
const CLOSE_INTERNAL =
  "I would be grateful if you would confirm that you have received this request, and let me know if you need anything further from me to complete the review.";
// What judicial review can do, in the corpus's own terms: set aside, and send back to be decided
// again lawfully. Nothing about the outcome they want — that is not the court's to give.
const CLOSE_JR =
  "I ask the court to set aside the decision and send it back to be decided again according to law.";
const CLOSE_COURT = "I would be grateful if you would confirm that you have received this letter. Thank you for your help.";
const CLOSE_MERITS = "Please let me know if you need anything further from me. Thank you for your help.";
export const LETTER_CLOSINGS = [CLOSE_REASONS, CLOSE_INTERNAL, CLOSE_JR, CLOSE_COURT, CLOSE_MERITS];

export interface DraftOptions {
  /** The date on the decision, as the person gave it (YYYY-MM-DD). Fills the date blank. */
  decisionDate?: string;
  /**
   * The grounds (judicial review) or reasons (merits and internal review) the person marked,
   * each with what they wrote under it. Every one is listed: the document is the final one
   * they send, so nothing is held back "for a human legal service" (the owner's ruling,
   * 2026-11-02). An empty `text` keeps a blank for them to fill in.
   */
  points?: CasePoint[];
  /** What they wrote on the internal-review step: what they ask the agency to look at again. */
  internalNote?: string;
}

export interface CasePoint {
  heading: string;
  text: string;
}

/** The sections every review document has, in order (see the case document in lib/generation/prompts). */
export const CASE_SECTION = {
  decision: "The decision and its reasons",
  facts: "Summary of the facts",
  askCourt: "What I ask the court to do",
  askTribunal: "What I ask the tribunal to decide",
  askAgency: "What I ask for",
  grounds: "Grounds of review",
  whyChange: "Why the decision should be changed",
  whyReview: "Why the decision should be reviewed",
} as const;

const REASONS_BLANK = "[the reasons the decision-maker gave, as their letter sets them out]";
const POINT_BLANK = "[set out what happened that shows this]";

/** "Ground 1: …" / "Reason 1: …", each with what they wrote under it, or a blank for it. */
function numbered(label: "Ground" | "Reason", points: CasePoint[]): string[] {
  return points.flatMap((p, i) => [`${label} ${i + 1}: ${p.heading}`, p.text.trim() || POINT_BLANK, ""]);
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-10-14" → "14 October 2026"; anything else as given. */
function letterDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return iso.trim();
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month} ${m[1]}` : iso.trim();
}

/**
 * The tribunal named in this entry's own pathways, if it has one.
 *
 * The merits letter used to take `pathways[0]`, which is the tribunal only for renting. For
 * Centrelink it was the Authorised Review Officer; for a general Victorian decision, "the
 * decision-maker"; for housing, the Housing Appeals Office — so a person applying to a
 * tribunal posted their application to the agency and could miss the tribunal's time limit.
 * Found by the end-to-end QA on every entry with a tribunal.
 */
function tribunalOf(entry: PathwayEntry): string | undefined {
  return entry.pathways.find((p) => /\b(VCAT|Tribunal)\b/.test(p.body))?.body;
}

export function buildDraft(
  entry: PathwayEntry,
  kind: DraftKind,
  context?: string,
  opts: DraftOptions = {},
): Draft {
  // A catch-all entry does not know who decided. "Victorian government department" headed a
  // letter about a COUNCIL's decision (the judicial-review benchmark), so for those the
  // addressee is a blank the person fills in — the page highlights it like every other.
  const issuer = entry.isFallback
    ? "[the agency or council that made the decision]"
    : (entry.issuers[0] ?? "the agency that made the decision");
  const isMerits = kind === "merits-review-application" || kind === "review-application";
  const tribunal = tribunalOf(entry);
  // A merits application goes to the tribunal, not to the agency whose decision it is.
  const addressee = isMerits && tribunal ? tribunal : issuer;
  const header = [
    "[Your name]",
    "[Your address]",
    "[Your contact details]",
    "",
    "[Date]",
    "",
    `To: ${addressee}`,
    "",
  ].join("\n");
  // The date they gave us, in place of the blank that asked them for it again.
  const decisionDate = opts.decisionDate?.trim() ? letterDate(opts.decisionDate) : "";

  // ONE WHOLE SENTENCE PER ENTRY. These used to be hand-wrapped at about eighty characters,
  // which looked right in a monospace box and broke into fragments the moment the letter was
  // rendered as a letter — "please tell me what" ending one paragraph and "the next step is"
  // starting the next. The renderer wraps; the template must not.
  //
  // The empty strings ARE the paragraph breaks. Filtering them out ran every part of the letter
  // together — "Re:", the reference, the warning and the body on consecutive lines — which is
  // how it printed, downloaded and copied (the end-to-end QA). An optional line left empty
  // would leave two breaks in a row, so runs collapse to one.
  const lines = (...xs: string[]) =>
    xs.join("\n").replace(/\n{3,}/g, "\n\n").replace(/^\n+|\n+$/g, "");

  /**
   * Their reason for writing, in their own words.
   *
   * `context` is what the person actually told us. Where there is none, a bracketed prompt
   * takes its place — and a bracket is the app admitting it does not know, not a line to
   * send. The caller passes their account, so for anyone who has used the flow this is
   * their own sentence, not a placeholder they have to notice and replace.
   */
  const inTheirWords = (fallback: string) =>
    context && context.trim() ? context.trim() : `[${fallback}]`;

  if (kind === "reasons-request") {
    const provisionLine = !isVerify(entry.rightToReasons.provision)
      ? `I understand that I may ask for these reasons under ${entry.rightToReasons.provision}.`
      : "";
    return {
      title: "Request for the reasons for a decision",
      filename: `${entry.id}-reasons-request.txt`,
      body: lines(
        header,
        "Re: Request for a statement of reasons",
        "",
        "Reference number: [reference number from your letter, if any]",
        `Date of the decision: ${decisionDate || "[date on your letter]"}`,
        "",
        "I am writing to ask for the reasons for the decision described above. I would like a written statement setting out how the decision was made, what information it was based on, and which findings were made on the material questions of fact.",
        provisionLine,
        "",
        context ? `The decision concerns the following. ${context.trim()}` : "",
        "",
        CLOSE_REASONS,
        "",
        SIGN_OFF,
      ),
    };
  }

  // ---- Internal review -------------------------------------------------------------
  // Asking the decision-maker to look at its own decision again. It is not a tribunal and
  // not a court, so this letter claims nothing about powers, tests or remedies — our own
  // entry for the step says the rules are different for every department.
  //
  // Two sentences carry the weight, and both come from that entry: the decision letter is
  // the place to look for how to ask, and an internal review does not always pause the clock
  // for the next step. Someone who writes this and then waits can lose a tribunal or a court
  // they still had. No provision and no period is named, because the procedural layer
  // verifies neither for this step.
  if (kind === "internal-review-request") {
    return {
      title: "Request for an internal review of a decision",
      filename: `${entry.id}-internal-review.txt`,
      body: lines(
        header,
        "Re: Request for an internal review",
        "",
        "Reference number: [reference number from your letter, if any]",
        `Date of the decision: ${decisionDate || "[date on your letter]"}`,
        "",
        "I am writing to ask you to review the decision described above.",
        "",
        CASE_SECTION.decision,
        REASONS_BLANK,
        "",
        CASE_SECTION.askAgency,
        "I ask that the decision be looked at again, and changed where it is wrong.",
        "",
        CASE_SECTION.facts,
        inTheirWords("set out what happened, in a few sentences"),
        "",
        // The reasons section: what they wrote and the points they ticked. With neither, their
        // account above IS their reasons, and only someone who gave nothing gets the blank.
        ...(opts.internalNote?.trim() || opts.points?.length
          ? [
              CASE_SECTION.whyReview,
              ...(opts.internalNote?.trim() ? [opts.internalNote.trim(), ""] : []),
              ...numbered("Reason", opts.points ?? []),
            ]
          : context?.trim()
            ? []
            : [CASE_SECTION.whyReview, "[set out what you think was missed, what you were not able to explain, or what has changed]", ""]),
        CLOSE_INTERNAL,
        "",
        "If an internal review is not available for a decision of this kind, please tell me what the next step is and who I should write to. Please also tell me the time limit that applies to that next step, so that I can keep track of it while this request is with you.",
        "",
        "Thank you for your help.",
        "",
        SIGN_OFF,
      ),
    };
  }

  // ---- Judicial review -------------------------------------------------------------
  // A different document entirely: a court is asked to check LEGALITY, not to remake the
  // decision. Judicial review is technical and the corpus is explicit that free legal help
  // early really matters, so the draft says so at the top rather than pretending a template
  // is enough.
  //
  // A STATEMENT OF THEIR CASE FOR THE COURT, not a letter to the decision-maker (the owner's
  // ruling, 2026-11-01). It was addressed to the council and asked it to "look again", which
  // is internal review in judicial review's clothes: the council is the other side in a court
  // case, and the person needs their grounds and their case set out for the court. Which
  // court, and on which of its forms, depends on the decision — so both are blanks a free
  // legal service fills in, and the NOTE TO YOURSELF still says this is not the filing.
  if (kind === "judicial-review-application") {
    return {
      title: "Judicial review — your grounds and your case, to take to a lawyer",
      filename: `${entry.id}-judicial-review.txt`,
      body: lines(
        "[Your name]",
        "[Your address]",
        "[Your contact details]",
        "",
        "[Date]",
        "",
        "To: [the court that will hear your application — a free legal service can tell you which court, and which of its forms to use]",
        "",
        "Re: Application for judicial review — the applicant's grounds and case",
        "",
        "Applicant: [Your name]",
        `Respondent: ${issuer}`,
        "Reference number: [reference number from your letter, if any]",
        `Date of the decision: ${decisionDate || "[date on your letter]"}`,
        "",
        SELF_WARNING_HEADING,
        SELF_WARNING_JUDICIAL_REVIEW,
        "",
        "I apply for judicial review of the decision described above. My case is about the way the decision was made, not only its outcome.",
        "",
        CASE_SECTION.decision,
        REASONS_BLANK,
        "",
        CASE_SECTION.askCourt,
        CLOSE_JR,
        "",
        CASE_SECTION.facts,
        inTheirWords("describe what you were told, what you were able to respond to, and what you think was not taken into account"),
        "",
        CASE_SECTION.grounds,
        ...(opts.points?.length
          ? numbered("Ground", opts.points)
          : [
              "[name each ground, and set out what happened that shows it — for example, that you were not given a fair chance to respond, that something irrelevant was taken into account, or that something relevant was not considered]",
              "",
            ]),
        SIGN_OFF_APPLICANT,
      ),
    };
  }


  // ---- Electing to have the matter heard in court ----------------------------------
  //
  // THIS IS NOT THE ELECTION, AND IT MUST NOT READ LIKE IT. Electing to have an
  // infringement heard in court is a formal step under the scheme's own Act. It has a
  // prescribed form, a time limit we do not verify, and a consequence: it puts the CHARGE
  // before a court, which can dismiss it or convict, order more or less than the notice,
  // and order costs (VLA, 19 May 2026; Criminal Procedure Act 2009 ss 401, 403). We hold no
  // checked version of that form, so we draft no version of it — a document of ours that
  // looked official would be read as one by the person least able to absorb a rejected
  // filing, which is the whole reason this app does not do that.
  //
  // What a person in that position actually needs first is what a free legal service would
  // tell them to get: which form, where it goes, and by when. So this letter asks for
  // exactly that, carries their account so the enquiry is not empty, and says in its own
  // first line that it does not elect anything. It is the step before the step.
  if (kind === "court-election-enquiry") {
    return {
      title: "Asking how to have the matter heard in court",
      filename: `${entry.id}-court-enquiry.txt`,
      body: lines(
        header,
        "Re: Enquiry about having this matter heard in court",
        "",
        "Reference number: [reference number from your notice, if any]",
        `Date of the notice: ${decisionDate || "[date on your notice]"}`,
        "",
        SELF_WARNING_HEADING,
        SELF_WARNING_COURT_ELECTION,
        "",
        "I am writing about the notice described above. I am considering asking for this matter to be heard in court, and I would like to know what I need to do.",
        "",
        "Please tell me which form I need to complete, where it should be sent, and the date by which it must be received.",
        "",
        "Please also tell me whether anything I have already sent you changes that date, and whether any other option is open to me.",
        "",
        `What happened, in my own words. ${inTheirWords("describe what the notice was about, what you told them and when, and anything that has changed since")}`,
        "",
        CLOSE_COURT,
        "",
        SIGN_OFF,
      ),
    };
  }

  // ---- Merits review ("review-application" is the legacy alias) ----------------------
  // A tribunal remakes the decision, asking what the correct or preferable decision is, so
  // this letter leads with the person's circumstances and their evidence.
  const evidence =
    entry.evidenceChecklist.length > 0
      ? "I am including, or can provide, the following.\n" +
        entry.evidenceChecklist.map((e) => `  - ${e}`).join("\n")
      : "";
  // "considered again by Administrative Review Tribunal (ART)" read as a slip. A name that
  // opens with an acronym ("VCAT") takes no article; a name in words does.
  const reviewBody = !tribunal
    ? "the reviewing body"
    : /^(the\s|[A-Z]{2,}\b)/.test(tribunal)
      ? tribunal
      : `the ${tribunal}`;
  return {
    title: "Request to review a decision (merits review)",
    filename: `${entry.id}-merits-review.txt`,
    body: lines(
      header,
      "Re: Application for review of a decision",
      "",
      "Reference number: [reference number from your letter, if any]",
      `Date of the decision: ${decisionDate || "[date on your letter]"}`,
      "",
      SELF_WARNING_HEADING,
      SELF_WARNING_MERITS,
      "",
      `I am writing to apply for a review of the decision described above. I do not agree with the decision, and I ask that it be considered again by ${reviewBody}.`,
      "",
      CASE_SECTION.decision,
      REASONS_BLANK,
      "",
      CASE_SECTION.askTribunal,
      "I ask that the decision be looked at afresh on the facts, so that the correct or preferable decision can be made on the material now available.",
      "",
      CASE_SECTION.facts,
      inTheirWords("set out what happened, in a few sentences"),
      "",
      ...(opts.points?.length
        ? [CASE_SECTION.whyChange, ...numbered("Reason", opts.points)]
        : context?.trim()
          ? []
          : [CASE_SECTION.whyChange, "[explain briefly what you think was wrong, and anything about your situation that has changed]", ""]),
      evidence,
      "",
      CLOSE_MERITS,
      "",
      SIGN_OFF,
    ),
  };
}
