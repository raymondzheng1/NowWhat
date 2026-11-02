import { numberWordsToDigits } from "@/lib/text/numbers";
import { z } from "zod";
import { checkQuoteAnchored, checkNoCaseCitation, checkNoTimeLimitClaim } from "@/lib/verification/own-words";

/**
 * A first cut at which grounds a person's account may relate to, and why.
 *
 * The owner's ruling, 2026-11-01: seventeen grounds with nothing to say which might matter
 * left a self-represented person to do the lawyer's first job alone. So the app now makes the
 * first cut — and every safeguard is about keeping it a CUT, not a verdict:
 *
 *   · Each suggestion carries the person's own words it rests on, verbatim. A suggestion
 *     whose quote is not in their account is dropped: it rests on something they never said.
 *   · Its "why" connects those words to what the ground is usually about. It never says the
 *     ground is met, strong, likely or the one to run; the verifier's no-advice, no-prediction
 *     and no-score gates read every one.
 *   · It is a suggestion. The person decides what goes into their summary, and can tick any
 *     ground the cut left out.
 *   · Only grounds already on their page. An id we did not offer is the model inventing law.
 */

/** Few enough to read on a phone; the rest stay listed beneath, untouched. */
export const MAX_SUGGESTIONS = 5;
const MAX_WHY_WORDS = 45;

export const GroundMatchSchema = z.object({
  covered: z.boolean().default(true),
  matches: z
    .array(
      z.object({
        groundId: z.string(),
        quote: z.string().default(""),
        why: z.string().default(""),
      }),
    )
    .default([]),
  sources: z.array(z.string()).default([]),
});
export type GroundMatch = z.infer<typeof GroundMatchSchema>;

export interface GroundSuggestion {
  groundId: string;
  /** Their words, exactly as they wrote them. */
  quote: string;
  /** Ours: how those words connect to what the ground is usually about. */
  why: string;
}

/**
 * A period of time in a "why" must be one they gave. "You say they gave you 14 days" reports
 * their account; "you have 28 days to apply" is a time limit nobody checked.
 */
const PERIOD = /\b\d+\s*(?:business\s+|working\s+)?(?:day|week|month|year)s?\b/gi;
export function periodsAreTheirs(why: string, account: string): boolean {
  // Words as digits on both sides: "sixty days" is the same period as "60 days".
  const flat = (x: string) => numberWordsToDigits(x).toLowerCase().replace(/\s+/g, " ");
  return (flat(why).match(PERIOD) ?? []).every((p) => flat(account).includes(flat(p)));
}

/** Every "why", for the verifier — the only prose of ours this step shows. */
export function matchProse(m: GroundMatch): string {
  return m.matches
    .map((x) => x.why.trim())
    .filter(Boolean)
    .join(" ");
}

/**
 * Screens the model's matches, one by one, and drops (never repairs) a failing one.
 * Returns gate NAMES only for what was dropped — never any of the person's words.
 */
export function screenMatches(
  m: GroundMatch,
  account: string,
  offered: string[],
): { suggestions: GroundSuggestion[]; dropped: string[] } {
  const ok = new Set(offered);
  const seen = new Set<string>();
  const dropped = new Set<string>();
  const suggestions: GroundSuggestion[] = [];
  for (const x of m.matches) {
    const quote = x.quote.trim();
    const why = x.why.replace(/\s+/g, " ").trim();
    if (!ok.has(x.groundId)) {
      dropped.add("not-offered");
      continue;
    }
    if (seen.has(x.groundId)) continue;
    if (quote.split(/\s+/).length < 3 || !checkQuoteAnchored(quote, account)) {
      dropped.add("quote-not-theirs");
      continue;
    }
    if (!why || why.split(" ").length > MAX_WHY_WORDS) {
      dropped.add("why-length");
      continue;
    }
    if (!checkNoCaseCitation([why]) || !checkNoTimeLimitClaim([why]) || !periodsAreTheirs(why, account)) {
      dropped.add("why-law");
      continue;
    }
    seen.add(x.groundId);
    suggestions.push({ groundId: x.groundId, quote, why });
    if (suggestions.length >= MAX_SUGGESTIONS) break;
  }
  return { suggestions, dropped: [...dropped] };
}
