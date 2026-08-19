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

export type PathId = "merits-review" | "judicial-review";

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
  /** i18n key for the "what carries weight here" paragraph. */
  focusKey: "focusMerits" | "focusJudicial";
}

export interface ResultPlan {
  /** Every available path, in the order a person would usually consider them. */
  paths: PathPlan[];
  /** The path to lead with, or null when no formal review is available. */
  primary: PathPlan | null;
  /** i18n key for the one-paragraph orientation at the top. */
  leadKey: "analysisLeadBoth" | "analysisLeadMerits" | "analysisLeadJudicial" | "analysisLeadNone";
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
 * housing it is "Housing Appeals Office, then VCAT where applicable". Those must win.
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
}: {
  avenue: AvenueView;
  meritsReview: Process;
  judicialReview: Process;
  /** Used to pick the right body name from the corpus (ART vs VCAT, Federal vs Supreme). */
  jurisdiction?: Jurisdiction;
  /** `mrCriteria` from the lawyer-verified procedural layer, for this decision type. */
  criteria?: string[];
}): ResultPlan {
  const paths: PathPlan[] = [];

  // Merits review leads whenever it exists: it is the only path that can produce a
  // different outcome rather than a re-decision.
  if (avenue.mrAvailable) {
    paths.push({
      id: "merits-review",
      order: paths.length + 1,
      body: forumName(meritsReview, jurisdiction, avenue.mrBody),
      question: meritsReview.question,
      canDo: meritsReview.remedies,
      cannotDo: meritsReview.limits,
      criteria,
      focusKey: "focusMerits",
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
      focusKey: "focusJudicial",
    });
  }

  const leadKey: ResultPlan["leadKey"] =
    avenue.mrAvailable && avenue.jrAvailable
      ? "analysisLeadBoth"
      : avenue.mrAvailable
        ? "analysisLeadMerits"
        : avenue.jrAvailable
          ? "analysisLeadJudicial"
          : "analysisLeadNone";

  return { paths, primary: paths[0] ?? null, leadKey };
}
