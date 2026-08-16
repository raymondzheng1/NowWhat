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

  if (kind === "reasons-request") {
    const provisionLine = !isVerify(entry.rightToReasons.provision)
      ? `I understand I can ask for these reasons under ${entry.rightToReasons.provision}.`
      : "";
    const body = [
      header,
      "Re: Request for the reasons for a decision",
      "",
      "Reference number: [reference number from your letter, if any]",
      "Date of the decision: [date on your letter]",
      "",
      `I am writing to ask for the reasons for the decision described above. I would like a written statement that explains how the decision was made and what information it was based on.`,
      provisionLine,
      "",
      context ? `Some details about my situation: ${context}` : "",
      "",
      "Please send the reasons to the contact details above. Thank you for your help.",
      "",
      SIGN_OFF,
    ]
      .filter((l) => l !== "")
      .join("\n");
    return {
      title: "Request for the reasons for a decision",
      filename: `${entry.id}-reasons-request.txt`,
      body,
    };
  }

  // ---- Judicial review -------------------------------------------------------------
  // A different letter entirely: a court is asked to check LEGALITY, not to remake the
  // decision, so the letter names a ground and asks for the decision to be set aside and
  // sent back. Judicial review is technical and the corpus is explicit that free legal
  // help early really matters, so the draft says so at the top rather than pretending a
  // template is enough.
  if (kind === "judicial-review-application") {
    const jrBody = [
      header,
      "Re: Concern about how a decision was made",
      "",
      "Reference number: [reference number from your letter, if any]",
      "Date of the decision: [date on your letter]",
      "",
      "NOTE TO YOURSELF — PLEASE READ FIRST",
      "Judicial review is a court process, and it is technical.",
      "Court time limits are usually strict, and asking for reasons does not pause them.",
      "Please talk to a free legal service before you file anything.",
      "This draft is a starting point for that conversation, not a court document.",
      "",
      "I am writing about the decision described above. I am concerned about the way the",
      "decision was made, rather than only the outcome.",
      "",
      context
        ? `What happened, in my own words: ${context}`
        : "What happened, in my own words: [describe what you were told, what you were able to respond to, and what you think was not taken into account]",
      "",
      "The concern I want looked at:",
      "  [name the ground — for example, that you were not given a fair chance to respond,",
      "   that something irrelevant was taken into account, or that something relevant was",
      "   not considered]",
      "",
      "I would like the decision to be looked at again and made according to law.",
      "",
      "Please let me know what information you need from me. Thank you.",
      "",
      SIGN_OFF,
    ]
      .filter((l) => l !== "")
      .join("\n");

    return {
      title: "Judicial review — a starting point to take to a lawyer",
      filename: `${entry.id}-judicial-review.txt`,
      body: jrBody,
    };
  }

  // ---- Merits review ("review-application" is the legacy alias) ----------------------
  // A tribunal remakes the decision, asking what the correct or preferable decision is,
  // so this letter leads with the person's circumstances and their evidence.
  const evidence =
    entry.evidenceChecklist.length > 0
      ? "I am including, or can provide:\n" +
        entry.evidenceChecklist.map((e) => `  - ${e}`).join("\n")
      : "";
  const reviewBody = entry.pathways[0]?.body ?? "the reviewing body";
  const body = [
    header,
    "Re: Request to review a decision",
    "",
    "Reference number: [reference number from your letter, if any]",
    "Date of the decision: [date on your letter]",
    "",
    `I am writing to ask for a review of the decision described above. I do not agree with the decision and would like it to be looked at again by ${reviewBody}.`,
    "",
    "I would like the decision looked at afresh on the facts, so that the correct or",
    "preferable decision can be made.",
    "",
    context
      ? `Why I disagree (in my own words): ${context}`
      : "Why I disagree (in my own words): [explain briefly what you think was wrong, and anything about your situation that has changed]",
    "",
    evidence,
    "",
    "Please let me know if you need anything else from me. Thank you.",
    "",
    SIGN_OFF,
  ]
    .filter((l) => l !== "")
    .join("\n");

  return {
    title: "Request to review a decision (merits review)",
    filename: `${entry.id}-merits-review.txt`,
    body,
  };
}
