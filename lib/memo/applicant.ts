/**
 * The corpus's rule material, said of "the applicant" instead of to "you".
 *
 * The corpus is written to a lay reader ("You need to point to a 'ground of review'"), and the
 * guided flow shows it that way. The in-depth analysis is a different document: it sets out the
 * law in general terms, the way a lawyer's memo does, and the owner asked for that register
 * there (2026-11-01). The corpus is lawyer-signed and shared by the lay pages, so it is not
 * rewritten; this changes only how the in-depth analysis prints it.
 *
 * Deliberately narrow: "you" as a subject takes a third-person verb ("You need" → "The
 * applicant needs"), anything else becomes "the applicant" / "the applicant's". The test runs
 * it over every corpus string the analysis prints and checks no "you" survives.
 */

/** Verbs that follow "you" in the corpus, in the form that follows "the applicant". */
const THIRD_PERSON: Record<string, string> = {
  are: "is",
  were: "was",
  have: "has",
  do: "does",
  need: "needs",
  start: "starts",
  argue: "argues",
  lodge: "lodges",
  explain: "explains",
  get: "gets",
  give: "gives",
  ask: "asks",
  think: "thinks",
  want: "wants",
  choose: "chooses",
  file: "files",
  disagree: "disagrees",
  live: "lives",
  wait: "waits",
  make: "makes",
  win: "wins",
  receive: "receives",
  complain: "complains",
  apply: "applies",
  go: "goes",
  know: "knows",
  rely: "relies",
  say: "says",
  see: "sees",
  send: "sends",
  show: "shows",
  find: "finds",
  feel: "feels",
  believe: "believes",
  raise: "raises",
  recognise: "recognises",
  hold: "holds",
  "don't": "doesn't",
};

const ADVERB = "(?:usually|also|then|often|still|only|normally|simply|first|just|really|already)";

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A word that shows the "you" before it is a subject: a modal, or a verb in the past. */
const SUBJECT_NEXT =
  /^(can|cannot|could|may|might|must|will|would|should|did|had|got|made|said|knew|thought|sent|gave|told|saw|found|felt|left|paid|\w+ed)$/;

export function forApplicant(text: string): string {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(sentence)
    .join(" ");
}

/** One sentence: the applicant is named once, then "their". */
function sentence(text: string): string {
  let s = text;
  // "yourself" first, so the plain "you" rule below does not split it.
  s = s.replace(/\byourself\b/gi, "themselves");
  // "your" → "the applicant's" the first time the sentence names them, "their" after that.
  // Before "you", which it contains.
  let named = /\byou\b/i.test(s.split(/\byours?\b/i)[0] ?? "");
  s = s.replace(/\b(Y|y)ours?\b/g, (_, y: string) => {
    const out = named ? "their" : "the applicant's";
    named = true;
    return y === "Y" ? capital(out) : out;
  });
  // "you [adverb] verb" → "the applicant [adverb] verbs". Not after a word that makes "you"
  // its object ("lets you ask", "help you choose") or asks a question ("Can you say"): the
  // verb after it stays as it is there.
  const notSubject = `(?<!\\b(?:let|lets|letting|help|helps|helping|make|makes|can|could|do|does|did|are|were|will|would|should|have|has|may|must)\\s)`;
  s = s.replace(new RegExp(`${notSubject}\\b(you|You)(\\s+${ADVERB})?\\s+([a-z']+)\\b`, "g"), (whole, you, adv = "", verb) => {
    const v = THIRD_PERSON[verb as string];
    const subject = you === "You" ? "The applicant" : "the applicant";
    return v ? `${subject}${adv}${" "}${v}` : whole;
  });
  // A second verb sharing that subject: "the applicant explains their side and give…".
  if (/\bthe applicant\b/i.test(s)) {
    s = s.replace(/\band (\w+)\b/g, (whole, verb: string) =>
      THIRD_PERSON[verb] && /\b[Tt]he applicant (?:\w+ )?\w+s\b/.test(s) ? `and ${THIRD_PERSON[verb]}` : whole,
    );
  }
  // Whatever is left is "you" before a modal or a past tense ("you can", "when you asked"), or
  // "you" as an object ("for you"). Once the sentence has named the applicant, the first is
  // "they" and the second "them".
  s = s.replace(/\bYou\b/g, "The applicant");
  s = s.replace(/\byou\b/g, (_m, at: number) => {
    if (!/\b[Tt]he applicant\b/.test(s.slice(0, at))) return "the applicant";
    const next = /^\s+(?:(?:never|also|then|already|still|usually|only|just)\s+)?(\w+)/.exec(s.slice(at + 3))?.[1] ?? "";
    return SUBJECT_NEXT.test(next) ? "they" : "them";
  });
  // A sentence that now opens in lower case after the rewrite.
  return s.replace(/(^|[.!?]\s+)(the applicant)/g, (_, a, b) => a + capital(b));
}
