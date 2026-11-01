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
 *   · A block addressed to the PERSON rather than to the agency comes back word for word.
 *     These are the lines that stop the document being mistaken for a step it is not, and
 *     "make it more professional" is exactly the instruction that softens them away. The
 *     prompt forbids touching them; this is what makes that real, because a prompt is a
 *     request and a gate is a rule.
 */

import { SELF_WARNING_BLOCKS } from "@/lib/draft/warnings";

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
const ALWAYS_ALLOWED = new Set([
  "i", "i'm", "i've", "i'd", "i'll",
  // The case letter's register, which names no one: its salutation, the heading the prompt
  // asks for, and the plain name of the hearing rule. "Chief Executive" is how a careful
  // letter writes the CEO their account already names.
  "sir", "madam", "background", "natural", "justice", "chief", "executive",
  // A title on its own names no one; the surname after it is still checked.
  "mr", "mrs", "ms", "miss", "dr", "prof",
]);

/**
 * A month written in full or short is the same month. Measured on a Centrelink account that said
 * "since Feb 2025": the letter wrote "since February 2025" and was refused for a name.
 */
const MONTHS: [string, string][] = [
  ["jan", "january"], ["feb", "february"], ["mar", "march"], ["apr", "april"], ["jun", "june"],
  ["jul", "july"], ["aug", "august"], ["sep", "september"], ["sept", "september"], ["oct", "october"],
  ["nov", "november"], ["dec", "december"],
];

/**
 * The word a token stands for: no case, no possessive. "Dr Marchetti's report" names the same
 * person as "Dr Marchetti", and "Services Australia's letter" the same agency — both refused a
 * case letter that every fact of was theirs (four requests out of four, on one account).
 */
