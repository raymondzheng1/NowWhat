import type { Concept, Ground, Process } from "@/lib/schemas/legal";
import type { DataPathway } from "@/lib/schemas/data";

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
  character?: "tribunal" | "internal" | "mixed" | "court";
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
  paths?: { name: string; body: string; question: string; conditional: boolean }[];
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
  /** Section headings, so all customer prose stays in the i18n layer. */
  t: (key: string) => string;
}

export interface Memo {
  title: string;
  body: string;
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
    t,
  } = input;
  const L: string[] = [];
  const h = (s: string) => {
    L.push("");
    L.push(s.toUpperCase());
    L.push("=".repeat(Math.min(s.length, 64)));
  };
  const sub = (s: string) => {
    L.push("");
    L.push(s);
    L.push("-".repeat(Math.min(s.length, 64)));
  };

  // The name of the path, from whichever entry describes it. One of the two must be
  // present; the caller decides which, from the approach the person chose.
  const pathName = proc?.plainName ?? internal?.plainName ?? t("pathTitleInternal");

  const title = `${t("memoTitle")} — ${entry.title}`;
  L.push(title);
  L.push("");
  L.push(`${t("memoAbout")}: ${entry.title}`);
  if (decisionDate) L.push(`${t("memoDecisionDate")}: ${decisionDate}`);
  L.push(`${t("memoPath")}: ${pathName} (${forum})`);
  {
    const pHref = input.pathHref ? guide(input.siteUrl, input.pathHref) : "";
    if (pHref) L.push(`${t("memoReadMore")}: ${pHref}`);
  }
  L.push(`${t("memoPrepared")}: ${new Date().toISOString().slice(0, 10)}`);
  L.push("");
  L.push(t("memoNotAdvice"));

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
    bits.push(
      decisionDate
        ? `${t("memoSummaryAbout")} ${entry.title.toLowerCase()}, ${t("memoSummaryDated")} ${decisionDate}.`
        : `${t("memoSummaryAbout")} ${entry.title.toLowerCase()}.`,
    );
    if (goals.length || goalOther.trim()) {
      const said = [...goals, ...(goalOther.trim() ? [goalOther.trim()] : [])]
        .map((g) => g.toLowerCase().replace(/\s+/g, " "))
        .join("; ");
      bits.push(`${t("memoSummaryWants")} ${said}.`);
    }
    bits.push(`${t("memoSummaryPath")} ${pathName.toLowerCase()}, ${t("memoSummaryAt")} ${forum}.`);
    if (grounds.length) {
      bits.push(
        grounds.length === 1
          ? t("memoSummaryOnePoint")
          : t("memoSummaryPoints").replace("{n}", String(grounds.length)),
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
    for (const b of bits) L.push(b);
  }

  // ---- What they told us ----------------------------------------------------------
  const q = quoted(story);
  if (q.length || goals.length || goalOther.trim()) {
    h(t("memoWhatYouTold"));
    if (goals.length) {
      L.push(`${t("memoYouWant")}:`);
      for (const g of goals) L.push(`  - ${g}`);
    }
    if (goalOther.trim()) {
      L.push("");
      L.push(`  "${goalOther.trim().replace(/\s+/g, " ")}"`);
    }
    if (q.length) {
      L.push("");
      L.push(`${t("memoYourAccount")}:`);
      L.push(...q);
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
    L.push(t("memoIssue1QInternal"));
    sub(t("memoRule"));
    for (const k of internal.keyPoints) L.push(`  - ${rule(k)}`);
    sub(t("memoApplication"));
    L.push(`  ${t("memoInternalBodyIs")} ${forum}.`);
    if (entry.deadlineRule) L.push(`  ${rule(entry.deadlineRule)}`);
    L.push(`  ${t("memoTimeCheck")}`);

    h(t("memoIssue2Internal"));
    L.push(rule(internal.whatItMeans));
    // What the lawyer supplied for THIS scheme, where they supplied it. For a Victorian fine
    // that is the statutory review grounds the issuing agency applies — the part a duty
    // lawyer most needs, and the part that was sitting under the Magistrates' Court card
    // until the criteria were split to follow the avenue.
    if (input.criteria && input.criteria.length) {
      sub(t("memoRule"));
      for (const c of input.criteria) {
        L.push(`  - ${rule(c)}`);
        const n = (criteriaNotes[c] ?? "").trim().replace(/\s+/g, " ");
        if (n) {
          L.push(`      ${t("memoYourNote")}:`);
          L.push(`        "${n}"`);
        }
      }
    }
    if (internal.whatItIsNot) {
      sub(t("memoWhatItIsNot"));
      L.push(`  ${rule(internal.whatItIsNot)}`);
    }

    const askedFor = internalNote.trim().replace(/\s+/g, " ");
    if (askedFor) {
      h(t("memoIssue3Internal"));
      L.push(`${t("memoYourNote")}:`);
      L.push(`  "${askedFor}"`);
    }
  }

  // ---- Issue 1: can you apply? -----------------------------------------------------
  if (proc) {
  h(t("memoIssue1"));
  L.push(t("memoIssue1Q"));
  sub(t("memoRule"));
  for (const c of proc.canApply) L.push(`  - ${rule(c)}`);
  sub(t("memoApplication"));
  L.push(`  ${t("memoForumIs")} ${forum}.`);
  if (entry.deadlineRule) L.push(`  ${rule(entry.deadlineRule)}`);
  L.push(`  ${t("memoTimeCheck")}`);

  // ---- Issue 2: what the forum decides ---------------------------------------------
  //
  // A body that is not a tribunal does not get the tribunal's question, remedies or limits —
  // the same rule `planFor` applies to the card. Judicial review is never affected: it is a
  // court path carrying the court process's own question and remedies, not borrowed ones.
  const isTribunal = proc.id === "judicial-review" || character === "tribunal";
  h(t("memoIssue2"));
  if (isTribunal) L.push(`${t("memoQuestionAsked")}: "${proc.question}"`);
  else L.push(t("memoNotATribunal"));
  const criteriaList = input.criteria ?? (proc.id === "merits-review" ? entry.mrCriteria : []);
  if (criteriaList.length) {
    sub(t("memoRule"));
    for (const c of criteriaList) {
      L.push(`  - ${rule(c)}`);
      // Their own words against this criterion, verbatim and uncharacterised, exactly as
      // the ground notes are handled.
      const n = (criteriaNotes[c] ?? "").trim().replace(/\s+/g, " ");
      if (n) {
        L.push(`      ${t("memoYourNote")}:`);
        L.push(`        "${n}"`);
      }
    }
  }
  if (isTribunal) {
    sub(t("memoWhatItCanDo"));
    for (const r of proc.remedies) L.push(`  - ${rule(r)}`);
    if (proc.limits.length) {
      sub(t("memoWhatItCannotDo"));
      for (const r of proc.limits) L.push(`  - ${rule(r)}`);
    }
  }
  }

  // ---- Issue 3: the points raised, each argued both ways ---------------------------
  if (grounds.length) {
    h(t("memoIssue3"));
    L.push(t("memoGroundsLead"));
    grounds.forEach((g, i) => {
      sub(`${i + 1}. ${g.name}: ${g.plainName}`);
      L.push(`${t("memoIssue")}: ${rule(g.oneLine)}`);
      L.push("");
      L.push(`${t("memoRule")}: ${rule(g.test)}`);
      if (g.leadingCases.length) {
        L.push("");
        L.push(`${t("memoWhereFrom")}:`);
        for (const c of g.leadingCases) {
          L.push(`  - ${c.name}${c.pinpoint ? ` (${c.pinpoint})` : ""}`);
          if (c.explains) L.push(`      ${rule(c.explains)}`);
        }
      }
      L.push("");
      L.push(`${t("memoArgument")}:`);
      for (const w of g.whatRelates) L.push(`  - ${rule(w)}`);
      L.push(`  ${t("memoArgumentNote")}`);
      const gHref = guide(input.siteUrl, `/learn/grounds/${g.id}`);
      if (gHref) {
        L.push("");
        L.push(`${t("memoReadMore")}: ${gHref}`);
      }
      // Their own words on this point, if they wrote any. Verbatim and unlabelled as
      // evidence — the reader of this memo decides what it is worth, not us.
      const note = (groundNotes[g.id] ?? "").trim().replace(/\s+/g, " ");
      if (note) {
        L.push("");
        L.push(`${t("memoYourNote")}:`);
        L.push(`  "${note}"`);
      }
      if (g.whatItIsNot) {
        L.push("");
        L.push(`${t("memoCounter")}:`);
        L.push(`  ${rule(g.whatItIsNot)}`);
      }
    });
  }

  // ---- Every path that is open -----------------------------------------------------
  //
  // The memo works through ONE approach — the one the person chose. A lawyer reading it
  // needs to know what else was available, and whether the choice closed anything off.
  // Names and bodies only: what each decides is set out above for the chosen path, and
  // asserting it for the others would repeat the whole analysis three times.
  if (input.paths && input.paths.length > 1) {
    h(t("memoPathsTitle"));
    L.push(t("memoPathsLead"));
    for (const pp of input.paths) {
      L.push(`  - ${pp.name}: ${pp.body}${pp.conditional ? ` — ${t("memoPathsConditional")}` : ""}`);
    }
  }

  // ---- Close -----------------------------------------------------------------------
  h(t("memoNext"));
  L.push(t("memoNextBody"));

  // ---- Where this came from --------------------------------------------------------
  // Added 2026-08-23 after external legal review. The memo stamped the day it was prepared
  // but never said what it was built from, so a lawyer reading it could not tell which
  // source was used or how old the check was — and neither could we, if someone brought a
  // printout back months later. The source URL and the check date are the entry's own; the
  // version is a build fingerprint, so a memo can always be tied back to the exact content
  // that produced it. Nothing here is about the person.
  h(t("memoSourceTitle"));
  L.push(`${t("memoSourceOfficial")}: ${entry.sourceUrl}`);
  L.push(`${t("memoSourceChecked")}: ${entry.verifiedAsAt}`);
  if (corpusVersion) L.push(`${t("memoSourceVersion")}: ${corpusVersion}`);

  L.push("");
  L.push(t("memoNotAdvice"));

  return { title, body: L.join("\n") };
}
