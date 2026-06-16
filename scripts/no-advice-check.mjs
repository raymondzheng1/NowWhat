// no-advice / no-prediction gate for STATIC customer copy (PRD §11, harness §11.2).
// The runtime gate (lib/safety/no-advice.ts) checks model output; this linter checks
// the copy WE author. Both read lib/safety/no-advice-patterns.json (single source).

import { collectCustomerCopy, loadPatterns } from "./lib/copy-surfaces.mjs";

const { advice, prediction } = loadPatterns();
const rules = [...advice, ...prediction].map((r) => ({
  re: new RegExp(r.pattern, "i"),
  why: r.why,
}));

const records = collectCustomerCopy();
const violations = [];
for (const rec of records) {
  for (const rule of rules) {
    const m = rule.re.exec(rec.text);
    if (m) {
      violations.push(
        `${rec.file} (${rec.where}): "${m[0]}" — ${rule.why}\n    …${rec.text.slice(Math.max(0, m.index - 30), m.index + 40).trim()}…`,
      );
    }
  }
}

if (violations.length) {
  console.error(
    `no-advice: ${violations.length} violation(s) — customer copy must not give advice or predict outcomes:\n  ` +
      violations.join("\n  "),
  );
  process.exit(1);
}
console.log(`no-advice OK — scanned ${records.length} customer-copy strings.`);
