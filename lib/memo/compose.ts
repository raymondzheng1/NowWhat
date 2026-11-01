import type { Concept, Ground, Process } from "@/lib/schemas/legal";
import { todayLocal } from "@/lib/time/clock";
import type { DataPathway } from "@/lib/schemas/data";
import { ruleForPath, officialSourceForPath, type RulePath } from "@/lib/deadline/rule";
import { midSentence } from "@/lib/analysis";
import { answerableCriteria, withCriterionIds } from "@/lib/memo/criteria";
import { titleAsPhrase } from "@/lib/text/title";

/**
 * The memo.
 *
 * The owner supplied two worked memoranda as the model for this output. They are structured
 * as IRAC — issue, rule, application, conclusion — and they argue each point both ways before
 * reaching a view. That discipline is what makes them useful, and it is what this reproduces.
 *
 * TWO THINGS FROM THOSE MEMORANDA ARE DELIBERATELY NOT REPRODUCED, on the owner's express
 * decision (2026-08-22):
 *
 *   · No prospects. The merits memorandum says "Clive's prospects of success are high" and
 *     "VCAT is highly likely to grant Clive the licence". This never predicts an outcome.
 *   · No ranking. The judicial review memorandum identifies "the strongest ground(s)" and
 *     places that assessment front and centre. This lists grounds in corpus order and says
 *     nothing about which is better.
 *
 * What survives is the part that helps a self-represented person: the question each ground
 * asks, the test a court applies, what they have said that relates to it, and — the piece
 * people most often have no idea about — the argument the other side will put back.
 *
 * Everything here is composed on-device from the corpus and the person's own words. No model
 * call, no network, nothing stored. The person's narrative is quoted, never characterised.
 */

