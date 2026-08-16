import type { PathwayEntry } from "@/lib/schemas/corpus";
import { buildDraft, type Draft, type DraftKind } from "@/lib/draft/build";

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
 * Deliberately absent: bad faith, bias and improper purpose. Each imputes a state of mind to
 * a named officer, in a letter to that officer's own office, written by someone who will be
 * dealing with that office for years. The corpus says of bad faith that it is "rare, hard to
 * prove, a serious allegation, a high bar"; that logic applies to all three.
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
  /** Resolved heading text, so all customer prose stays in en.json. */
  headingFor: (key: string) => string;
  /** Lead line shown above the marked points, and the truncation disclosure. */
  groundsLead: string;
  otherConcerns: string;
  /** Labels for the universal questions, in the order they should appear. */
  universal: { id: string; label: string }[];
}

/**
 * Returns the deterministic draft with the person's account woven in. When they have written
 * nothing, this is exactly the letter they would have got before — never a blank page.
 */
export function composeLetter(input: ComposeInput): Draft {
  const base = buildDraft(input.entry, input.kind);
  const { answers, groundIds } = input.account;
  const said = (id: string) => (answers[id] ?? "").trim();

  const parts: string[] = [];

  // The person's own narrative, under the questions they were asked.
  for (const q of input.universal) {
    const v = said(q.id);
    if (v) parts.push(`${q.label}\n${v}`);
  }

  // The points they marked, each with what THEY wrote under it. A heading with nothing
  // written under it is dropped: an unexplained heading is an assertion we would be making.
  const marked: string[] = [];
  let omitted = false;
  for (const id of groundIds) {
    const key = LETTER_GROUND_HEADINGS[id];
    const body = said(`g-${id}`);
    if (!key || LAWYER_NOTE_ONLY.has(id)) {
      omitted = true;
      continue;
    }
    if (!body) {
      omitted = true;
      continue;
    }
    marked.push(`${input.headingFor(key)}\n${body}`);
  }
  if (marked.length > 0) {
    parts.push([input.groundsLead, "", ...marked].join("\n"));
  }
  // Say plainly that the letter is not everything — in the letter, not just in the UI.
  if (omitted) parts.push(input.otherConcerns);

  if (parts.length === 0) return base;

  // Slot the account above the sign-off so the letter still closes properly.
  const SIGN_OFF = "Yours faithfully,";
  const idx = base.body.lastIndexOf(SIGN_OFF);
  const block = parts.join("\n\n");
  const body =
    idx === -1
      ? `${base.body}\n\n${block}`
      : `${base.body.slice(0, idx).trimEnd()}\n\n${block}\n\n${base.body.slice(idx)}`;
  return { ...base, body };
}
