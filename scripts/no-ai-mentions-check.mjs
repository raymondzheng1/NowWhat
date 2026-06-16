// no-AI-mentions gate (harness §11) — customers see the product, not the machinery.
// Scans the same customer-copy surface as no-advice; reads the shared pattern file.

import { collectCustomerCopy, loadPatterns } from "./lib/copy-surfaces.mjs";

const { aiMentions } = loadPatterns();
const rules = aiMentions.map((r) => ({ re: new RegExp(r.pattern, "i"), why: r.why }));

const records = collectCustomerCopy();
const violations = [];
for (const rec of records) {
  for (const rule of rules) {
    const m = rule.re.exec(rec.text);
    if (m) {
      violations.push(`${rec.file} (${rec.where}): "${m[0]}" — ${rule.why}`);
    }
  }
}

if (violations.length) {
  console.error(
    `no-ai-mentions: ${violations.length} violation(s):\n  ` + violations.join("\n  "),
  );
  process.exit(1);
}
console.log(`no-ai-mentions OK — scanned ${records.length} customer-copy strings.`);
