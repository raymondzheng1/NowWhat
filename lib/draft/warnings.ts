/**
 * The NOTE TO YOURSELF blocks: the only lines in a draft addressed to the PERSON rather
 * than to the agency, and the only lines a rewrite may not touch.
 *
 * Two templates carry one, and both exist because the document could otherwise be mistaken
 * for a step it is not. The judicial-review draft is not a court filing. The court-election
 * enquiry does not elect anything — and the person reading it is the one least able to
 * absorb a filing that turns out to be the wrong one.
 *
 * SINGLE SOURCE OF TRUTH, and that is the whole point of the file. `lib/draft/build.ts`
 * renders these into the templates; `lib/letter/fidelity.ts` requires them back, verbatim,
 * out of any rewrite. They live in one place so the two cannot drift, because a warning
 * reworded in the template and still accepted by the gate is precisely the failure the gate
 * exists to prevent — and it would be invisible, since the letter would still read well.
 *
 * Until 2026-10-31 the gate checked only the heading, so a rewrite that kept the words
 * "NOTE TO YOURSELF" and softened the sentences underneath passed every check.
 */

export const SELF_WARNING_HEADING = "NOTE TO YOURSELF — PLEASE READ FIRST";

/** Judicial review is a court process, and a template is not a filing. */
export const SELF_WARNING_JUDICIAL_REVIEW =
  "Judicial review is a court process, and it is technical. Court time limits are usually strict, and asking for reasons does not always pause them. Please talk to a free legal service before you file anything. This draft is a starting point for that conversation, not a court document.";

/** The enquiry that comes BEFORE the election, and says so in its first line. */
export const SELF_WARNING_COURT_ELECTION =
  "This letter is not the election, and sending it does not elect anything. Asking for a matter to be heard in court is a formal step with its own form and its own time limit, and this letter only asks what that form is and when it is due. Please talk to a free legal service before you elect. A court hearing decides the matter itself, so it can end better than the notice you have, or worse, and it can carry costs.";

/**
 * Every block a rewrite must hand back unchanged. The label is what the refusal is logged
 * as, so it has to name the block rather than quote 400 characters of it.
 */
export const SELF_WARNING_BLOCKS = [
  { label: "the NOTE TO YOURSELF heading", text: SELF_WARNING_HEADING },
  { label: "the judicial-review warning", text: SELF_WARNING_JUDICIAL_REVIEW },
  { label: "the court-election warning", text: SELF_WARNING_COURT_ELECTION },
] as const;
