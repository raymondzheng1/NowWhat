import type { Ground, Process } from "@/lib/schemas/legal";
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
  process: Process;
  /** Grounds the person marked as possibly relating to them, in corpus order. */
  grounds: Ground[];
  /** What they wrote about what happened. Quoted verbatim or omitted. */
  story: string;
  /** What they said they are hoping for, already rendered to plain labels. */
  goals: string[];
  /** Anything they added in their own words on the goal step. */
  goalOther: string;
  decisionDate?: string;
  /** The forum name for this decision, from the lawyer-verified data layer. */
  forum: string;
  /** Section headings, so all customer prose stays in the i18n layer. */
  t: (key: string) => string;
}

export interface Memo {
  title: string;
  body: string;
}

const rule = (s: string) => s.replace(/\s+/g, " ").trim();

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
  const { entry, process: proc, grounds, story, goals, goalOther, decisionDate, forum, t } = input;
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

  const title = `${t("memoTitle")} — ${entry.title}`;
  L.push(title);
  L.push("");
  L.push(`${t("memoAbout")}: ${entry.title}`);
  if (decisionDate) L.push(`${t("memoDecisionDate")}: ${decisionDate}`);
  L.push(`${t("memoPath")}: ${proc.plainName} (${forum})`);
  L.push(`${t("memoPrepared")}: ${new Date().toISOString().slice(0, 10)}`);
  L.push("");
  L.push(t("memoNotAdvice"));

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

  // ---- Issue 1: can you apply? -----------------------------------------------------
  h(t("memoIssue1"));
  L.push(t("memoIssue1Q"));
  sub(t("memoRule"));
  for (const c of proc.canApply) L.push(`  - ${rule(c)}`);
  sub(t("memoApplication"));
  L.push(`  ${t("memoForumIs")} ${forum}.`);
  if (entry.deadlineRule) L.push(`  ${rule(entry.deadlineRule)}`);
  L.push(`  ${t("memoTimeCheck")}`);

  // ---- Issue 2: what the forum decides ---------------------------------------------
  h(t("memoIssue2"));
  L.push(`${t("memoQuestionAsked")}: "${proc.question}"`);
  if (entry.mrCriteria.length && proc.id === "merits-review") {
    sub(t("memoRule"));
    for (const c of entry.mrCriteria) L.push(`  - ${rule(c)}`);
  }
  sub(t("memoWhatItCanDo"));
  for (const r of proc.remedies) L.push(`  - ${rule(r)}`);
  if (proc.limits.length) {
    sub(t("memoWhatItCannotDo"));
    for (const r of proc.limits) L.push(`  - ${rule(r)}`);
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
      if (g.whatItIsNot) {
        L.push("");
        L.push(`${t("memoCounter")}:`);
        L.push(`  ${rule(g.whatItIsNot)}`);
      }
    });
  }

  // ---- Close -----------------------------------------------------------------------
  h(t("memoNext"));
  L.push(t("memoNextBody"));
  L.push("");
  L.push(t("memoNotAdvice"));

  return { title, body: L.join("\n") };
}
