import type { PathwayEntry } from "@/lib/schemas/corpus";

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
  | "judicial-review-application";

function isVerify(s: string | undefined): boolean {
  return !s || /\bverify\b/i.test(s);
}

export interface Draft {
  title: string;
  filename: string;
  body: string;
}

const SIGN_OFF = "Yours faithfully,\n[Your name]\n[Your contact details]";

export function buildDraft(
  entry: PathwayEntry,
  kind: DraftKind,
  context?: string,
): Draft {
  const issuer = entry.issuers[0] ?? "the agency that made the decision";
  const header = [
    "[Your name]",
    "[Your address]",
    "[Your contact details]",
    "",
    "[Date]",
    "",
    `To: ${issuer}`,
    "",
  ].join("\n");

  // ONE WHOLE SENTENCE PER ENTRY. These used to be hand-wrapped at about eighty characters,
  // which looked right in a monospace box and broke into fragments the moment the letter was
  // rendered as a letter — "please tell me what" ending one paragraph and "the next step is"
  // starting the next. The renderer wraps; the template must not.
  const lines = (...xs: string[]) => xs.filter((l) => l !== "").join("\n");

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
        "Date of the decision: [date on your letter]",
        "",
        "I am writing to ask for the reasons for the decision described above. I would like a written statement setting out how the decision was made, what information it was based on, and which findings were made on the material questions of fact.",
        provisionLine,
        "",
        context ? `The decision concerns the following. ${context.trim()}` : "",
        "",
        "Please send the statement to the contact details above. Thank you for your help.",
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
        "Date of the decision: [date on your letter]",
        "",
        "I am writing to ask you to review the decision described above.",
        "",
        `My reasons are as follows. ${inTheirWords("set out what you think was missed, what you were not able to explain, or what has changed")}`,
        "",
        "I would be grateful if you would confirm that you have received this request, and let me know if you need anything further from me to complete the review.",
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
  // A different letter entirely: a court is asked to check LEGALITY, not to remake the
  // decision. Judicial review is technical and the corpus is explicit that free legal help
  // early really matters, so the draft says so at the top rather than pretending a template
  // is enough.
  if (kind === "judicial-review-application") {
    return {
      title: "Judicial review — a starting point to take to a lawyer",
      filename: `${entry.id}-judicial-review.txt`,
      body: lines(
        header,
        "Re: Concern about how a decision was made",
        "",
        "Reference number: [reference number from your letter, if any]",
        "Date of the decision: [date on your letter]",
        "",
        "NOTE TO YOURSELF — PLEASE READ FIRST",
        "Judicial review is a court process, and it is technical. Court time limits are usually strict, and asking for reasons does not always pause them. Please talk to a free legal service before you file anything. This draft is a starting point for that conversation, not a court document.",
        "",
        "I am writing about the decision described above. My concern is with the way the decision was made, rather than with the outcome alone.",
        "",
        `What happened, in my own words. ${inTheirWords("describe what you were told, what you were able to respond to, and what you think was not taken into account")}`,
        "",
        "The concern I ask to have looked at is set out below.",
        "  [name the ground — for example, that you were not given a fair chance to respond, that something irrelevant was taken into account, or that something relevant was not considered]",
        "",
        "I ask that the decision be looked at again and made according to law.",
        "",
        "Please let me know what information you need from me. Thank you.",
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
  const reviewBody = entry.pathways[0]?.body ?? "the reviewing body";
  return {
    title: "Request to review a decision (merits review)",
    filename: `${entry.id}-merits-review.txt`,
    body: lines(
      header,
      "Re: Application for review of a decision",
      "",
      "Reference number: [reference number from your letter, if any]",
      "Date of the decision: [date on your letter]",
      "",
      `I am writing to apply for a review of the decision described above. I do not agree with the decision, and I ask that it be considered again by ${reviewBody}.`,
      "",
      "I ask that the decision be looked at afresh on the facts, so that the correct or preferable decision can be made on the material now available.",
      "",
      `Why I disagree, in my own words. ${inTheirWords("explain briefly what you think was wrong, and anything about your situation that has changed")}`,
      "",
      evidence,
      "",
      "Please let me know if you need anything further from me. Thank you for your help.",
      "",
      SIGN_OFF,
    ),
  };
}
