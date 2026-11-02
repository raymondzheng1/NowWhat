/**
 * Number words as digits — "sixty days", "twenty-eight days", "twenty eight days" → "60 days",
 * "28 days" — so the time-limit gates, which look for digits, see a period however it is written.
 *
 * Found by the quality review (2026-11-02): every time gate required digits, so a model obeying
 * "state no time limit" to the letter could still write "you have sixty days" — the very figure
 * the deadline rule in its context holds — and it shipped. Used only to CHECK text, never to
 * change what a person reads.
 */
const ONES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const TENS_WORDS = Object.keys(TENS).join("|");
const ONES_WORDS = Object.keys(ONES).join("|");
const COMPOUND = new RegExp(`\\b(${TENS_WORDS})(?:[-\\s](${ONES_WORDS}))?\\b`, "gi");
const SINGLE = new RegExp(`\\b(${ONES_WORDS})\\b`, "gi");

export function numberWordsToDigits(text: string): string {
  return text
    .replace(COMPOUND, (_, t: string, o?: string) => String(TENS[t.toLowerCase()]! + (o ? ONES[o.toLowerCase()]! : 0)))
    .replace(SINGLE, (w: string) => String(ONES[w.toLowerCase()]!));
}
