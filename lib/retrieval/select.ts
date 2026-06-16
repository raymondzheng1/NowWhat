import { getCorpus, classify } from "@/lib/corpus/index";
import type { PathwayEntry } from "@/lib/schemas/corpus";

/**
 * Keyword retrieval over the corpus (TECHNICAL_SPEC §7; DB-free, BM25-lite).
 * Picks the best-matching entry for a free-text question. Returns null below a
 * confidence floor so the Ask flow routes to "not covered → get help" rather than
 * grounding an answer in an unrelated entry.
 */

const STOPWORDS = new Set(
  "a an the and or but if then is are was were be been i you he she it we they my your our this that these those of to in on for with about from at by as can do does did have has had will would should could my me what when how why who which not no".split(
    " ",
  ),
);

function terms(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function entryText(e: PathwayEntry): string {
  return [
    e.title,
    ...e.decisionTypes,
    ...e.issuers,
    ...e.keywords,
    e.plainLanguageExplainer,
    e.reviewable.basis,
    ...e.groundsOrCriteria,
    ...e.pathways.map((p) => `${p.name} ${p.body}`),
  ].join(" ");
}

export interface Retrieved {
  entry: PathwayEntry;
  score: number;
  isFallback: boolean;
}

const MIN_SCORE = 2;

export function retrieveForAsk(question: string): Retrieved | null {
  const qTerms = terms(question);
  if (qTerms.length === 0) return null;

  // Document frequency for a light IDF weighting.
  const corpus = getCorpus();
  const docs = corpus.entries.map((e) => ({ e, terms: terms(entryText(e)) }));
  const df = new Map<string, number>();
  for (const d of docs) {
    for (const t of new Set(d.terms)) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const N = docs.length || 1;

  let best: Retrieved | null = null;
  for (const d of docs) {
    const tf = new Map<string, number>();
    for (const t of d.terms) tf.set(t, (tf.get(t) ?? 0) + 1);
    let score = 0;
    for (const qt of qTerms) {
      const f = tf.get(qt);
      if (f) {
        const idf = Math.log(1 + N / (df.get(qt) ?? 1));
        score += (1 + Math.log(f)) * idf;
      }
    }
    if (!best || score > best.score) best = { entry: d.e, score, isFallback: false };
  }

  // Reinforce with the classifier (issuer/decision-type hits are strong signals).
  const c = classify(question);
  if (c && best && c.entryId === best.entry.id) best.score += c.score;

  if (!best || best.score < MIN_SCORE) return null;
  return best;
}

/**
 * Build the grounded context block fed to the generator. ONLY corpus content — this
 * is the allow-list of facts the model may use (grounded-or-silent).
 */
export function buildContext(entry: PathwayEntry): string {
  const lines: string[] = [];
  lines.push(`ENTRY: ${entry.title} (id: ${entry.id}, jurisdiction: ${entry.jurisdiction})`);
  lines.push(`EXPLAINER: ${entry.plainLanguageExplainer}`);
  lines.push(`REVIEWABLE: ${entry.reviewable.value} — ${entry.reviewable.basis}`);
  lines.push(
    `RIGHT TO REASONS: ${entry.rightToReasons.available} — ${entry.rightToReasons.how} (provision: ${entry.rightToReasons.provision}; source: ${entry.rightToReasons.source})`,
  );
  for (const p of entry.pathways) {
    lines.push(
      `PATHWAY: ${p.name} — body: ${p.body}; deadline: ${p.deadline}; how to start: ${p.howToStart}; source: ${p.source}`,
    );
  }
  if (entry.groundsOrCriteria.length)
    lines.push(`GROUNDS/CRITERIA: ${entry.groundsOrCriteria.join("; ")}`);
  if (entry.evidenceChecklist.length)
    lines.push(`EVIDENCE: ${entry.evidenceChecklist.join("; ")}`);
  lines.push(`GET HELP: ${entry.getHelp.map((h) => `${h.service} (${h.who})`).join("; ")}`);
  lines.push(`SOURCES: ${entry.sources.join("; ")}`);
  return lines.join("\n");
}
