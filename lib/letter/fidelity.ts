/**
 * The letter-polish gate.
 *
 * A rewritten letter goes to a government office OVER THE PERSON'S NAME. If a review officer
 * asks "what makes you say that?", they have to be able to answer — and they cannot defend a
 * sentence they did not write. One invented detail can cost them belief on the parts that
 * were true. That is why the existing letter task forbids the model to add so much as an
 * adverb to their account.
 *
 * Polishing loosens that for OUR sentences — the template framing, which is ours to word —
 * while keeping it absolute for theirs. This gate is what makes the distinction real rather
 * than a hope expressed in a prompt:
 *
 *   · Every blank the person still has to fill must survive, and no new blank may appear.
 *     A dropped "[Your name]" is a letter posted unsigned; an invented one is a field they
 *     never agreed to disclose.
 *   · Every number and date must already be in the draft or in their own words. This is the
 *     proxy for "no invented facts", and numbers are where invention does the most damage in
 *     a letter about a decision: a date, an amount, a reference.
 *   · The letter must still be a letter — the parts that make it one cannot be polished away.
 */

const PLACEHOLDER = /\[([^\]]+)\]/g;
/** Any figure: amounts, dates, reference numbers, periods. */
const NUMBER = /\b\d[\d,.\/-]*\b/g;

export interface LetterFidelityFailure {
  gate:
    | "placeholder-dropped"
    | "placeholder-invented"
    | "invented-figure"
    | "not-a-letter"
    | "warning-dropped"
    | "invented-name"
    | "too-long";
  detail: string;
}

/**
 * Capitalised words a rewrite may use even if neither the draft nor their words contain them.
 * Kept tiny on purpose: everything a letter of ours says is already in the draft it started
 * from, so the allowance is only for the person's own first-person voice.
 */
const ALWAYS_ALLOWED = new Set(["i", "i'm", "i've", "i'd", "i'll"]);

/** A word, allowing the apostrophes and hyphens that names and places carry. */
const WORD = /[A-Za-z][A-Za-z'’-]*/g;

/**
 * A capitalised word in the middle of a sentence that appears nowhere in what we started from.
 *
 * Since 2026-10-31 the rewrite may SUMMARISE the person's account, not only reword our
 * framing — the owner's call, because the whole account pasted in is not a good letter. That
 * loosens what the model may do to their words, so this is the matching tightening: a figure
 * was already caught; a name or a place now is too. "I spoke to Officer Brown at the Collins
 * Street office" is the sentence that must never appear unless they wrote it.
 *
 * Mid-sentence only. A sentence-initial capital is ordinary English ("However", "Because"),
 * and refusing those would throw away good letters to catch nothing. Membership is checked
 * without case, so a model that capitalises "council" has not invented anything.
 */
function inventedNames(source: string, rewritten: string): string[] {
  const known = new Set([...source.matchAll(WORD)].map((m) => m[0].toLowerCase()));
  const found = new Set<string>();
  // Blanks are checked by the placeholder gate; their contents are not prose.
  const text = rewritten.replace(PLACEHOLDER, " ");
  for (const m of text.matchAll(WORD)) {
    const w = m[0];
    if (w[0] !== w[0]!.toUpperCase() || w[0] === w[0]!.toLowerCase()) continue;
    const lower = w.toLowerCase();
    if (ALWAYS_ALLOWED.has(lower) || known.has(lower)) continue;
    // Sentence-initial: nothing but space, quotes or brackets back to a full stop, a colon, a
    // line break or the start of the text.
    const before = text.slice(0, m.index).replace(/["'“‘(\s]+$/, "");
    if (before === "" || /[.!?:\n]$/.test(before)) continue;
    found.add(w);
  }
  return [...found];
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/**
 * Blocks a draft addresses to the person rather than to the agency, and which the rewrite
 * may not touch.
 *
 * Two templates carry one: the judicial-review draft says a court process is technical and
 * to get help before filing anything, and the court-election enquiry says in its first line
 * that the letter does not elect anything. Both exist because the document could otherwise
 * be mistaken for a step it is not.
 *
 * "More professional" is exactly the instruction under which a warning gets softened into a
 * clause or dropped as redundant. The prompt forbids touching it; this is what makes that
 * real, because a prompt is a request and a gate is a rule.
 */
const SELF_WARNINGS = ["NOTE TO YOURSELF"] as const;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export function checkLetterFidelity(
  original: string,
  theirWords: string,
  rewritten: string,
): LetterFidelityFailure[] {
  const failures: LetterFidelityFailure[] = [];

  // COUNTED, not just present. "[Your name]" appears twice in every draft — once in the
  // header and once in the sign-off — so a set would let a rewrite drop one of them and pass.
  // An unsigned letter and an unaddressed one are different failures, and both matter.
  const bracketsOf = (x: string) => {
    const m = new Map<string, number>();
    for (const hit of x.matchAll(PLACEHOLDER)) {
      const k = norm(hit[1] ?? "");
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  const before = bracketsOf(original);
  const after = bracketsOf(rewritten);

  for (const [b, n] of before) {
    const kept = after.get(b) ?? 0;
    if (kept < n) {
      failures.push({ gate: "placeholder-dropped", detail: n > 1 ? `${b} (${kept} of ${n})` : b });
    }
  }
  for (const [b, n] of after) {
    if (n > (before.get(b) ?? 0)) failures.push({ gate: "placeholder-invented", detail: b });
  }

  // Figures must be traceable. Checked against the draft AND their account, because a date
  // they themselves wrote is theirs to state.
  const allowed = new Set([
    ...[...original.matchAll(NUMBER)].map((m) => m[0]),
    ...[...theirWords.matchAll(NUMBER)].map((m) => m[0]),
  ]);
  const seen = new Set<string>();
  for (const m of rewritten.matchAll(NUMBER)) {
    const n = m[0];
    if (seen.has(n) || allowed.has(n)) continue;
    seen.add(n);
    failures.push({ gate: "invented-figure", detail: n });
  }

  // A warning written TO THE PERSON survives verbatim, or the rewrite is refused.
  for (const w of SELF_WARNINGS) {
    if (original.includes(w) && !rewritten.includes(w)) {
      failures.push({ gate: "warning-dropped", detail: w });
    }
  }

  // No new names or places, mid-sentence (see `inventedNames`).
  for (const n of inventedNames(`${original}\n${theirWords}`, rewritten)) {
    failures.push({ gate: "invented-name", detail: n });
  }

  // The rewrite exists to be SHORTER. One that grew past the draft — or past a length no
  // review officer reads in a minute — has stopped doing its job, and the person is better off
  // with the draft they can see in full.
  const limit = Math.max(words(original), 450);
  if (words(rewritten) > limit) {
    failures.push({ gate: "too-long", detail: `${words(rewritten)} words (limit ${limit})` });
  }

  // The structural bones. A "more professional" rewrite that drops the sign-off or the
  // subject line has produced a nicer paragraph and a worse letter.
  for (const [needle, what] of [
    ["Yours faithfully", "sign-off"],
    ["Re:", "subject line"],
    ["To:", "addressee"],
  ] as const) {
    if (!rewritten.includes(needle)) failures.push({ gate: "not-a-letter", detail: what });
  }

  return failures;
}
