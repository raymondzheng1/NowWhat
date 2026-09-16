import type { AvenueView } from "@/lib/triage";
import type { Process } from "@/lib/schemas/legal";
import type { Jurisdiction } from "@/lib/schemas/data";

/**
 * The analysis layer — turns "here are your options" into "here is what this means and how
 * each path works".
 *
 * Everything substantive here comes from the LAWYER-VERIFIED legal corpus
 * (`corpus/legal/processes/*`): each process already carries the question the forum asks
 * ("Is this the correct or preferable decision?" / "Was the decision made lawfully?"), what
 * it can do (remedies), what it cannot do (limits), and a plain "good to know". This module
 * only DECIDES WHICH PATHS APPLY AND IN WHAT ORDER, and pairs them with framing copy that
 * lives in the i18n catalog (so the no-advice / reading-level / no-AI linters cover it).
 *
 * It is deterministic — no model, so nothing can be invented — and it never rates the
 * person's prospects, ranks grounds, or tells them what to do. It describes what each forum
 * is deciding, which is general legal information, not advice.
 *
 * ORDERING RULE: merits review comes first when it is available. That is not our opinion —
 * it follows from the corpus itself: a tribunal can "set aside and substitute" a new
 * decision, while a court "cannot substitute its own decision ... only require a lawful
 * re-decision". The corpus states it plainly: "Because the tribunal can change the outcome,
 * merits review is usually what people want when they disagree with the result."
 */

export type PathId = "internal-review" | "merits-review" | "court-election" | "judicial-review";

export interface PathPlan {
  id: PathId;
  /** 1 = the path people usually consider first for this decision. */
  order: number;
  /** The body that hears it, already cleaned for display (e.g. "ART", "VCAT"). */
  body: string;
  /** The question this forum is deciding (corpus). */
  question: string;
  /** What the forum can do (corpus remedies). */
  canDo: string[];
  /** What the forum cannot do (corpus limits). */
  cannotDo: string[];
  /**
   * What this forum decides FOR THIS DECISION TYPE — the substantive criteria the lawyer
   * supplied per scheme, not the generic "correct or preferable" framing. Merits review only:
   * judicial review applies grounds of review, not the enabling Act's criteria.
   */
  criteria: string[];
  /**
   * i18n key for the "what carries weight here" paragraph.
   *
   * It follows the BODY, not the slot. `focusMerits` describes what a tribunal weighs — "it
   * looks at the facts again … and decides what the correct or preferable decision is" — and
   * the merits path was handing that to whatever sat in its field. On a Victorian fine that
   * is the Magistrates' Court on election, so the card asserted the tribunal's test and then
   * contradicted itself three lines lower, in the caution saying this one is not a review of
   * the decision at all.
   */
  focusKey: "focusInternal" | "focusMerits" | "focusCourt" | "focusJudicial";
  /** Shown with a condition attached: this route exists only if the enabling Act provides it. */
  conditional: boolean;
  /**
   * What kind of body this is. Only the merits path varies: "tribunal" is the ordinary
   * case, "internal" is a reviewer inside the agency, and "mixed" is an entry covering
   * both. A non-tribunal body does NOT have a tribunal's remedies, and the card says so
   * rather than inheriting claims that are not true of it.
   */
  character: "tribunal" | "internal" | "mixed" | "court";
}

export interface ResultPlan {
  /** Every available path, in the order a person would usually consider them. */
  paths: PathPlan[];
  /** The path to lead with, or null when no formal review is available. */
  primary: PathPlan | null;
  /**
   * Whether the paths above run IN ORDER for this scheme, or are alternatives a person
   * chooses between. Undefined where no source settles it, and the panel then says only
   * that they are listed in the order people usually consider them.
   *
   * The numbering on the cards means different things in each case, and the difference is
   * not cosmetic: told that a Victorian fine must go to internal review before court, a
   * person can miss the court-election window entirely.
   */
  pathsAre?: "sequence" | "alternatives";
  /** i18n key for the one-paragraph orientation at the top. */
  leadKey:
    | "analysisLeadBoth"
    | "analysisLeadBothConditional"
    | "analysisLeadMerits"
    | "analysisLeadJudicial"
    | "analysisLeadNone";
}

