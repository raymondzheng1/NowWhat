import type { DataPathway } from "@/lib/schemas/data";
import { todayLocal } from "@/lib/time/clock";
import { ruleForPath, officialSourceForPath, type RulePath } from "@/lib/deadline/rule";
import type { Ground } from "@/lib/schemas/legal";
import type { Memo, MemoBlock } from "@/lib/memo/compose";
import { answerableCriteria, withCriterionIds } from "@/lib/memo/criteria";

/**
 * The short analysis, as a document.
 *
 * The owner's call, 2026-10-31: the long memo reads as verbatim, and verbatim is not the value.
 * This is what a person reads first — what matters in THEIR matter, briefly — and the long memo
 * stays, folded under it, as the full notes for a lawyer.
 *
 * The split of who writes what is the whole safety design, and it is the same split the long
 * memo had, drawn tighter:
 *
 *   · OURS, deterministic: the header, THE TIME LIMIT (the entry's verified rule, verbatim, with
 *     its source and check date), the heading over every point (the corpus's own words for that
 *     part of a test or that criterion), the free services, the sources and the disclaimer.
 *   · THE MODEL'S, gated: what happened, the path in a sentence, which of their facts relate to
 *     each point and what is still needed, what the other side will say, what would help.
 *
 * So the model never states a test, never states a time limit, and never names a source we do
 * not list. A point whose id we did not supply has no heading to sit under and is dropped.
 */

export interface BriefDraft {
  situation: string;
  path: string;
  points: { ref: string; relates: string; needed: string }[];
  otherSide: string;
  toGather: string[];
  sources: string[];
}

export interface BriefInput {
  /** Null while the brief is being written: the frame — header, time limit, help — still shows. */
  brief: BriefDraft | null;
  entry: DataPathway;
  /** From `memoPathName`, so this and the full notes name the path the same way. */
  pathName: string;
  forum: string;
  decisionDate?: string;
  /** The grounds the person marked (judicial review only); their parts are points too. */
  grounds: Ground[];
  /** The criteria for the chosen path, as handed to the model. */
  criteria: string[];
  /** The path being worked through: picks the part of the time rule, and the official link. */
  pathId?: RulePath;
  t: (key: string) => string;
}

/** At most this many points. The model is asked for four; a fifth is not a reason to fail. */
const MAX_POINTS = 4;
const MAX_GATHER = 4;

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** The corpus's own provenance line for synthesised entries — the same match legal-check uses. */
const KB_PROVENANCE = /owner'?s administrative-law knowledge base/i;

/**
 * The corpus's words for each id the model may cite.
 *
 * Criterion ids come from the criteria's own text (`withCriterionIds`), exactly as the context
 * printed them. Parts of a ground are accepted as `groundId/partId` — the form the prompt asks
 * for — and also as the bare part id where that is unique among the marked grounds, because a
 * model that drops the prefix has still told us plainly which part it meant.
 */
function labelsFor(input: Pick<BriefInput, "entry" | "criteria" | "grounds">): (ref: string) => string | null {
  const exact = new Map<string, string>();
  for (const c of withCriterionIds(answerableCriteria(input.entry, input.criteria))) exact.set(c.id, c.text);
  const bare = new Map<string, string | null>();
  for (const g of input.grounds) {
    exact.set(g.id, `${g.name}: ${g.plainName}`);
    for (const el of g.elements) {
      const label = `${g.name}: ${el.name}`;
      exact.set(`${g.id}/${el.id}`, label);
      bare.set(el.id, bare.has(el.id) ? null : label);
    }
  }
  return (ref) => {
    const r = ref.trim();
    return exact.get(r) ?? bare.get(r) ?? null;
  };
}

