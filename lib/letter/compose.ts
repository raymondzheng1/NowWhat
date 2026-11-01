import type { PathwayEntry } from "@/lib/schemas/corpus";
import { buildDraft, type CasePoint, type Draft, type DraftKind } from "@/lib/draft/build";

/**
 * Composes the person's own account into a review letter — deterministically, on the device.
 *
 * WHO IS SPEAKING is the whole design. A letter that says "this decision breached procedural
 * fairness" puts a legal conclusion in the person's mouth. A letter that says "I did not get
 * a chance to have my say", followed by what they typed, is their account of their own life.
 * Only the second is ours to write.
 *
 * So every sentence that reaches the page has either been typed by the person or shown to
 * them on screen before it was added. Nothing is inferred, nothing is argued, and no model
 * chooses anything: the assembly is a pure function, which is why it can run client-side and
 * why /start remains a page that sends nothing anywhere.
 *
 * WHICH GROUNDS MAY APPEAR, and the rule that decided it. A ground earns a heading only if
 * it passes four tests:
 *   1. Origination — could they have said it before we showed them anything?
 *   2. Knowledge   — is every claim something they saw, heard, did, or can point at?
 *   3. No legal category — does it name a standard, test, power, duty or validity? Cut if so.
 *   4. Defensibility — if asked "what makes you say that?", can they answer from memory?
 *
 * Six of the fifteen pass. The other nine are not silently dropped: the person still sees
 * them, still ticks them, still writes about them, and everything they write goes into the
 * note for a free legal service — where `lib/handoff` already frames them as points to
 * discuss rather than conclusions. The letter itself says so, in `otherConcerns`, so the
 * agency reading it knows the letter is not the whole picture.
 *
 * Deliberately absent: bias and improper purpose. Each imputes a state of mind to a named
 * officer, in a letter to that officer's own office, written by someone who will be dealing
 * with that office for years.
 *
 * Bad faith used to be named here as the third. The owner removed that ground from the corpus
 * on 2026-08-23 (see grounds/improper-purpose.md), so there is nothing left to exclude — but
 * the reasoning it supplied is why the other two stay out, and it is kept here rather than
 * lost with the entry: rare, hard to prove, a serious allegation, a high bar.
 */

/** Ground ids that may appear as a heading, and the i18n key for that heading. */
export const LETTER_GROUND_HEADINGS: Record<string, string> = {
  "procedural-fairness-hearing": "groundHearing",
  "relevant-considerations": "groundRelevant",
  "inflexible-policy": "groundRule",
  "no-evidence": "groundWrongFact",
  "irrelevant-considerations": "groundOffTopic",
  "invalid-delegation": "groundSigner",
};

/** Grounds whose heading belongs only in the note for a lawyer, never in a letter to the agency. */
export const LAWYER_NOTE_ONLY = new Set(["invalid-delegation"]);

export interface LetterAccount {
  /** Free-text answers, keyed by question id. Never leaves the device. */
  answers: Record<string, string>;
  /** Ground ids the person marked as relating to their situation. */
  groundIds: string[];
}

export interface ComposeInput {
  entry: PathwayEntry;
  kind: DraftKind;
  account: LetterAccount;
  /**
   * How a marked ground is headed in the document: the name the analysis gives it, so the two
   * read as one piece of work. Undefined for an id that is not a ground here, which is left out.
   */
  groundHeading: (id: string) => string | undefined;
  /** The criteria they ticked (merits and internal review), each with what they wrote under it. */
  criteria?: CasePoint[];
  /** The date on the decision they gave on the first steps (YYYY-MM-DD), if any. */
  decisionDate?: string;
}

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * A sentence is a repeat when the account already holds it — word for word, or with eight or
 * more words of which nine in ten of its three-word runs are already there, in that order (a
 * pasted line with a word fixed). Short sentences only count when word for word: "The sign was
 * not clear" is a point, not a copy.
 *
 * Runs of words, not loose words. Counting loose words treated a note that SAID THE SAME THING
 * IN OTHER WORDS as a copy, because a long account already holds nearly every ordinary word: on
 * a Centrelink account, two of about twelve note sentences survived, and the two left read as
 * orphans. A reworded point is the person's point and stays.
 */
