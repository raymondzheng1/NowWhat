/**
 * A criterion as a reason's heading in the person's own document: "The tribunal decides whether
 * the rules were applied correctly to your situation." becomes "Whether the rules were applied
 * correctly to my situation".
 *
 * The criteria describe the body ("The tribunal decides whether…", "The grounds include…"), and
 * as a reason in their document that read as a description of the tribunal, not a reason (the
 * quality review, 2026-11-02). So the question it asks is kept, in their voice: the first sentence,
 * with the "who decides" opening taken off.
 */
export function criterionHeading(line: string): string {
  const first = line.trim().split(/(?<=\.)\s+/)[0] ?? line;
  const asked = first
    .replace(/^(?:[^,]*,\s*)?(?:the tribunal|the reviewing agency|the reviewer|the court|vcat|it)\s+(?:also\s+)?(?:decides|considers)\s+(?=whether\b)/i, "")
    .replace(/^(?:the grounds include|they also include)\s+/i, "");
  return inMyVoice(asked.charAt(0).toUpperCase() + asked.slice(1));
}

/**
 * A line written TO the person, put in their own voice: "…applied correctly to your situation."
 * becomes "…to my situation", with no full stop. Only the second person changes.
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
