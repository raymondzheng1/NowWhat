// Corpus safety linter (TECHNICAL_SPEC §2/§7; harness §4.2). Runs in `verify`.
// HARD FAILS on safety violations (an asserted deadline with no verified source, a
// missing source / help service). WARNS on seed entries + stale verified entries so
// the app can build during MVP while keeping the safety invariant enforced.
//
// CORPUS_STALE_MONTHS mirrors lib/config.ts (kept in sync by comment; a constant).

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INDEX = resolve(ROOT, "corpus/index.json");
const CORPUS_STALE_MONTHS = 6; // keep in sync with lib/config.ts

const hard = [];
const warn = [];

function isVerifyMarker(s) {
  return typeof s === "string" && /\bverify\b/i.test(s);
}

function monthsSince(isoDate) {
  const then = new Date(isoDate + "T00:00:00Z").getTime();
  const now = Date.now();
  return (now - then) / (1000 * 60 * 60 * 24 * 30.4375);
}

function main() {
  let index;
  try {
    index = JSON.parse(readFileSync(INDEX, "utf8"));
  } catch (e) {
    console.error(`corpus-check: cannot read ${INDEX}. Run build-corpus first. (${e.message})`);
    process.exit(1);
  }

  const entries = index.entries ?? [];
  if (entries.length === 0) hard.push("corpus has no entries");

  let verifyMarkerCount = 0;

  for (const e of entries) {
    const id = e.id ?? "(no id)";

    if (!Array.isArray(e.sources) || e.sources.length === 0)
      hard.push(`${id}: must have ≥1 source`);
    if (!Array.isArray(e.getHelp) || e.getHelp.length === 0)
      hard.push(`${id}: must offer ≥1 help service (always escalate)`);
    if (!e.plainLanguageExplainer)
      hard.push(`${id}: missing plainLanguageExplainer`);

    // The deadline safety invariant.
    for (const [i, p] of (e.pathways ?? []).entries()) {
      const hasDays = typeof p.deadlineDays === "number" && p.deadlineDays > 0;
      const claimsVerified = p.deadlineVerified === true;
      const sourcedReal = p.source && !isVerifyMarker(p.source);

      if (hasDays && !(claimsVerified && sourcedReal)) {
        hard.push(
          `${id}: pathway[${i}] "${p.name}" sets a numeric deadline (${p.deadlineDays}d) but is not verified+sourced — never assert an unsourced deadline`,
        );
      }
      if (claimsVerified && !(hasDays && sourcedReal)) {
        hard.push(
          `${id}: pathway[${i}] "${p.name}" is marked deadlineVerified but lacks a numeric deadline or a real source`,
        );
      }
    }

    // Verified entries must carry a real lastVerified date.
    if (e.status === "verified") {
      if (!e.lastVerified) {
        hard.push(`${id}: status=verified but lastVerified is null`);
      } else if (monthsSince(e.lastVerified) > CORPUS_STALE_MONTHS) {
        warn.push(`${id}: lastVerified (${e.lastVerified}) is older than ${CORPUS_STALE_MONTHS} months — re-verify`);
      }
    } else {
      warn.push(`${id}: status=seed — NOT launch-ready; a human must verify figures + flip to verified before launch`);
    }

    // Count VERIFY markers for the report.
    const blob = JSON.stringify(e);
    const matches = blob.match(/verify/gi);
    if (matches) verifyMarkerCount += matches.length;
  }

  if (warn.length) {
    console.warn("corpus-check warnings:\n  " + warn.join("\n  "));
  }
  console.log(
    `corpus-check: ${entries.length} entries; ${verifyMarkerCount} VERIFY marker(s) still to confirm before launch.`,
  );

  if (hard.length) {
    console.error("\ncorpus-check FAILED (safety):\n  " + hard.join("\n  "));
    process.exit(1);
  }
  console.log("corpus-check OK (no safety violations).");
}

main();
