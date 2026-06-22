// Procedural data-layer safety linter (TECHNICAL_SPEC §3/§7; PRD §5). Runs in `verify`.
// HARD FAILS on: an entry missing a source/verifiedAsAt/cadence/help; a NUMERIC deadline
// figure on a non-verified or unsourced entry (never an unsourced deadline number); a
// declared decisionType with no classification token. WARNS on seed entries + verified
// entries staler than their own reviewCadenceDays (the staleness gate). This whole layer
// is a release gate: a supervising lawyer signs off before any entry flips to `verified`.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INDEX = resolve(ROOT, "data/index.json");

const hard = [];
const warn = [];

const isVerify = (s) => typeof s === "string" && /\bverify\b/i.test(s);
// A day/week/month figure that would read as a countdown if shown unsourced.
const hasTimeFigure = (s) =>
  typeof s === "string" && /\b\d+\s*(day|days|week|weeks|month|months|business day)/i.test(s);

function daysSince(iso) {
  const then = new Date(iso + "T00:00:00Z").getTime();
  return (Date.now() - then) / (1000 * 60 * 60 * 24);
}

function main() {
  let index;
  try {
    index = JSON.parse(readFileSync(INDEX, "utf8"));
  } catch (e) {
    console.error(`data-check: cannot read ${INDEX}. Run build-data first. (${e.message})`);
    process.exit(1);
  }

  const entries = index.entries ?? [];
  if (entries.length === 0) hard.push("data layer has no entries");

  const classified = new Set((index.classification ?? []).map((t) => `${t.entryId}:${t.token}`));
  let verifyMarkers = 0;

  for (const e of entries) {
    const id = e.id ?? "(no id)";
    const verified = e.status === "verified";
    const realSource = e.sourceUrl && !isVerify(e.sourceUrl);
    const realDate = typeof e.verifiedAsAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.verifiedAsAt);

    if (!e.sourceUrl) hard.push(`${id}: missing sourceUrl`);
    if (!e.verifiedAsAt) hard.push(`${id}: missing verifiedAsAt`);
    if (!(Number.isInteger(e.reviewCadenceDays) && e.reviewCadenceDays > 0))
      hard.push(`${id}: reviewCadenceDays must be a positive integer`);
    if (!Array.isArray(e.getHelp) || e.getHelp.length === 0)
      hard.push(`${id}: must offer ≥1 help service (always escalate)`);

    // THE no-unsourced-deadline invariant: a numeric time figure may only appear on a
    // verified entry with a real (non-VERIFY) source + date.
    if (hasTimeFigure(e.deadlineRule) && !(verified && realSource && realDate)) {
      hard.push(
        `${id}: deadlineRule states a numeric time figure but the entry is not verified+sourced — never show an unsourced deadline number`,
      );
    }

    // Staleness gate: a verified entry past its own cadence must be re-verified.
    if (verified) {
      if (!realDate) hard.push(`${id}: status=verified but verifiedAsAt is not a real YYYY-MM-DD date`);
      else if (daysSince(e.verifiedAsAt) > e.reviewCadenceDays)
        warn.push(`${id}: verifiedAsAt (${e.verifiedAsAt}) is older than reviewCadenceDays (${e.reviewCadenceDays}) — re-verify (staleness gate degrades to source+help)`);
      if (!realSource) hard.push(`${id}: status=verified but sourceUrl is a VERIFY placeholder`);
    } else {
      warn.push(`${id}: status=seed — NOT launch-ready; a supervising lawyer must verify every figure + flip to verified (data-layer release gate, PRD §12)`);
    }

    // Classification coverage: every declared decisionType is searchable (skip fallbacks).
    if (!e.isFallback) {
      for (const d of e.decisionTypes ?? []) {
        if (!classified.has(`${id}:${String(d).trim().toLowerCase()}`))
          hard.push(`${id}: decisionType "${d}" has no classification token (build-data drift)`);
      }
    }

    verifyMarkers += (JSON.stringify(e).match(/verify/gi) ?? []).length;
  }

  if (warn.length) console.warn("data-check warnings:\n  " + warn.join("\n  "));
  console.log(`data-check: ${entries.length} entries; ${verifyMarkers} VERIFY marker(s) for the lawyer to confirm before launch.`);

  if (hard.length) {
    console.error("\ndata-check FAILED (safety):\n  " + hard.join("\n  "));
    process.exit(1);
  }
  console.log("data-check OK (no safety violations).");
}

main();