/**
 * Values in the data layer that are NOT a readable forum name: internal routing codes, and
 * bare acronyms that read better as the corpus' full title. Everything else in that field
 * is the supervising lawyer's own decision-specific wording and must be shown verbatim.
 */
const NOT_A_FORUM_NAME = new Set(["ADJR/FederalCourt", "SCV-O56", "ART", "VCAT"]);

/**
 * The name to show for the forum.
 *
 * This is decision-specific and getting it wrong sends someone to the wrong place, so the
 * order matters. The data layer is the LAWYER-VERIFIED, per-decision source: for Victorian
 * fines the reviewing body is "internal review then Magistrates' Court", and for public
 * housing it is "Housing Appeals Office for a housing decision; VCAT for a notice to vacate".
 * Those must win.
 *
 * The legal corpus holds only the GENERAL body for each jurisdiction (VCAT / ART), which is
 * right when the data layer offers nothing readable — an internal judicial-review code, or
 * a bare acronym left behind after `cleanForDisplay` truncates at the first bracket.
 *
 * An earlier version preferred the corpus unconditionally. Because the corpus has a body for
 * every jurisdiction, the lawyer's value was never reached, and fines and public-housing
 * results both named VCAT — the wrong forum for fines, and silently dropping the free
 * Housing Appeals Office step for housing.
 */
function forumName(p: Process, jurisdiction: Jurisdiction | undefined, dataValue: string): string {
  const v = dataValue.trim();
  if (v && !NOT_A_FORUM_NAME.has(v)) return v;
  return p.bodies.find((b) => b.jurisdiction === jurisdiction)?.name ?? v;
}

/**
 * The corpus stores body names as they read at the start of a line ("The Administrative
 * Review Tribunal (ART)"). Dropped into the middle of a sentence — "lodge with The
 * Administrative Review Tribunal" — the capital reads like a typo, so lower the article.
 */
export function midSentence(name: string): string {
  return name.replace(/^The /, "the ");
}