export function composeBrief(input: BriefInput): Memo {
  const { brief, entry, pathName, forum, decisionDate, t } = input;
  const L: string[] = [];
  const B: MemoBlock[] = [];

  const h = (x: string) => {
    L.push("", x.toUpperCase(), "=".repeat(Math.min(x.length, 64)));
    B.push({ kind: "heading", text: x });
  };
  const para = (x: string) => {
    L.push(x);
    B.push({ kind: "para", text: x });
  };
  const meta = (label: string, value: string) => {
    L.push(`${label}: ${value}`);
    B.push({ kind: "meta", label, value });
  };
  const item = (x: string) => {
    L.push(`  - ${x}`);
    B.push({ kind: "item", text: x });
  };
  const note = (label: string, text: string) => {
    L.push(`      ${label}: ${text}`);
    B.push({ kind: "note", label, text });
  };
  const link = (label: string, href: string) => {
    L.push(`${label}: ${href}`);
    B.push({ kind: "link", text: label, href });
  };

  // ---- Header: what this is about ------------------------------------------------------
  meta(t("memoAbout"), entry.title);
  if (decisionDate) meta(t("memoDecisionDate"), decisionDate);
  meta(t("memoPath"), forum ? `${pathName} (${forum})` : pathName);
  meta(t("memoPrepared"), todayLocal());

  // ---- The time limit, before anything the model wrote ----------------------------------
  // First, and never from the model. It is the one thing a person can lose everything by
  // missing, so it does not wait on a model call and it is never paraphrased: the entry's own
  // verified rule, verbatim, with the date we last checked it.
  h(t("briefTimeLimit"));
  if (entry.deadlineRule) para(clean(ruleForPath(entry.deadlineRule, input.pathId)));
  para(t("memoTimeCheck"));
  meta(t("memoSourceChecked"), entry.verifiedAsAt);

  if (brief) {
    if (clean(brief.situation)) {
      h(t("briefSituation"));
      para(clean(brief.situation));
    }
    if (clean(brief.path)) {
      h(t("briefPath"));
      para(clean(brief.path));
    }

    // Each point under the CORPUS's words for it. An id we never supplied has no heading to
    // sit under, and is dropped rather than printed under a heading the model chose.
    const label = labelsFor(input);
    const seen = new Set<string>();
    const points: { heading: string; relates: string; needed: string }[] = [];
    for (const p of brief.points) {
      const heading = label(p.ref);
      if (!heading || seen.has(heading)) continue;
      const relates = clean(p.relates);
      const needed = clean(p.needed);
      if (!relates && !needed) continue;
      seen.add(heading);
      points.push({ heading, relates, needed });
      if (points.length === MAX_POINTS) break;
    }
    if (points.length) {
      h(t("briefPoints"));
      for (const p of points) {
        item(p.heading);
        if (p.relates) note(t("briefRelates"), p.relates);
        if (p.needed) note(t("briefNeeded"), p.needed);
      }
    }

    if (clean(brief.otherSide)) {
      h(t("briefOtherSide"));
      para(clean(brief.otherSide));
    }

    const gather = brief.toGather.map(clean).filter(Boolean).slice(0, MAX_GATHER);
    if (gather.length) {
      h(t("briefGather"));
      for (const g of gather) item(g);
    }
  }

  // ---- Free help, always ---------------------------------------------------------------
  h(t("briefHelp"));
  for (const s of entry.getHelp.slice(0, 3)) {
    // The copy and the download keep the link too: on paper it is the only way to find them.
    L.push(`  - ${[s.service, s.phone, s.link].filter(Boolean).join(" — ")}`);
    B.push({ kind: "contact", service: s.service, href: s.link, ...(s.phone ? { phone: s.phone } : {}) });
  }

  if (brief) {
    // ---- Sources: the ones it relied on (already through the allow-list), then ours ------
    h(t("memoSourceTitle"));
    const listed = new Set<string>();
    for (const s of brief.sources.map(clean).filter(Boolean)) {
      // Internal provenance, not a source a member of the public can look up. The corpus cites
      // the owner's knowledge base for the entries it synthesises, and the verifier rightly
      // allows it — but printed under "Sources" it reads as a reference to something private.
      if (KB_PROVENANCE.test(s)) continue;
      if (listed.has(s)) continue;
      listed.add(s);
      item(s);
    }
    const official = officialSourceForPath(entry, input.pathId);
    if (official) link(t("memoSourceOfficial"), official);

    L.push("");
    L.push(t("memoNotAdvice"));
    B.push({ kind: "disclaimer", text: t("memoNotAdvice") });
  }

  return { title: entry.title, body: L.join("\n").trim(), blocks: B };
}
