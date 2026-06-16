// Reading-level gate (PRD §4, harness §4.2). Plain language for vulnerable people.
// Computes Flesch–Kincaid grade on PROSE surfaces (explainers, FAQ bodies/answers),
// not short UI labels. Ceiling mirrors READING_GRADE.ceiling in lib/config.ts.

import { collectCustomerCopy } from "./lib/copy-surfaces.mjs";

const CEILING = 11; // keep in sync with lib/config.ts READING_GRADE.ceiling

function countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "")
    .match(/[aeiouy]{1,2}/g);
  return groups ? groups.length : 1;
}

function fkGrade(text) {
  const sentences = (text.match(/[.!?]+(\s|$)/g) || []).length || 1;
  const words = text.split(/\s+/).filter((w) => /[a-z]/i.test(w));
  if (words.length < 10) return null; // too short to score meaningfully
  const syllables = words.reduce((s, w) => s + countSyllables(w), 0);
  return (
    0.39 * (words.length / sentences) +
    11.8 * (syllables / words.length) -
    15.59
  );
}

function stripMarkdown(s) {
  return s
    .replace(/^---[\s\S]*?---/, "") // frontmatter
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#>*_`>|-]/g, " ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

const records = collectCustomerCopy().filter(
  (r) =>
    /plainLanguageExplainer|body|answer|description/.test(r.where) &&
    stripMarkdown(r.text).length > 120,
);

const violations = [];
let worst = { grade: 0, where: "—" };
for (const rec of records) {
  const grade = fkGrade(stripMarkdown(rec.text));
  if (grade == null) continue;
  if (grade > worst.grade) worst = { grade, where: `${rec.file} (${rec.where})` };
  if (grade > CEILING) {
    violations.push(
      `${rec.file} (${rec.where}): grade ${grade.toFixed(1)} > ${CEILING} — simplify`,
    );
  }
}

if (violations.length) {
  console.error(`reading-level: ${violations.length} too-complex passage(s):\n  ` + violations.join("\n  "));
  process.exit(1);
}
console.log(
  `reading-level OK — ${records.length} prose passages ≤ grade ${CEILING} (worst ${worst.grade.toFixed(1)}: ${worst.where}).`,
);
