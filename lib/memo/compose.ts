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
    application?: { groundId: string; forThem: string; against: string; toTest: string }[];
  } | null;
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
  | { kind: "quote"; text: string; label?: string }
  | { kind: "link"; text: string; href: string }
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
  const pathName = proc?.plainName ?? internal?.plainName ?? t("pathTitleInternal");

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
  meta(t("memoPrepared"), new Date().toISOString().slice(0, 10));
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
    para(`${t("memoInternalBodyIs")} ${forum}.`, "  ");
    if (entry.deadlineRule) para(rule(entry.deadlineRule), "  ");
    para(t("memoTimeCheck"), "  ");

    h(t("memoIssue2Internal"));
    para(rule(internal.whatItMeans));
    // What the lawyer supplied for THIS scheme, where they supplied it. For a Victorian fine
    // that is the statutory review grounds the issuing agency applies — the part a duty
    // lawyer most needs, and the part that was sitting under the Magistrates' Court card
    // until the criteria were split to follow the avenue.
    if (input.criteria && input.criteria.length) {
      sub(t("memoRule"));
      for (const c of input.criteria) {
        item(rule(c));
        const n = (criteriaNotes[c] ?? "").trim().replace(/\s+/g, " ");
        if (n) quote(n, t("memoYourNote"), "        ");
      }
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
  for (const c of proc.canApply) item(rule(c));
  sub(t("memoApplication"));
  para(`${t("memoForumIs")} ${forum}.`, "  ");
  if (entry.deadlineRule) para(rule(entry.deadlineRule), "  ");
  para(t("memoTimeCheck"), "  ");

  // ---- Issue 2: what the forum decides ---------------------------------------------
  //
  // A body that is not a tribunal does not get the tribunal's question, remedies or limits —
  // the same rule `planFor` applies to the card. Judicial review is never affected: it is a
  // court path carrying the court process's own question and remedies, not borrowed ones.
  const isTribunal = proc.id === "judicial-review" || character === "tribunal";
  h(t("memoIssue2"));
  if (isTribunal) para(`${t("memoQuestionAsked")}: "${proc.question}"`);
  else para(t("memoNotATribunal"));
  const criteriaList = input.criteria ?? (proc.id === "merits-review" ? entry.mrCriteria : []);
  if (criteriaList.length) {
    sub(t("memoRule"));
    for (const c of criteriaList) {
      item(rule(c));
      // Their own words against this criterion, verbatim and uncharacterised, exactly as
      // the ground notes are handled.
      const n = (criteriaNotes[c] ?? "").trim().replace(/\s+/g, " ");
      if (n) quote(n, t("memoYourNote"), "        ");
    }
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
      blank();
      para(`${t("memoArgument")}:`);
      for (const w of g.whatRelates) item(rule(w));
      para(t("memoArgumentNote"), "  ");
      // What their account has to do with THIS test, and the answer they will get back.
      // The generic list above stays: it is what the corpus says relates to the ground in
      // general, and it is true whether or not a draft arrived.
      const d = input.drafted?.application?.find((a) => a.groundId === g.id);
      if (d) {
        if (d.forThem.trim()) {
          blank();
          sub(t("memoDraftedForThem"));
          para(rule(d.forThem));
        }
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
    para(t("memoPathsLead"));
    for (const pp of input.paths) {
      item(`${pp.name}: ${pp.body}${pp.conditional ? ` — ${t("memoPathsConditional")}` : ""}`);
    }
  }

  // ---- Close -----------------------------------------------------------------------
  h(t("memoNext"));
  para(t("memoNextBody"));

  // ---- Where this came from --------------------------------------------------------
  // Added 2026-08-23 after external legal review. The memo stamped the day it was prepared
  // but never said what it was built from, so a lawyer reading it could not tell which
  // source was used or how old the check was — and neither could we, if someone brought a
  // printout back months later. The source URL and the check date are the entry's own; the
  // version is a build fingerprint, so a memo can always be tied back to the exact content
  // that produced it. Nothing here is about the person.
  h(t("memoSourceTitle"));
  link(t("memoSourceOfficial"), entry.sourceUrl);
  meta(t("memoSourceChecked"), entry.verifiedAsAt);
  if (corpusVersion) meta(t("memoSourceVersion"), corpusVersion);

  blank();
  disclaimer(t("memoNotAdvice"));

  return { title, body: L.join("\n"), blocks: B };
}