export function planFor({
  avenue,
  meritsReview,
  judicialReview,
  jurisdiction,
  criteria = [],
  internalCriteria = [],
  courtCriteria = [],
}: {
  avenue: AvenueView;
  meritsReview: Process;
  judicialReview: Process;
  /** Used to pick the right body name from the corpus (ART vs VCAT, Federal vs Supreme). */
  jurisdiction?: Jurisdiction;
  /** `mrCriteria` from the lawyer-verified procedural layer, for this decision type. */
  criteria?: string[];
  /** `irCriteria` — what the INTERNAL reviewer considers for this decision type. */
  internalCriteria?: string[];
  /** `courtCriteria` — what a court hearing the matter itself decides. */
  courtCriteria?: string[];
}): ResultPlan {
  const paths: PathPlan[] = [];

  // Internal review leads where a source names one. Not a view about anyone's case: the
  // corpus says it plainly — "often the first step, and usually the cheapest one" — and for
  // most decisions this service covers it is the step the decision letter itself points at.
  //
  // It carries no question and no remedies, deliberately. The corpus holds those for the two
  // PROCESSES, and an internal reviewer is not a tribunal; the same entry that describes this
  // step also says "the rules are different for every department, so there is no single
  // answer about how it works". What it does carry is who looks at it again, which is the
  // thing a person needs in order to act.
  //
  // It DOES carry criteria where the lawyer supplied them for this scheme. Those are the
  // sourced, decision-specific part — for Victorian fines, the statutory grounds the issuing
  // agency applies — and they sat under the tribunal/court card until the list was split to
  // follow the avenue.
  if (avenue.irAvailable && avenue.irBody) {
    paths.push({
      id: "internal-review",
      order: paths.length + 1,
      body: avenue.irBody,
      question: "",
      canDo: [],
      cannotDo: [],
      criteria: internalCriteria,
      conditional: avenue.irConditional ?? false,
      character: "internal",
      focusKey: "focusInternal",
    });
  }

  // Merits review leads whenever it exists: it is the only path that can produce a
  // different outcome rather than a re-decision.
  if (avenue.mrAvailable) {
    // A body that is not a tribunal does not have a tribunal's powers, and until the
    // supervising lawyer says what the Housing Appeals Office can actually do, the app says
    // nothing about it. The remedies and limits below are the TRIBUNAL's, taken from the
    // corpus; attaching them to a departmental appeal asserted that an internal reviewer can
    // set a decision aside and substitute a new one. The owner ruled on 2026-08-23 to delete
    // the claim rather than wait for it to be confirmed.
    //
    // `mrCriteria` still says what the body decides for this decision type — that came from
    // the lawyer, per scheme, and is the part that was always sourced.
    const mrCharacter = avenue.mrCharacter ?? "tribunal";
    const isTribunal = mrCharacter === "tribunal";
    paths.push({
      id: "merits-review",
      order: paths.length + 1,
      body: forumName(meritsReview, jurisdiction, avenue.mrBody),
      question: isTribunal ? meritsReview.question : "",
      canDo: isTribunal ? meritsReview.remedies : [],
      cannotDo: isTribunal ? meritsReview.limits : [],
      criteria,
      conditional: avenue.mrConditional ?? false,
      character: mrCharacter,
      // The focus paragraph follows the body too. It was the last place the tribunal's test
      // survived on a non-tribunal card, and it is the most confusing one, because the card
      // then states the test and denies it within three lines.
      focusKey: isTribunal
        ? "focusMerits"
        : mrCharacter === "court"
          ? "focusCourt"
          : "focusInternal",
    });
  }
  // A court hearing the matter ITSELF. Its own path since 2026-09-16, because it is not
  // merits review and the body that hears it is not a merits-review body: it was sitting in
  // `avenue.mr` and every surface downstream inherited that mis-label.
  //
  // It carries no corpus question and no remedies. The two PROCESSES in the corpus are merits
  // review and judicial review; a court hearing a charge on election is neither, and giving
  // it either one's powers is the defect this path exists to end.
  if (avenue.courtAvailable && avenue.courtBody) {
    paths.push({
      id: "court-election",
      order: paths.length + 1,
      body: avenue.courtBody,
      question: "",
      canDo: [],
      cannotDo: [],
      criteria: courtCriteria,
      conditional: avenue.courtConditional ?? false,
      character: "court",
      focusKey: "focusCourt",
    });
  }

  if (avenue.jrAvailable) {
    paths.push({
      id: "judicial-review",
      order: paths.length + 1,
      body: forumName(judicialReview, jurisdiction, avenue.jrForum),
      question: judicialReview.question,
      canDo: judicialReview.remedies,
      cannotDo: judicialReview.limits,
      criteria: [],
      conditional: avenue.jrConditional ?? false,
      character: "court",
      focusKey: "focusJudicial",
    });
  }

  // The opening paragraph must not be more certain than the cards under it. Three entries now
  // carry a conditional path — both catch-alls, where merits review exists only if the enabling
  // Act provides it, and public housing, where the court path depends on who made the decision —
  // and all three landed on "Two paths are open for this decision" with a hedged card beneath.
  // A reader met the confident sentence first and had to work out which to believe.
  const anyConditional = paths.some((p) => p.conditional);
  // Keyed on HOW MANY paths there are, not on which two fields were set. It used to read
  // mrAvailable/jrAvailable only, so a scheme with internal review and a court election but
  // no tribunal — Victorian fines, once the court moved out of the merits slot — was
  // described by the judicial-review lead alone, and the other two cards went unmentioned.
  const leadKey: ResultPlan["leadKey"] =
    paths.length > 1
      ? anyConditional
        ? "analysisLeadBothConditional"
        : "analysisLeadBoth"
      : paths.length === 1
        ? paths[0]!.id === "judicial-review"
          ? "analysisLeadJudicial"
          : "analysisLeadMerits"
        : "analysisLeadNone";

  return { paths, primary: paths[0] ?? null, leadKey, pathsAre: avenue.pathsAre };
}
