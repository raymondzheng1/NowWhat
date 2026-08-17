import { z } from "zod";
import {
  checkOwnWords,
  checkQuoteAnchored,
  checkHedgePreserved,
  checkNoLegalConclusion,
  checkNoTimeLimitClaim,
  checkNoCaseCitation,
  sensitiveFlags,
} from "@/lib/verification/own-words";
import { LETTER_GROUND_HEADINGS, LAWYER_NOTE_ONLY } from "@/lib/letter/compose";

/** What the model returns: per marked point, quoted runs of the person's own text. */
export const LetterSelectionSchema = z.object({
  points: z
    .array(
      z.object({
        groundId: z.string(),
        items: z
          .array(
            z.object({
              quote: z.string().default(""),
              sentences: z.array(z.string()).default([]),
            }),
          )
          .default([]),
      }),
    )
    .default([]),
});
export type LetterSelection = z.infer<typeof LetterSelectionSchema>;

/** A sentence the person will tick before it can enter the letter. */
export interface CheckedSentence {
  text: string;
  /** Why it may deserve a second look before being sent to the deciding agency. */
  sensitive: string[];
}

export interface CheckedPoint {
  groundId: string;
  sentences: CheckedSentence[];
}

export interface ScreenResult {
  points: CheckedPoint[];
  /** Gate names that caused at least one item to be dropped. Never any of the person's text. */
  droppedGates: string[];
}

/**
 * Screens the model's selection, point by point, against that point's OWN quote.
 *
 * Two rules do the work. First, a failing item is DROPPED, never repaired: repair is where a
 * model talks itself past a gate, and a person is better off with one true sentence than
 * three tidy ones they cannot defend. Second, every check is scoped to the item's own quote,
 * so a date from the top of the account cannot attach to an event at the bottom, and pasting
 * the decision letter cannot widen what may be said about anything else.
 *
 * `droppedGates` carries gate NAMES only. A rejected word is usually a near-miss on a real
 * one — a mangled surname, a misspelled agency — and that is the person's own data; it must
 * never travel back into a prompt or out through an API response.
 */
export function screenSelection(
  selection: LetterSelection,
  account: string,
  markedGroundIds: string[],
): ScreenResult {
  const eligible = new Set(
    markedGroundIds.filter((id) => LETTER_GROUND_HEADINGS[id] && !LAWYER_NOTE_ONLY.has(id)),
  );
  const dropped = new Set<string>();
  const points: CheckedPoint[] = [];

  for (const p of selection.points) {
    // The model may only speak to points the person actually marked, and only to those that
    // earned a heading. Anything else is the model choosing a legal point on their behalf.
    if (!eligible.has(p.groundId)) {
      dropped.add("not-marked");
      continue;
    }

    const kept: CheckedSentence[] = [];
    for (const item of p.items) {
      const quote = (item.quote ?? "").trim();
      const sentences = (item.sentences ?? []).map((s) => s.trim()).filter(Boolean);
      if (!quote || sentences.length === 0) continue;

      if (!checkQuoteAnchored(quote, account)) {
        dropped.add("quote-anchored");
        continue;
      }
      if (!checkHedgePreserved(sentences, quote)) {
        dropped.add("hedge-preservation");
        continue;
      }
      const legal = checkNoLegalConclusion(sentences);
      if (!legal.ok) {
        dropped.add("no-legal-conclusion");
        continue;
      }
      if (!checkNoTimeLimitClaim(sentences)) {
        dropped.add("no-time-limit-claim");
        continue;
      }
      if (!checkNoCaseCitation(sentences)) {
        dropped.add("no-case-citation");
        continue;
      }

      // Per SENTENCE, so one bad line does not cost the person the good ones beside it.
      for (const text of sentences) {
        if (!checkOwnWords(text, quote).ok) {
          dropped.add("own-words");
          continue;
        }
        if (text.split(/\s+/).length > 20) {
          dropped.add("too-long");
          continue;
        }
        kept.push({ text, sensitive: sensitiveFlags(text) });
      }
    }
    if (kept.length > 0) points.push({ groundId: p.groundId, sentences: kept });
  }

  return { points, droppedGates: [...dropped] };
}

/** Fixed remediation text per gate. Never derived from the person's words. */
export function retryHintFor(gates: string[]): string {
  const hints: Record<string, string> = {
    "own-words": "every word must appear inside that point's own quote",
    "quote-anchored": "each quote must be one continuous run copied exactly from their account",
    "hedge-preservation": "keep every 'I think', 'maybe' and 'around' that the quote contains",
    "no-legal-conclusion": "write what happened, never what it means or what anyone should have done",
    "no-time-limit-claim": "never state an entitlement to a number of days",
    "no-case-citation": "never name a court case",
    "too-long": "split long sentences; never compress them",
    "not-marked": "only return points the person marked",
  };
  return gates.map((g) => hints[g] ?? g).join("; ");
}