export interface MemoInput {
  entry: DataPathway;
  /**
   * The forum process this memo works through — merits review or judicial review.
   *
   * NULL when the person chose internal review, which is not one of them. The corpus holds
   * two PROCESSES, each with a question, remedies and limits confirmed for it; an internal
   * reviewer has none of those recorded, and borrowing a tribunal's is the exact defect that
   * put a departmental reviewer on a tribunal's card. So the memo drops those sections
   * rather than filling them, and works from `internal` instead.
   */
  process: Process | null;
  /**
   * The internal-review concept, when that is the path being worked through. Everything the
   * memo says about the step comes from here — what it means, what it is not, and the key
   * points — so it is as sourced as the process memo, just from a different entry.
   */
  internal?: Concept | null;
  /** Their own words on what they are asking the decision-maker to look at again. */
  internalNote?: string;
  /**
   * The standing concept, when one is available.
   *
   * The reference memos give standing its own issue, before the grounds, because a body that
   * does not accept the application never reaches them. We had the concept in the corpus and
   * the memo never opened it. Optional, so a caller that does not pass it loses nothing.
   */
  standing?: Concept | null;
  /**
   * The justiciability concept, read only where the scheme records a privative clause.
   *
   * What such a clause can actually do is a question in itself, and it is the one the
   * reference memo keeps to the end as a discrete issue. We state only that the scheme has
   * one, and send them to a person — we do not construe it.
   */
  justiciability?: Concept | null;
  /**
   * What kind of body the chosen path actually is, from `planFor`.
   *
   * The card and the plan stopped attributing a tribunal's question and remedies to a
   * non-tribunal on 2026-08-23. The memo went on doing it, because it re-derived everything
   * from the PROCESS: pick the merits path for a Victorian fine and the memo told a duty
   * lawyer that the Magistrates' Court asks "Is this the correct or preferable decision?"
   * and can set the decision aside and substitute its own. A court hearing a fine on
   * election does neither.
   *
   * Same rule as `planFor`: only a tribunal gets the tribunal's question, remedies and
   * limits. Judicial review is unaffected — it carries the court process's own.
   */
  character?: "tribunal" | "internal" | "mixed" | "court" | "dispute";
  /**
   * The scheme-specific criteria for THIS path — `mrCriteria` or `irCriteria`, chosen by the
   * caller. Defaults to the old behaviour (the merits list, on a merits memo) so nothing
   * changes for callers that do not pass it.
   */
  criteria?: string[];
  /** Grounds the person marked as possibly relating to them, in corpus order. */
  grounds: Ground[];
  /**
   * What the person wrote against a particular ground, keyed by ground id.
   *
   * The memo used to carry one account of what happened and nothing else, so a person who
   * had something specific to say about ONE point — the letter they never saw, the phone
   * call nobody returned — had nowhere to put it, and the memo read as though the grounds
   * were ours rather than theirs.
   *
   * Quoted verbatim, exactly like the story, and never characterised. We do not say the note
   * proves anything, relates to anything, or makes the point stronger.
   */
  groundNotes?: Record<string, string>;
  /**
   * What the person wrote against each merits-review criterion, keyed by the criterion text.
   *
   * Merits review is not argued on grounds of review, so a memo about it needs their words
   * against what the tribunal actually decides — not against a list of judicial-review
   * grounds that has nothing to do with what they are doing.
   */
  criteriaNotes?: Record<string, string>;
  /**
   * Their answers to the questions this SCHEME asks, paired with the question.
   *
   * They were briefly merged into `criteriaNotes`, which looks answers up by the CRITERION
   * they sit under — so an answer keyed by its question matched nothing and printed nowhere.
   * They are their own section: the question is the heading, because the answer means
   * nothing without it.
   */
  schemeAnswers?: { question: string; answer: string }[];
  /** What they wrote about what happened. Quoted verbatim or omitted. */
  story: string;
  /** What they said they are hoping for, already rendered to plain labels. */
  goals: string[];
  /** Anything they added in their own words on the goal step. */
  goalOther: string;
  decisionDate?: string;
  /** The forum name for this decision, from the lawyer-verified data layer. */
  forum: string;
  /**
   * Every path open for this decision, not only the one being worked through.
   *
   * Carried over from the separate "matter summary" this memo replaced on 2026-09-11. That
   * document was thinner than the memo in every other respect, but it did list all the
   * avenues — which is the first thing a duty lawyer wants to know, and the memo did not say.
   */
  paths?: {
    name: string;
    body: string;
    question: string;
    conditional: boolean;
    /**
     * The path these notes work through. Listed under "the others" it contradicted the whole
     * document: someone working through an internal review read, at the foot of it, that an
     * internal review "may not apply to this decision". Whether it applies is the memo's own
     * first issue, set out above; it is not repeated as an afterthought here.
     */
    chosen?: boolean;
  }[];
  /**
   * Build fingerprint of the knowledge layer this memo was composed from. Optional, because
   * the memo must still compose without it — a missing version is a missing line, never a
   * missing memo.
   */
  corpusVersion?: string;
  /**
   * Base URL for links back into the app's own guides.
   *
   * The memo sets out the test for each point and the cases it comes from, then stopped —
   * so a reader who wanted the full explanation of a ground had no way from the page they
   * were holding to the page that explains it. Every ground already has one, and this is
   * a plain-text document, so the link is written out in full rather than hidden in markup.
   *
   * Omitted in tests and anywhere a base URL is not known; the memo simply carries no links.
   */
  siteUrl?: string;
  /** Where the chosen path is explained in the app, relative (e.g. "/learn/merits-review"). */
  pathHref?: string;
  /**
   * The drafted application, when one came back from /api/memo and passed every gate.
   *
   * It replaces the generic "what tends to relate to this" list with what THIS person's
   * account has to do with the test, and adds the answer they will get back. Absent — no
   * key, a blocked cost guard, a failed gate — the memo composes exactly as it always did,
   * so this can only ever add to what a person gets, never subtract.
   */
  drafted?: {
    summary?: string;
    application?: {
      groundId: string;
      forThem: string;
      against: string;
      toTest: string;
      /**
       * The same application, one PART of the test at a time, keyed by the part's own id.
       *
       * Optional, and matched by id rather than by position: a part the draft said nothing
       * about, a part it answered with an id we never supplied, and a draft that never
       * arrived all come out the same way — the part prints its question and nothing more,
       * exactly as it did before any of this existed.
       */
      elements?: { elementId: string; says: string; missing: string }[];
    }[];
    /**
     * The same work against WHAT THE BODY DECIDES, keyed by the criterion's own id.
     *
     * Not nested in `application`: a criterion belongs to the forum, not to any ground, and
     * on the paths where these are written there are no grounds at all. Matched by id on the
     * same terms as the parts above — an id we did not supply finds no criterion and prints
     * nowhere, which is why the ids are derived from the criteria's words rather than their
     * position in a list that is built twice.
     */
    criteria?: { criterionId: string; says: string; missing: string }[];
  } | null;
  /** The path being worked through: picks the part of the time rule, and the official link. */
  pathId?: RulePath;
  /** Section headings, so all customer prose stays in the i18n layer. */
  t: (key: string) => string;
}

