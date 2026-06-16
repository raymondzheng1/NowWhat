import patterns from "@/lib/safety/no-advice-patterns.json";

/**
 * Runtime no-advice / no-prediction / no-AI-mention gates (PRD §11, harness §11.2).
 * Reads the SAME pattern file as scripts/no-advice-check.mjs (single source of truth).
 * The no-advice gate is applied to every model output before it can reach a user.
 */

export interface PhraseHit {
  match: string;
  why: string;
}
export interface GateResult {
  ok: boolean;
  hits: PhraseHit[];
}

function run(text: string, group: { pattern: string; why: string }[]): GateResult {
  const hits: PhraseHit[] = [];
  for (const r of group) {
    const m = new RegExp(r.pattern, "i").exec(text);
    if (m) hits.push({ match: m[0], why: r.why });
  }
  return { ok: hits.length === 0, hits };
}

/** Bans first-person advice AND outcome prediction (the tone gate). */
export function checkNoAdvice(text: string): GateResult {
  return run(text, [...patterns.advice, ...patterns.prediction]);
}

export function checkNoAiMentions(text: string): GateResult {
  return run(text, patterns.aiMentions);
}
