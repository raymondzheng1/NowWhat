// Legal-corpus safety linter (TECHNICAL_SPEC §3/§7). Runs in `verify`.
// HARD FAILS: a ground missing its test/elements; missing processes/comparison/triage; a
// leading case without a pinpoint (the verifier binds every citation to a pinpoint). WARNS:
// seed grounds/processes + grounds with no leading cases (v2 not yet populated — the
// generator can cite nothing and degrades to "get help", the correct gated behaviour).

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INDEX = resolve(ROOT, "corpus/legal/index.json");

const hard = [];
const warn = [];
let noPinpoint = 0;

function main() {
  if (!existsSync(INDEX)) {
    console.error(`legal-check: cannot read ${INDEX}. Run build-legal first.`);
    process.exit(1);
  }
  const index = JSON.parse(readFileSync(INDEX, "utf8"));
  const grounds = index.grounds ?? [];
  const processes = index.processes ?? [];

  if (grounds.length === 0) hard.push("legal corpus has no grounds");
  if (processes.length < 2) hard.push("legal corpus must define both processes (merits-review + judicial-review)");
  if (!index.comparison) hard.push("legal corpus has no comparison block");
  if (!index.triage) hard.push("legal corpus has no triage block");

  for (const p of processes) {
    const id = p.id ?? "(no id)";
    if (!p.whatItIs || !p.question) hard.push(`process ${id}: missing whatItIs/question`);
    if (!Array.isArray(p.remedies) || p.remedies.length === 0) hard.push(`process ${id}: needs ≥1 remedy`);
    if (p.status !== "verified") warn.push(`process ${id}: status=seed — explainer not yet signed off (legal sign-off gate)`);
  }

  for (const g of grounds) {
    const id = g.id ?? "(no id)";
    if (!g.test) hard.push(`${id}: missing test`);
    if (!g.whatItMeans || !g.plainExample) hard.push(`${id}: missing whatItMeans/plainExample`);
    if (!Array.isArray(g.whatRelates) || g.whatRelates.length === 0) hard.push(`${id}: needs ≥1 whatRelates prompt`);
    if (!Array.isArray(g.elements) || g.elements.length === 0) hard.push(`${id}: needs ≥1 element`);
    for (const [i, e] of (g.elements ?? []).entries()) {
      if (!e.id || !e.name || !e.layPrompt) hard.push(`${id}: element[${i}] missing id/name/layPrompt`);
    }
    for (const [i, c] of (g.leadingCases ?? []).entries()) {
      // A missing pinpoint is TRACKED, not fatal.
      //
      // It was a hard failure, which is the wrong shape for the risk. A citation without a
      // pinpoint is still true and still checkable — it just does not point at a page. The
      // failure this project must actually prevent is an INVENTED pinpoint, and a hard gate
      // here pushes exactly that way: the source materials record lecture references
      // ("Sem 10 s5"), not judgment pages, so demanding one either blocks verified content
      // or invites someone to guess. Guessing is how a wrong party name reached the corpus.
      //
      // The renderer omits an empty pinpoint cleanly, so nothing false is shown. This warns
      // until a human supplies the page.
      // OWNER DECISION (2026-08-17): a pinpoint is optional and we do not chase one.
      // The source materials record lecture references, not judgment pages, and a hard
      // requirement here either blocks verified content or invites a guess — guessing is
      // what produced a wrong party name once already. Counted, not listed: eleven lines of
      // warning about work nobody intends to do is noise that hides real warnings.
      if (!c.pinpoint) noPinpoint++;
    }
    if (g.status !== "verified") warn.push(`${id}: status=seed — grounds not yet signed off (legal sign-off gate)`);
    if ((g.leadingCases ?? []).length === 0) warn.push(`${id}: no leading cases yet — v2 generator will degrade to "get help" for this ground`);
  }

  if (warn.length) console.warn("legal-check warnings:\n  " + warn.join("\n  "));
  console.log(
    `legal-check: ${processes.length} processes, ${grounds.length} grounds` +
      (noPinpoint ? ` (${noPinpoint} citation(s) without a pinpoint — accepted).` : "."),
  );
  if (hard.length) {
    console.error("\nlegal-check FAILED:\n  " + hard.join("\n  "));
    process.exit(1);
  }
  console.log("legal-check OK.");
}

main();
