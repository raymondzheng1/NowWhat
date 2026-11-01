import { SELF_WARNING_BLOCKS, SELF_WARNING_HEADING } from "@/lib/draft/warnings";

/**
 * How a draft letter is SHOWN and COPIED, as opposed to what it says.
 *
 * Two changes, both the owner's (2026-11-01):
 *
 *  1. The NOTE TO YOURSELF blocks come out of the letter and sit above it. They are addressed to
 *     the person, not the agency, so they were never meant to be sent — and inside the letter
 *     they read as part of it. They are not dropped: the page shows them, word for word, above
 *     the letter, which is where "please read first" belongs. The templates and the fidelity
 *     gate are unchanged, so a rewrite still has to hand every block back.
 *
 *  2. A heading reads as a heading: bold on screen, with a blank line before the paragraph it
 *     heads, so "Background" no longer runs into its first sentence.
 */

const flat = (s: string) => s.replace(/\s+/g, " ").trim();

/** The warnings in the letter, and the letter without them. */
export function splitWarnings(body: string): { warnings: string[]; letter: string } {
  const warnings: string[] = [];
  let letter = body;
  for (const w of SELF_WARNING_BLOCKS) {
    if (w.text === SELF_WARNING_HEADING) continue;
    if (!flat(letter).includes(flat(w.text))) continue;
    warnings.push(w.text);
    // The block may have been reflowed; match it whitespace-insensitively.
    const pattern = new RegExp(
      w.text
        .split(/\s+/)
        .map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("\\s+"),
    );
    letter = letter.replace(pattern, "");
  }
  letter = letter
    .split("\n")
    .filter((l) => l.trim() !== SELF_WARNING_HEADING)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { warnings, letter };
}

/**
 * A heading: a short line of its own, after a blank line, that ends in no punctuation and is
 * not one of the letter's labelled lines ("To:", "Re:") or a blank to fill in.
 */
export function isHeadingLine(lines: string[], i: number): boolean {
  const line = (lines[i] ?? "").trim();
  // "Ground 1: I was not given a chance to answer" — the statement of case numbers its grounds
  // and reasons, and those headings carry a colon and run longer than a letter's.
  const numbered = /^(Ground|Reason) \d+: \S/.test(line);
  if (!line || line.length > (numbered ? 120 : 80)) return false;
  if (/[.,;:!?"'”)]$/.test(line) || line.startsWith("[") || line.startsWith("-")) return false;
  if (line.includes(":") && !numbered) return false;
  if (i > 0 && (lines[i - 1] ?? "").trim() !== "") return false;
  // Followed by its paragraph — directly, or after the blank line `presentLetter` adds.
  const next = (lines[i + 1] ?? "").trim();
  return next !== "" || (lines[i + 2] ?? "").trim() !== "";
}

/** The letter as shown and copied: warnings out, a blank line after each heading. */
export function presentLetter(body: string): { warnings: string[]; letter: string } {
  const { warnings, letter } = splitWarnings(body);
  const lines = letter.split("\n");
  const out: string[] = [];
  lines.forEach((l, i) => {
    out.push(l);
    if (isHeadingLine(lines, i) && (lines[i + 1] ?? "").trim() !== "") out.push("");
  });
  return { warnings, letter: out.join("\n") };
}