const stem = (w: string) => w.toLowerCase().replace(/['’]s?$/, "");

/** Every form of the source's words a rewrite may use: stems, hyphen parts, either month form. */
function knownWords(source: string): Set<string> {
  const known = new Set<string>();
  for (const m of source.matchAll(WORD)) {
    const w = stem(m[0]);
    known.add(w);
    for (const part of w.split("-")) if (part) known.add(stem(part));
  }
  for (const [short, full] of MONTHS) {
    if (known.has(short) || known.has(full)) {
      known.add(short);
      known.add(full);
    }
  }
  return known;
}

const isKnown = (w: string, known: Set<string>) => {
  const k = stem(w);
  if (ALWAYS_ALLOWED.has(k) || known.has(k)) return true;
  // "Werribee-based" is theirs if each part is.
  const parts = k.split("-").filter(Boolean);
  return parts.length > 1 && parts.every((p) => ALWAYS_ALLOWED.has(p) || known.has(stem(p)));
};

/** Figures the way people write them both ways: "4-5" holds 4 and 5; "five" is 5. */
const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven",
  "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
];
const TENS: Record<string, number> = { thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const figureParts = (n: string) => n.split(/[-–/]/).map((p) => p.replace(/[.,]+$/, "")).filter(Boolean);
function knownFigures(...sources: string[]): Set<string> {
  const out = new Set<string>();
  for (const src of sources) {
    for (const m of src.matchAll(NUMBER)) {
      out.add(m[0]);
      for (const p of figureParts(m[0])) out.add(p);
    }
    for (const m of src.toLowerCase().matchAll(/[a-z]+/g)) {
      const i = NUMBER_WORDS.indexOf(m[0]);
      if (i >= 0) out.add(String(i));
      if (TENS[m[0]]) out.add(String(TENS[m[0]]));
    }
  }
  return out;
}

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
  const known = knownWords(source);
  const found = new Set<string>();
  // Blanks are checked by the placeholder gate; their contents are not prose.
  const text = rewritten.replace(PLACEHOLDER, " ");
  for (const m of text.matchAll(WORD)) {
    const w = m[0];
    if (w[0] !== w[0]!.toUpperCase() || w[0] === w[0]!.toLowerCase()) continue;
    if (isKnown(w, known)) continue;
    // Sentence-initial: nothing but space, quotes or brackets back to a full stop, a colon, a
    // line break or the start of the text. Line breaks are NOT stripped as space: they were, so
    // the first word under a heading — which ends in no full stop — counted as mid-sentence.
    const before = text.slice(0, m.index).replace(/["'“‘( \t]+$/, "");
    if (before === "" || /[.!?:\n]$/.test(before)) continue;
    found.add(w);
  }
  return [...found];
}

/**
 * A case letter may be as long as its case needs. A flat 750 refused the owner's
 * judicial-review letter twice: seven marked grounds, a warning block and the bones do not fit
 * in 750 words and still say anything. So the limit grows with the issues they marked, and the
 * model is told the number it is held to.
 *
 * The warning blocks are on top, not inside it: they are copied word for word and are not the
 * letter's to shorten. Counting them in refused a merits letter twice for being "too long" on a
 * three-issue Centrelink case. An analysis with more points than they marked counts too, since
 * the letter is asked to argue from it.
 */
export function caseMaxWords(
  c: { groundIds: string[]; notes: Record<string, string>; analysis?: { points: unknown[] } | null },
  draft = "",
): number {
  const marked = new Set([...c.groundIds, ...Object.keys(c.notes).filter((k) => c.notes[k]?.trim())]);
  const issues = Math.min(7, Math.max(2, marked.size, c.analysis?.points.length ?? 0));
  const flatDraft = flat(draft);
  const warnings = SELF_WARNING_BLOCKS.filter((w) => flatDraft.includes(flat(w.text))).reduce(
    (n, w) => n + words(w.text),
    0,
  );
  return Math.max(850, Math.min(1150, 500 + 90 * issues)) + warnings;
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Whitespace flattened, case and words kept.
 *
 * The renderer wraps, so a rewrite that only reflows a block has changed nothing and must
 * still pass. Anything else about it is a wording change, and a wording change to a warning
 * is what this gate is for.
 */
const flat = (s: string) => s.replace(/\s+/g, " ").trim();

export function checkLetterFidelity(
  original: string,
  theirWords: string,
  rewritten: string,
  /**
   * For the case letter: the corpus material it argues from (whose names — the tribunal, the
   * Act — it may use), and the length a case letter is allowed. The shorter letter passes
   * neither, and is held to the draft alone and to being short.
   */
  opts: { known?: string; maxWords?: number } = {},
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
  // A NEW blank is refused — unless its words are the person's own. People leave themselves
  // notes in their account, like "(Insert Rego)", and a rewrite that turns one into
  // "[Insert Rego]" has not invented a field: it has made their own reminder into a blank the
  // page highlights, which is the better outcome. Measured on a real account: that alone was
  // refusing one shorter letter in six.
  const theirsLower = norm(theirWords);
  for (const [b, n] of after) {
    if (n > (before.get(b) ?? 0) && !(b && theirsLower.includes(b))) {
      failures.push({ gate: "placeholder-invented", detail: b });
    }
  }

  // Figures must be traceable. Checked against the draft AND their account, because a date
  // they themselves wrote is theirs to state.
  const allowed = knownFigures(original, theirWords, opts.known ?? "");
  const seen = new Set<string>();
  for (const m of rewritten.matchAll(NUMBER)) {
    const n = m[0];
    if (seen.has(n) || allowed.has(n) || figureParts(n).every((p) => allowed.has(p))) continue;
    seen.add(n);
    failures.push({ gate: "invented-figure", detail: n });
  }

  // A warning written TO THE PERSON survives verbatim, or the rewrite is refused — the
  // heading AND the sentences under it.
  //
  // This used to check the string "NOTE TO YOURSELF" and nothing else, which is a weaker
  // rule than its own comment claimed. A rewrite that kept the heading and softened
  // "Please talk to a free legal service before you elect" into "you may wish to seek
  // advice", or dropped "it can carry costs" as alarming, passed every gate and shipped a
  // letter that no longer said the thing it exists to say. Nobody would have noticed,
  // because the letter still read well. Checked against the whole block now.
  //
  // WHAT THIS STILL DOES NOT CHECK: where the block sits. The prompt also asks for it "in
  // the same place", and a rewrite that moved an intact block below the body would pass
  // here, which matters because the heading says PLEASE READ FIRST. There is no honest cheap
  // check for it — every sentence around the block is ours to reword, so there is no stable
  // anchor to measure position against, and a weak proxy (before the sign-off, say) would
  // catch only the absurd case while reading like real cover. Said out loud rather than
  // implied, because a comment claiming more than its code is what went wrong here before.
  const flatOriginal = flat(original);
  const flatRewritten = flat(rewritten);
  for (const w of SELF_WARNING_BLOCKS) {
    const needle = flat(w.text);
    if (flatOriginal.includes(needle) && !flatRewritten.includes(needle)) {
      failures.push({ gate: "warning-dropped", detail: w.label });
    }
  }

  // No new names or places, mid-sentence (see `inventedNames`).
  for (const n of inventedNames(`${original}\n${theirWords}\n${opts.known ?? ""}`, rewritten)) {
    failures.push({ gate: "invented-name", detail: n });
  }

  // The rewrite exists to be SHORTER. One that grew past the draft — or past a length no
  // review officer reads in a minute — has stopped doing its job, and the person is better off
  // with the draft they can see in full.
  const limit = opts.maxWords ?? Math.max(words(original), 450);
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