function isRepeat(sentence: string, story: string): boolean {
  const w = words(sentence);
  if (!w) return true;
  const st = words(story);
  if (st.includes(w)) return true;
  const ws = w.split(" ");
  if (ws.length < 8) return false;
  const runs = (xs: string[]) => xs.slice(0, -2).map((_, i) => xs.slice(i, i + 3).join(" "));
  const have = new Set(runs(st.split(" ")));
  const mine = runs(ws);
  return mine.filter((r) => have.has(r)).length / mine.length >= 0.9;
}

/** The note with every sentence already in their account taken out, paragraphs kept. */
export function withoutRepeats(note: string, story: string): string {
  if (!story.trim()) return note.trim();
  return note
    .split(/\n{2,}/)
    .map((para) =>
      para
        .split(/(?<=[.!?])\s+/)
        .filter((x) => x.trim() && !isRepeat(x, story))
        .join(" ")
        .trim(),
    )
    .filter(Boolean)
    .join("\n\n");
}

/**
 * A line written TO the person, put in their own voice for a heading in their document: "The
 * tribunal decides whether the rules were applied correctly to your situation." becomes "…to my
 * situation", with no full stop. Only the second person changes; nothing else is reworded.
 */
export function inMyVoice(line: string): string {
  return line
    .trim()
    .replace(/[.]+$/, "")
    .replace(/\byourself\b/gi, "myself")
    .replace(/\byours\b/gi, "mine")
    .replace(/\byour\b/g, "my")
    .replace(/\bYour\b/g, "My")
    .replace(/\byou (are|were|have|had|can|could|did|do|will|would)\b/gi, (_, v: string) =>
      `I ${v.toLowerCase() === "are" ? "am" : v.toLowerCase() === "were" ? "was" : v.toLowerCase()}`,
    )
    .replace(/\byou\b/gi, "me");
}

/**
 * Their note under a point, without the sentences their account already says — unless that
 * leaves nothing. A note prefilled from a suggestion IS a sentence of their account, and a
 * ground with a blank under it says less than one that repeats the fact it rests on.
 */
const own = (note: string, story: string) => capitalise(withoutRepeats(note, story) || note.trim());

/** "the fine should be withdrawn." under a heading reads as a slip. */
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The plain document, built on the device: their account, and every point they marked with what
 * they wrote under it (the owner's ruling, 2026-11-02 — it is the final document, so nothing is
 * held back for "a human legal service", and it carries every ground the analysis works through).
 * It is what they get when the written statement is not available, and what that statement is
 * written from. When they have written nothing, it is the template with its blanks.
 */
export function composeLetter(input: ComposeInput): Draft {
  const { answers, groundIds } = input.account;
  const said = (id: string) => (answers[id] ?? "").trim();
  const story = said("q-story");
  const opts = { decisionDate: input.decisionDate };

  if (input.kind === "judicial-review-application") {
    const points = groundIds.flatMap((id) => {
      const heading = input.groundHeading(id);
      return heading ? [{ heading, text: own(said(`g-${id}`), story) }] : [];
    });
    return buildDraft(input.entry, input.kind, story || undefined, { ...opts, points });
  }
  if (
    input.kind === "merits-review-application" ||
    input.kind === "review-application" ||
    input.kind === "internal-review-request"
  ) {
    const points = (input.criteria ?? []).map((c) => ({ heading: c.heading, text: own(c.text, story) }));
    const internalNote = input.kind === "internal-review-request" ? own(said("q-internal"), story) : undefined;
    return buildDraft(input.entry, input.kind, story || undefined, { ...opts, points, internalNote });
  }
  // The enquiries (reasons, the court form) carry their account as it is.
  return buildDraft(input.entry, input.kind, story || undefined, opts);
}
