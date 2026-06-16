/**
 * Flesch–Kincaid grade (plain-language gate, PRD §4).
 * Mirrors the heuristic in scripts/reading-level-check.mjs (kept in step by tests).
 */

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "")
    .match(/[aeiouy]{1,2}/g);
  return groups ? groups.length : 1;
}

/** Returns the FK grade, or null when the text is too short to score. */
export function fkGrade(text: string): number | null {
  const sentences = (text.match(/[.!?]+(\s|$)/g) || []).length || 1;
  const words = text.split(/\s+/).filter((w) => /[a-z]/i.test(w));
  if (words.length < 10) return null;
  const syllables = words.reduce((s, w) => s + countSyllables(w), 0);
  return 0.39 * (words.length / sentences) + 11.8 * (syllables / words.length) - 15.59;
}
