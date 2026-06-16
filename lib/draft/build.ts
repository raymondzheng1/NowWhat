import type { PathwayEntry } from "@/lib/schemas/corpus";

/**
 * Deterministic draft skeletons (PRD §6.6). Built from the corpus entry — no model
 * call (so no cost, no advice risk). Drafts are written in the PERSON's own voice
 * ("I am writing to…"); they are scaffolds the person edits, never filed for them.
 * A provision/figure is only included when it is a real (non-VERIFY) corpus value.
 */

export type DraftKind = "reasons-request" | "review-application";

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

  // review-application
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
    context ? `Why I disagree (in my own words): ${context}` : "Why I disagree (in my own words): [explain briefly what you think was wrong]",
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
    title: "Request to review a decision",
    filename: `${entry.id}-review-application.txt`,
    body,
  };
}
