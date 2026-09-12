/**
 * Extra questions asked for a particular kind of decision.
 *
 * The generic intake asks what happened and what the person is hoping for. That is enough to
 * route them, and not enough to write a memo: the fact that decides a housing matter — is
 * this a notice to vacate, or a decision about your application? — is never asked, so the
 * memo cannot say which body the person is actually in front of.
 *
 * WHY THESE ARE HARD-CODED, AND WHY THE LIST IS SHORT. A question asserts that its answer
 * matters legally, which makes it a claim like any other, so each one here had to be traced
 * to something the corpus already says and then survive three independent adversarial
 * reviews — grounding, safety, plainness — with no dissent. Most drafts did not survive, and
 * that is the system working: the ones that fell were asking for figures we cannot source,
 * for conclusions a person cannot reach about their own case, or for detail the memo would
 * never use.
 *
 * `groundedIn` is not decoration. It is the quote that justifies asking, kept next to the
 * question so the next person to touch this can check it rather than trust it.
 */

export type SchemeQuestionKind = "text" | "yesno" | "date";

export interface SchemeQuestion {
  /** Stable key. Becomes the answer's id, and the heading it appears under in the memo. */
  id: string;
  /** What the person reads. Plain, short, one idea. */
  label: string;
  /** One line of help, or empty. */
  hint: string;
  kind: SchemeQuestionKind;
  /** What the memo does with the answer — for maintainers, never shown. */
  why: string;
  /** The corpus sentence that makes the answer matter, quoted, with its file. */
  groundedIn: string;
}

/**
 * Keyed by data-entry id. An entry with no list simply asks nothing extra, which is the
 * correct default: no question is better than an ungrounded one.
 */
export const SCHEME_QUESTIONS: Record<string, SchemeQuestion[]> = {
  "vic-fines": [
    {
      id: "notice-stage",
      label: "What is your notice called? Look at the top of the page.",
      hint: "For example: infringement notice, penalty reminder notice, or notice of final demand.",
      kind: "text",
      why:
        "The stage decides which options are open, and nothing else in the intake asks it. " +
        "It goes into the memo as a fact, so a duty lawyer sees it first.",
      groundedIn:
        'corpus/pathways/vic-fines.md — reviewable.basis: "What you can do depends on the ' +
        'stage your fine has reached." The same file lists "any letters showing what stage ' +
        'your fine has reached" in its evidence checklist, and its explainer names the ' +
        "stages. Verbatim check: 2026-09-12.",
    },
  ],
  // Both catch-alls carry the same gap and the same field, so they carry the same question.
  // A person on a catch-all has told us nothing about WHO decided, and the entry can only
  // call them "the agency that made the decision" — which is what the memo then prints as
  // the body to write to.
  "vic-generic": [
    {
      id: "deciding-body",
      label: "Who made this decision? For example a department, council or other government body.",
      hint: "The name at the top of your letter is enough.",
      kind: "text",
      why:
        "Lets the memo name the body instead of the generic phrase, and tells a free service " +
        "whether this is a state body or a council before they read a word.",
      groundedIn:
        'data/pathways/vic-generic.md — avenue.ir.body: "the agency that made the decision"; ' +
        'reasonsRequest.how: "ask the decision-maker in writing for a statement of reasons". ' +
        "Verbatim check: 2026-09-12.",
    },
  ],
  "cth-generic": [
    {
      id: "deciding-body",
      label: "Who made this decision? For example a department or other government body.",
      hint: "The name at the top of your letter is enough.",
      why:
        "The Commonwealth twin of the Victorian question above. It cleared review for " +
        "vic-generic unanimously, on a field cth-generic carries identically — shipping it " +
        "for one catch-all and not the other would be arbitrary, not cautious.",
      kind: "text",
      groundedIn:
        'data/pathways/cth-generic.md — avenue.ir.body: "the agency that made the decision", ' +
        'and the entry note: "the body is named no more precisely than we can know it — the ' +
        'agency that made the decision". Verbatim check: 2026-09-12.',
    },
  ],
};

export function questionsForScheme(entryId: string): SchemeQuestion[] {
  return SCHEME_QUESTIONS[entryId] ?? [];
}