/**
 * One piece of the memo, in a form a page can render and a text file can print.
 *
 * The memo used to be a string, shown in a <textarea>. That made every link in it inert —
 * the guides it points at arrived as text a reader had to retype — and it threw away the
 * structure a legal note depends on, so headings, points and quotes all came out as the same
 * grey monospace. Blocks are emitted once and the plain text is derived FROM the same calls,
 * so the page and the downloaded file can never say different things.
 */
export type MemoBlock =
  | { kind: "heading"; text: string }
  | { kind: "subheading"; text: string }
  | { kind: "para"; text: string }
  | { kind: "meta"; label: string; value: string }
  | { kind: "item"; text: string; detail?: string }
  /**
   * OUR words about ONE part of a test, sitting under that part.
   *
   * Its own kind because of where it has to sit. A `para` renders flush with the heading
   * above it, so four parts in a row each gaining a paragraph produced four paragraphs a
   * reader could not tie back to the part they answered — and the whole point of writing
   * to a part rather than to the ground is lost if the reader cannot tell which is which.
   *
   * Deliberately NOT a `quote`: that kind is reserved for the person's own words and is set
   * apart so a reader can see at a glance which half of this document is theirs. These are
   * ours, about what they said, and the two must never look alike.
   */
  | { kind: "note"; label: string; text: string }
  | { kind: "quote"; text: string; label?: string }
  | { kind: "link"; text: string; href: string }
  /**
   * A free service: its name opens its site, its number dials. Most people read this on a
   * phone, and the list printed "Fines Victoria — (03) 9200 8111" as plain text, so calling
   * meant copying the number out by hand (the owner's QA).
   */
  | { kind: "contact"; service: string; href: string; phone?: string }
  | { kind: "disclaimer"; text: string };

export interface Memo {
  title: string;
  /** The whole memo as plain text, for copying and for the downloaded file. */
  body: string;
  /** The same memo as structure, for rendering on the page with live links. */
  blocks: MemoBlock[];
}

const rule = (s: string) => s.replace(/\s+/g, " ").trim();

/** An absolute link into the app's own guides, or nothing when no base URL is known. */
const guide = (base: string | undefined, path: string) =>
  base ? `${base.replace(/\/+$/, "")}${path}` : "";

/** A short, quoted extract of the person's own account — never paraphrased. */
function quoted(story: string): string[] {
  const s = story.trim();
  if (!s) return [];
  return s
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `  "${p.replace(/\s+/g, " ")}"`);
}

/**
 * What to call the path this memo works through.
 *
 * Exported because TWO places need it and they used to work it out separately: the memo
 * itself, and the request that asks for the drafted paragraph. The second one derived it as
 * `process.plainName`, and the process in hand for a court election is the MERITS process —
 * so a draft about the Magistrates' Court would have been written under the heading "asking
 * for a fresh look at the decision", which is the one thing that court does not do. That
 * mis-label has been patched on the card, in the plan, in the hand-off and in this memo's
 * own heading; each time the cause was the same, that the name is worked out in more than
 * one place. Now it is worked out here, once.
 *
 * `character` is what distinguishes a court election from merits review, because the caller
 * has no process to hand for it: the corpus holds two, and a court hearing a charge on
 * election is neither.
 */
export function memoPathName(input: {
  process: Process | null;
  internal?: Concept | null;
  character?: "tribunal" | "internal" | "mixed" | "court" | "dispute";
  t: (key: string) => string;
}): string {
  const { process: proc, internal = null, character = "tribunal", t } = input;
  // No process at all: an internal review, which is a decision-maker, not a forum.
  if (!proc) return internal?.plainName ?? t("pathTitleInternal");
  // Judicial review is a court carrying its own process, so it keeps its own name whatever
  // the body is called.
  if (proc.id === "judicial-review") return proc.plainName;
  // A court hearing the matter itself. The process in hand is not its process.
  if (character === "court") return t("memoPathCourt");
  // A dispute heard and decided, not a decision looked at again (renting).
  if (character === "dispute") return t("memoPathDispute");
  // Merits review — including where the body is an internal or mixed one. It is still a
  // fresh look at the decision, and the old nested form called those a court.
  return proc.plainName;
}

export function composeMemo(input: MemoInput): Memo {
  const {
    entry,
    process: proc,
    internal = null,
    internalNote = "",
    character = "tribunal",
    grounds,
    story,
    goals,
    goalOther,
    groundNotes = {},
    criteriaNotes = {},
    decisionDate,
    forum,
    corpusVersion,
    pathId,
    t,
  } = input;
  const L: string[] = [];
  const B: MemoBlock[] = [];
  const h = (x: string) => {
    L.push("");
    L.push(x.toUpperCase());
    L.push("=".repeat(Math.min(x.length, 64)));
    B.push({ kind: "heading", text: x });
  };
  const sub = (x: string) => {
    L.push("");
    L.push(x);
    L.push("-".repeat(Math.min(x.length, 64)));
    B.push({ kind: "subheading", text: x });
  };
  /** A plain line of prose. `indent` only affects the text form. */
  const para = (x: string, indent = "") => {
    L.push(`${indent}${x}`);
    B.push({ kind: "para", text: x });
  };
  const meta = (label: string, value: string) => {
    L.push(`${label}: ${value}`);
    B.push({ kind: "meta", label, value });
  };
  const item = (x: string, detail?: string) => {
    L.push(`  - ${x}`);
    if (detail) L.push(`      ${detail}`);
    B.push({ kind: "item", text: x, ...(detail ? { detail } : {}) });
  };
  /** The person's own words. Quoted in both forms, characterised in neither. */
  const quote = (x: string, label?: string, indent = "  ") => {
    if (label) L.push(`${indent === "  " ? "" : "      "}${label}:`);
    L.push(`${indent}"${x}"`);
    B.push({ kind: "quote", text: x, ...(label ? { label } : {}) });
  };
  /** A subordinate line under the item above it. Indented in both forms. */
  const noteLine = (label: string, text: string, indent = "      ") => {
    L.push(`${indent}${label}: ${text}`);
    B.push({ kind: "note", label, text });
  };
  /**
   * One criterion: the lawyer's line, their own words under it, then the drafted analysis.
   *
   * THE ANALYSIS AGAINST WHAT THE BODY ACTUALLY DECIDES. The memo listed these lines and
   * stopped — and on every path except judicial review that list was the whole of the legal
   * substance, so the document named what the body looks at and did none of the work. This
   * is the element walk, applied where most people actually are.
   *
   * Written once and called from both places criteria appear (an internal review's issue 2,
   * and the forum's issue 2) so the two cannot drift into saying it differently. Matched by
   * an id derived from the criterion's own words: this list is built here and in the
   * context separately, and an id from a list that differs finds nothing rather than filing
   * someone's facts under a line they were never shown.
   *
   * `noteLine`, not `quote`: these are OUR words about what they said. Quoting is for theirs.
   */
  const criterion = (text: string, id: string | null) => {
    item(rule(text));
    const n = (criteriaNotes[text] ?? "").trim().replace(/\s+/g, " ");
    if (n) quote(n, t("memoYourNote"), "        ");
    if (!id) return;
    const d = input.drafted?.criteria?.find((x) => x.criterionId === id);
    const says = (d?.says ?? "").trim();
    const missing = (d?.missing ?? "").trim();
    if (says) noteLine(t("memoCriterionSays"), rule(says));
    if (missing) noteLine(t("memoCriterionMissing"), rule(missing));
  };
  /** The ids for a criteria list, on the same two rules the context uses. */
  const criterionIds = (list: string[]) => {
    const ided = withCriterionIds(answerableCriteria(entry, list));
    return (c: string) => ided.find((x) => x.text === c)?.id ?? null;
  };
  const link = (label: string, href: string) => {
    L.push(`${label}: ${href}`);
    B.push({ kind: "link", text: label, href });
  };
  const blank = () => L.push("");
  const disclaimer = (x: string) => {
    L.push(x);
    B.push({ kind: "disclaimer", text: x });
  };
  // The name of the path, from whichever entry describes it. One of the two must be
  // present; the caller decides which, from the approach the person chose.
  // The same test `planFor` applies to the card, computed once and used everywhere below.
  // Only a tribunal gets a tribunal's eligibility rules, question, remedies and name;
  // judicial review is unaffected because it carries a court process's own.
  const isTribunal = proc ? proc.id === "judicial-review" || character === "tribunal" : false;
  // A COURT ELECTION IS NOT A FRESH LOOK AT THE DECISION. The caller has no process to hand
  // for it — the corpus holds two, and a court hearing a charge on election is neither — so
  // it passes the merits process and `character: "court"`. Issue 2 already knew to distrust
  // that. The heading did not, so a memo about the Magistrates' Court was titled with the
  // merits process's own plain name, "asking for a fresh look at the decision", which is the
  // one thing that court does not do.
  const pathName = memoPathName({ process: proc, internal, character, t });

  const title = `${t("memoTitle")} — ${entry.title}`;
  L.push(title);
  L.push("");
  meta(t("memoAbout"), entry.title);
  if (decisionDate) meta(t("memoDecisionDate"), decisionDate);
  meta(t("memoPath"), `${pathName} (${forum})`);
  {
    const pHref = input.pathHref ? guide(input.siteUrl, input.pathHref) : "";
    if (pHref) link(t("memoReadMore"), pHref);
  }
  meta(t("memoPrepared"), todayLocal());
  blank();
  disclaimer(t("memoNotAdvice"));

  // ---- Summary --------------------------------------------------------------------
  //
  // The memo used to open on the header block and go straight into quoting the person back
  // at themselves. Someone handing this to a duty lawyer needs the shape of the matter in
  // the first few lines: what the decision was, when, what they want, and which path this
  // note works through. Assembled from what is already here — it states nothing new, and it
  // does not say how any of it is likely to go.
  h(t("memoSummary"));
  {
    const bits: string[] = [];
    // `titleAsPhrase`, not `title.toLowerCase()`: the copy used to carry its own "a", so a
    // title that already began with one printed "about a a victorian government decision",
    // and every proper noun in a title came out lowercase.
    bits.push(
      decisionDate
        ? `${t("memoSummaryAbout")} ${titleAsPhrase(entry.title)}, ${t("memoSummaryDated")} ${decisionDate}.`
        : `${t("memoSummaryAbout")} ${titleAsPhrase(entry.title)}.`,
    );
    if (goals.length || goalOther.trim()) {
      const said = [...goals, ...(goalOther.trim() ? [goalOther.trim()] : [])]
        .map((g) => g.toLowerCase().replace(/\s+/g, " "))
        .join("; ");
      bits.push(`${t("memoSummaryWants")} ${said}.`);
    }
    bits.push(`${t("memoSummaryPath")} ${pathName.toLowerCase()}, ${t("memoSummaryAt")} ${midSentence(forum)}.`);
    if (grounds.length) {
      bits.push(
        grounds.length === 1
          ? t("memoSummaryOnePoint")
          // The count is substituted HERE, not by the translator's formatter, because the
          // `t` this composer is given takes a key and nothing else — that is what keeps
          // every line of customer prose in the i18n layer.
          //
          // So the placeholder is %n, which carries no meaning to an ICU formatter. It used
          // to be {n}, which does: next-intl reads a value with braces as a message that
          // REQUIRES an argument, and called with none it printed the key. Anyone who marked
          // more than one point read "rights.memoSummaryPoints" in the middle of their
          // analysis. No test saw it, because a test `t` is a plain lookup that never runs a
          // formatter at all — so the convention is pinned statically in the drift suite.
          : t("memoSummaryPoints").replace("%n", String(grounds.length)),
      );
    }
    // Say what the memo actually contains. The internal line promised "three questions" and
    // the third — what you are asking them to look at — only exists when the person wrote
    // something in the box. Left blank, the memo announced a section it did not have.
    bits.push(
      proc
        ? t("memoSummaryReads")
        : internalNote.trim()
          ? t("memoSummaryReadsInternal")
          : t("memoSummaryReadsInternalShort"),
    );
    // A drafted paragraph reads better than four assembled sentences, but it never replaces
    // the facts: the decision, the date, the path and the count are stated either way.
    const draftedSummary = input.drafted?.summary?.trim();
    if (draftedSummary) {
      para(bits[0]!);
      para(draftedSummary);
    } else {
      for (const b of bits) para(b);
    }
  }

  // ---- What they told us ----------------------------------------------------------
  const q = quoted(story);
  if (q.length || goals.length || goalOther.trim()) {
    h(t("memoWhatYouTold"));
    if (goals.length) {
      para(`${t("memoYouWant")}:`);
      for (const g of goals) item(g);
    }
    if (goalOther.trim()) {
      blank();
      quote(goalOther.trim().replace(/\s+/g, " "));
    }
    if (q.length) {
      blank();
      para(`${t("memoYourAccount")}:`);
      for (const x of q) quote(x.trim().replace(/^"|"$/g, ""));
    }
    // What this scheme asked, and what they said. Under the question, because the answer is
    // meaningless without it — "Notice of final demand" tells a reader nothing on its own.
    const sa = (input.schemeAnswers ?? []).filter((x) => x.answer.trim());
    if (sa.length) {
      for (const x of sa) {
        blank();
        para(`${x.question}`);
        quote(x.answer.trim().replace(/\s+/g, " "));
      }
    }
  }

  // ---- Internal review ------------------------------------------------------------
  //
  // A different shape, because a different thing is being asked. There is no forum to be
  // admitted to and no set of powers to set out; there is a decision-maker being asked to
  // look again. What the memo can say about it is what the corpus entry says, and their own
  // words about what they want looked at.
  if (!proc && internal) {
    h(t("memoIssue1Internal"));
    para(t("memoIssue1QInternal"));
    sub(t("memoRule"));
    for (const k of internal.keyPoints) item(rule(k));
    sub(t("memoApplication"));
    para(`${t("memoInternalBodyIs")} ${midSentence(forum)}.`, "  ");
    if (entry.deadlineRule) para(rule(ruleForPath(entry.deadlineRule, pathId)), "  ");
    para(t("memoTimeCheck"), "  ");

    h(t("memoIssue2Internal"));
    para(rule(internal.whatItMeans));
    // What the lawyer supplied for THIS scheme, where they supplied it. For a Victorian fine
    // that is the statutory review grounds the issuing agency applies — the part a duty
    // lawyer most needs, and the part that was sitting under the Magistrates' Court card
    // until the criteria were split to follow the avenue.
    if (input.criteria && input.criteria.length) {
      sub(t("memoRule"));
      const idOf = criterionIds(input.criteria);
      for (const c of input.criteria) criterion(c, idOf(c));
    }
    if (internal.whatItIsNot) {
      sub(t("memoWhatItIsNot"));
      para(rule(internal.whatItIsNot), "  ");
    }

    const askedFor = internalNote.trim().replace(/\s+/g, " ");
    if (askedFor) {
      h(t("memoIssue3Internal"));
      quote(askedFor, t("memoYourNote"));
    }
  }

  // ---- Issue 1: can you apply? -----------------------------------------------------
  if (proc) {
  h(t("memoIssue1"));
  para(t("memoIssue1Q"));
  sub(t("memoRule"));
  // Only where they are this body's rules. We hold no verified eligibility rules for a court
  // election, so the memo says so and keeps the forum, the deadline rule and the time-limit
  // warning — all of which come from the entry, not from the process.
  if (isTribunal || proc.id === "judicial-review") {
    for (const c of proc.canApply) item(rule(c));
  } else {
    para(t("memoNoProcessRule"), "  ");
  }
  sub(t("memoApplication"));
  para(`${t("memoForumIs")} ${midSentence(forum)}.`, "  ");
  if (entry.deadlineRule) para(rule(ruleForPath(entry.deadlineRule, pathId)), "  ");
  para(t("memoTimeCheck"), "  ");
  // STANDING, as a sub-issue of eligibility. The Rule above already names it in one clause
  // and then never returned to it, so the one document a duty lawyer reads said nothing
  // about whether the application was this person's to bring. Every word is the corpus
  // concept's own, so no new rule is stated.
  if (input.standing) {
    sub(t("memoStanding"));
    para(t("memoStandingQ"), "  ");
    para(rule(input.standing.whatItMeans), "  ");
    for (const k of input.standing.keyPoints) item(rule(k));
    if (input.standing.whatItIsNot) {
      para(`${t("memoWhatItIsNot")}: ${rule(input.standing.whatItIsNot)}`, "  ");
    }
  }

  // ---- Issue 2: what the forum decides ---------------------------------------------
  //
  // A body that is not a tribunal does not get the tribunal's question, remedies or limits —
  // the same rule `planFor` applies to the card. Judicial review is never affected: it is a
  // court path carrying the court process's own question and remedies, not borrowed ones.
  h(t("memoIssue2"));
  if (isTribunal) para(`${t("memoQuestionAsked")}: "${proc.question}"`);
  else para(t(character === "dispute" ? "memoDisputeNote" : "memoNotATribunal"));
  // How the body works, and what is good to know about it — the corpus's own words. The notes
  // printed the question and the remedies and never this, which is the part a reviewer most
  // wants a person to have understood (the merits-review benchmark).
  if (isTribunal || proc.id === "judicial-review") {
    sub(t("memoHowItWorks"));
    para(rule(proc.whatItIs), "  ");
    if (proc.goodToKnow.length) {
      sub(t("memoGoodToKnow"));
      for (const g of proc.goodToKnow) item(rule(g));
    }
  }
  const criteriaList = input.criteria ?? (proc.id === "merits-review" ? entry.mrCriteria : []);
  if (criteriaList.length) {
    sub(t("memoRule"));
    const idOf = criterionIds(criteriaList);
    for (const c of criteriaList) criterion(c, idOf(c));
  }
  if (isTribunal) {
    sub(t("memoWhatItCanDo"));
    for (const r of proc.remedies) item(rule(r));
    if (proc.limits.length) {
      sub(t("memoWhatItCannotDo"));
      for (const r of proc.limits) item(rule(r));
    }
  }
  }

  // ---- Issue 3: the points raised, each argued both ways ---------------------------
  if (grounds.length) {
    h(t("memoIssue3"));
    para(t("memoGroundsLead"));
    grounds.forEach((g, i) => {
      sub(`${i + 1}. ${g.name}: ${g.plainName}`);
      para(`${t("memoIssue")}: ${rule(g.oneLine)}`);
      blank();
      para(`${t("memoRule")}: ${rule(g.test)}`);
      if (g.leadingCases.length) {
        blank();
        para(`${t("memoWhereFrom")}:`);
        for (const c of g.leadingCases) {
          item(`${c.name}${c.pinpoint ? ` (${c.pinpoint})` : ""}`, c.explains ? rule(c.explains) : undefined);
        }
      }
      // WHAT THE POINT BREAKS INTO. `elements` has been on every ground since the corpus
      // was written and nothing read it, so the memo stated a test and then never worked
      // through it — which is the difference between naming a rule and applying one. Each
      // element carries its own `layPrompt`, a question already written for a lay reader
      // and already inside the reading-level gate, so this adds no new claim and no new
      // prose of ours.
      // WHAT TENDS TO RELATE TO THIS, which is rule material rather than application: it is
      // what the corpus says about the test in general, true of anyone raising it. It used
      // to sit after the parts, and once the parts carried what THIS person had said, the
      // list closed by asking them to say which of these happened to them — after the memo
      // had already set out what they said. Same words, read before the application instead.
      blank();
      para(`${t("memoArgument")}:`);
      for (const w of g.whatRelates) item(rule(w));
      para(t("memoArgumentNote"), "  ");
      const d = input.drafted?.application?.find((a) => a.groundId === g.id);
      // The application OPENS on the point as a whole, then works through the parts. That
      // order is the reference memoranda's own, and it was worth moving this block up for:
      // the overview read as an afterthought when it came after the parts it introduces.
      if (d?.forThem.trim()) {
        blank();
        sub(t("memoDraftedForThem"));
        para(rule(d.forThem));
      }
      if (g.elements.length) {
        blank();
        sub(t("memoElements"));
        para(t("memoElementsLead"), "  ");
        for (const el of g.elements) {
          item(rule(el.name), el.layPrompt ? `${t("memoElementAsked")}: ${rule(el.layPrompt)}` : undefined);
          // THE APPLICATION, UNDER THE PART IT BELONGS TO. Matched by id inside this
          // ground — element ids are local ("notice", "applies"), so the same id means
          // different things under different grounds and a global lookup would misfile
          // the answer. An id we never supplied finds no part and prints nowhere.
          //
          // `para`, not `quote`: these are OUR words about what they said. Quoting is
          // reserved for their own, and blurring that line is how a memo ends up
          // attributing a sentence to a person who never wrote it.
          const de = d?.elements?.find((x) => x.elementId === el.id);
          const says = (de?.says ?? "").trim();
          const missing = (de?.missing ?? "").trim();
          if (says) noteLine(t("memoElementSays"), rule(says));
          if (missing) noteLine(t("memoElementMissing"), rule(missing));
        }
      }
      // What their account has to do with THIS test, and the answer they will get back.
      // The generic list above stays: it is what the corpus says relates to the ground in
      // general, and it is true whether or not a draft arrived.
      if (d) {
        if (d.against.trim()) {
          blank();
          sub(t("memoDraftedAgainst"));
          para(rule(d.against));
        }
        if (d.toTest.trim()) {
          blank();
          sub(t("memoDraftedToTest"));
          para(rule(d.toTest));
        }
      }
      const gHref = guide(input.siteUrl, `/learn/grounds/${g.id}`);
      if (gHref) {
        blank();
        link(t("memoReadMore"), gHref);
      }
      // Their own words on this point, if they wrote any. Verbatim and unlabelled as
      // evidence — the reader of this memo decides what it is worth, not us.
      const note = (groundNotes[g.id] ?? "").trim().replace(/\s+/g, " ");
      if (note) {
        blank();
        quote(note, t("memoYourNote"));
      }
      if (g.whatItIsNot) {
        blank();
        para(`${t("memoCounter")}:`);
        para(rule(g.whatItIsNot), "  ");
      }
      // WHERE THAT LEAVES IT. The reference memos close every issue, and this is the one
      // place the register had to change rather than be copied. Theirs closes with
      // "prospects of success are high"; ours may not, and not only because a gate forbids
      // it — we are not advising a client, we are handing someone their own matter.
      //
      // So the close says what is true and checkable: whether they have written on this
      // point, that the questions above are its parts, and that a gap is a question nobody
      // has asked them yet rather than a weakness. It names no strength and no outcome.
      blank();
      sub(t("memoConclusion"));
      para(note ? t("memoGroundWritten") : t("memoGroundBlank"), "  ");
      para(t("memoOpenNote"), "  ");
    });
    blank();
    para(t("memoNoWeight"));
  }

  // ---- The privative clause, where the scheme records one --------------------------
  //
  // The reference memo keeps this to the end as a discrete question, and so does this. We
  // state only that the scheme has such a clause and that it makes early advice matter
  // more. We do not construe it: what a privative clause can actually do is the hardest
  // question in the subject, and the one place where a confident sentence from us would do
  // the most damage.
  if (entry.privativeClause) {
    h(t("memoPrivative"));
    para(t("memoPrivativeQ"));
    sub(t("memoApplication"));
    para(t("memoPrivativeYes"), "  ");
    if (input.justiciability?.whatItMeans) {
      sub(t("memoRule"));
      para(rule(input.justiciability.whatItMeans), "  ");
    }
  }

  // ---- Every path that is open -----------------------------------------------------
  //
  // The memo works through ONE approach — the one the person chose. A lawyer reading it
  // needs to know what else was available, and whether the choice closed anything off.
  // Names and bodies only: what each decides is set out above for the chosen path, and
  // asserting it for the others would repeat the whole analysis three times.
  const otherPaths = (input.paths ?? []).filter((pp) => !pp.chosen);
  if (input.paths && input.paths.length > 1 && otherPaths.length > 0) {
    h(t("memoPathsTitle"));
    para(t("memoPathsLead"));
    for (const pp of otherPaths) {
      item(`${pp.name}: ${pp.body}${pp.conditional ? ` — ${t("memoPathsConditional")}` : ""}`);
    }
    // And the rung that is NOT open, said once. A reader holding the internal-review /
    // merits-review / judicial-review ladder — a duty lawyer as much as anyone — sees a court
    // hearing in the middle of a fine's list and reads it as a mislabelled merits review. The
    // owner did exactly that on the live page. vic-fines is signed with mr.available false.
    if (!entry.avenue.mr.available) para(t("memoMeritsNotOpen"));
  }

  // ---- Close -----------------------------------------------------------------------
  h(t("memoNext"));
  para(t("memoNextBody"));

  // ---- Free help, always ---------------------------------------------------------------
  // The same list the short analysis ends with. These notes are what a person gets when the
  // short analysis could not be written — exactly when a service to call matters most — and
  // they named none, on screen or in the download.
  h(t("briefHelp"));
  for (const s of entry.getHelp.slice(0, 3)) {
    L.push(`  - ${[s.service, s.phone, s.link].filter(Boolean).join(" — ")}`);
    B.push({ kind: "contact", service: s.service, href: s.link, ...(s.phone ? { phone: s.phone } : {}) });
  }

  // ---- Where this came from --------------------------------------------------------
  // Added 2026-08-23 after external legal review. The memo stamped the day it was prepared
  // but never said what it was built from, so a lawyer reading it could not tell which
  // source was used or how old the check was — and neither could we, if someone brought a
  // printout back months later. The source URL and the check date are the entry's own; the
  // version is a build fingerprint, so a memo can always be tied back to the exact content
  // that produced it. Nothing here is about the person.
  h(t("memoSourceTitle"));
  const official = officialSourceForPath(entry, pathId);
  if (official) link(t("memoSourceOfficial"), official);
  meta(t("memoSourceChecked"), entry.verifiedAsAt);
  if (corpusVersion) meta(t("memoSourceVersion"), corpusVersion);

  blank();
  disclaimer(t("memoNotAdvice"));

  return { title, body: L.join("\n"), blocks: B };
}