// Procedural data-layer safety linter (TECHNICAL_SPEC §3/§7; PRD §5). Runs in `verify`.
// HARD FAILS on: an entry missing a source/verifiedAsAt/cadence/help; a NUMERIC deadline
// figure on a non-verified or unsourced entry, or one that does not name the instrument it
// comes from and what starts the clock (never an unsourced deadline number); a per-stage
// period missing its provision, trigger or source effective date; a declared decisionType
// with no classification token. WARNS on seed entries, verified entries staler than their own
// reviewCadenceDays (the staleness gate), and a stated period whose sourceUrl is a site front
// page rather than the provision. This whole layer is a release gate: a supervising lawyer
// signs off before any entry flips to `verified`.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INDEX = resolve(ROOT, "data/index.json");
const SRC = resolve(ROOT, "data/pathways");

const hard = [];
const warn = [];

const isVerify = (s) => typeof s === "string" && /\bverify\b/i.test(s);
// A day/week/month figure that would read as a countdown if shown unsourced.
const hasTimeFigure = (s) =>
  typeof s === "string" && /\b\d+\s*(day|days|week|weeks|month|months|business day)/i.test(s);

/**
 * The no-unsourced-deadline invariant, widened after external legal review (2026-08-23).
 *
 * The gate used to ask for three things: status=verified, a sourceUrl that is not a VERIFY
 * placeholder, and a real date. A URL is not a source for a number. Two entries stated "Order 56
 * runs 60 days from when the grounds first arose" while citing an Ombudsman page and a housing
 * department front page — neither body sets that period — and the old gate passed both.
 *
 * A stated period now also has to name the instrument it comes from and say what starts the
 * clock, because a period with no trigger cannot be counted and a period with no instrument
 * cannot be checked. Both are hard failures.
 *
 * The third half — that the entry's own sourceUrl must point at the provision rather than at a
 * site's front page — is a WARNING for now, because the entries carrying figures have to be
 * repointed before it can bite without stopping the build. Entries that move to the structured
 * stage model below get the hard version of all three.
 */
// A named legal instrument: an Act with a year, a numbered Order/rule/regulation, or a section.
const namesInstrument = (s) =>
  typeof s === "string" &&
  /\bact\s+\d{4}\b|\b(order|rule|regulation|reg)s?\s+\d+|\bss?\s?\d+\b/i.test(s);

// What starts the clock. "30 days" is unusable without it.
const statesTrigger = (s) =>
  typeof s === "string" &&
  /\b(from|after|starting)\s+(when|the\s+(day|date|decision|notice|reasons|letter))|\bruns?\s+from\b|\bwithin\s+\d+[^.]*\bof\b/i.test(s);

// A bare origin — the front page of a site, not the page that carries the rule.
const isFrontPage = (u) => typeof u === "string" && /^https?:\/\/[^/]+\/?$/i.test(u);

/**
 * Per-stage records, once the layer grows them. Recognised structurally rather than by field
 * name — any array of objects carrying a `stage` key — so this bites the moment the schema
 * lands, whatever the field ends up being called.
 */
function stageRecords(entry) {
  const out = [];
  for (const [field, value] of Object.entries(entry)) {
    if (!Array.isArray(value)) continue;
    for (const [i, item] of value.entries()) {
      if (item && typeof item === "object" && !Array.isArray(item) && "stage" in item)
        out.push({ where: `${field}[${i}]`, item });
    }
  }
  return out;
}

const firstString = (obj, keys) => {
  for (const k of keys) if (typeof obj[k] === "string" && obj[k].trim()) return obj[k];
  return "";
};

function daysSince(iso) {
  const then = new Date(iso + "T00:00:00Z").getTime();
  return (Date.now() - then) / (1000 * 60 * 60 * 24);
}

/**
 * Release control: a file must never claim `status: verified` while its own prose says it is
 * not. Three entries shipped that way — "verified" in the field, "SEED … every figure is a
 * placeholder until a supervising lawyer verifies it" in the note — and each half looked right
 * on its own, which is exactly why it survived review until a QA pass read both.
 *
 * Matches PRESENT-TENSE claims of unverified status only. A historical note ("this WAS a seed
 * and was verified on …") is the correct way to record provenance and must keep passing.
 */
const UNVERIFIED_CLAIMS = [
  /is still a VERIFY placeholder/i,
  /placeholders only until/i,
  /every figure is a placeholder/i,
  /not yet (?:signed off|verified)/i,
  /^SEED\b/im,
];

function checkStatusHonesty(id, status, body) {
  if (status !== "verified") return;
  for (const re of UNVERIFIED_CLAIMS) {
    const m = body.match(re);
    if (m) {
      hard.push(
        `${id}: status is "verified" but the file says "${m[0].trim()}". ` +
          `A file must not claim verified and unverified at once — reconcile before launch.`,
      );
      return;
    }
  }
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

  // Status honesty runs over the SOURCE files: the built index carries frontmatter only, and
  // the contradiction we are guarding against lives in the prose underneath it.
  if (existsSync(SRC)) {
    for (const file of readdirSync(SRC).filter((f) => f.endsWith(".md"))) {
      const raw = readFileSync(resolve(SRC, file), "utf8");
      const lines = raw.split(/\r?\n/);
      const fences = [];
      lines.forEach((l, i) => { if (l.trim() === "---") fences.push(i); });
      const front = fences.length >= 2 ? lines.slice(fences[0] + 1, fences[1]).join("\n") : "";
      const body = fences.length >= 2 ? lines.slice(fences[1] + 1).join("\n") : raw;
      const m = front.match(/^status:[ \t]*(\S+)/m);
      checkStatusHonesty(`data/pathways/${file}`, m ? m[1] : "", body);
    }
  }

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
    // verified entry with a real (non-VERIFY) source + date, and it must name its instrument
    // and its trigger (see the block below and the note at the top of this file).
    // An example says: the Act this entry names governs that decision, the review body is
    // right for it, the reasons request addresses the right decision-maker, and the help
    // services actually help with it. That is a coverage claim, so it needs the same
    // verification as any other claim — and it may never carry a time figure of its own.
    const examples = Array.isArray(e.examples) ? e.examples : [];
    if (examples.length && !(verified && realSource && realDate)) {
      hard.push(
        `${id}: declares examples but is not verified+sourced — an example is a coverage claim`,
      );
    }
    for (const x of examples) {
      if (hasTimeFigure(x)) hard.push(`${id}: example must not state a time figure: "${x}"`);
    }

    if (hasTimeFigure(e.deadlineRule)) {
      if (!(verified && realSource && realDate)) {
        hard.push(
          `${id}: deadlineRule states a numeric time figure but the entry is not verified+sourced — never show an unsourced deadline number`,
        );
      }
      if (!namesInstrument(e.deadlineRule)) {
        hard.push(
          `${id}: deadlineRule states a time figure without naming the Act, rule or order it comes from — a URL is not a source for a number`,
        );
      }
      if (!statesTrigger(e.deadlineRule)) {
        hard.push(
          `${id}: deadlineRule states a time figure without saying what starts the clock — a period nobody can count is worse than no period`,
        );
      }
      if (isFrontPage(e.sourceUrl)) {
        warn.push(
          `${id}: deadlineRule states a time figure but sourceUrl (${e.sourceUrl}) is a site front page — repoint it at the provision that carries the rule`,
        );
      }
    }

    // Structured per-stage records: hard from the moment they exist. Once a stage carries its
    // own period, the period's instrument, trigger and source effective date belong on the
    // stage — not buried in a sentence covering internal review, tribunal and court alike.
    for (const { where, item } of stageRecords(e)) {
      const text = Object.values(item).filter((v) => typeof v === "string").join(" ");
      if (!hasTimeFigure(text)) continue;
      const provision = firstString(item, ["provision", "sourceProvision", "source"]);
      const trigger = firstString(item, ["trigger", "startsFrom", "clockStarts"]);
      const effective = firstString(item, ["sourceEffectiveDate", "effectiveDate", "sourceVersion"]);
      if (!namesInstrument(provision))
        hard.push(`${id} ${where}: states a time figure without a provision-level source`);
      if (!trigger) hard.push(`${id} ${where}: states a time figure without a trigger`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(effective))
        hard.push(
          `${id} ${where}: states a time figure without the source's effective date (YYYY-MM-DD)`,
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

    // Match the MARKER, not the word. This was /verify/gi, so an entry note saying "the
    // reviewer asked us to verify the stage limits" reported itself as an unresolved
    // placeholder. A count that cries wolf is worse than no count: this one exists so a
    // human knows exactly how much is still unconfirmed before launch.
    verifyMarkers += (JSON.stringify(e).match(/\bVERIFY\b/g) ?? []).length;
  }

  // A stage record, once present, must be complete and provision-sourced.
  //
  // The schema requires the fields; this requires them to be worth having. A stage is a
  // statement about procedure that a person acts on — the wrong trigger or a missing
  // extension power costs someone a right — so a half-filled stage is more dangerous than no
  // stage at all. Nothing here fires while `stages` is empty, which it is on every entry
  // until a supervising lawyer supplies the content.
  const FRONT_PAGE = /^https?:\/\/[^/]+\/?$/;
  for (const e of entries) {
    for (const [i, st] of (e.stages ?? []).entries()) {
      const at = `${e.id}: stages[${i}] (${st.name ?? "unnamed"})`;
      if (!st.source?.provision) hard.push(`${at}: needs the provision that carries the rule`);
      if (FRONT_PAGE.test(st.source?.url ?? "")) {
        hard.push(`${at}: source.url is a site front page — point it at the provision`);
      }
      if (!st.trigger) hard.push(`${at}: needs the event the period runs from`);
      if (!e.approval?.lawyerApprover) {
        hard.push(`${at}: a stage may not ship without a named lawyer approver on the entry`);
      }
    }
  }

  if (warn.length) console.warn("data-check warnings:\n  " + warn.join("\n  "));
  console.log(`data-check: ${entries.length} entries; ${verifyMarkers} VERIFY marker(s) for the lawyer to confirm before launch.`);

  // The sign-off and structure ledger, printed every build for the same reason the legal one
  // is: `status: verified` on this layer meant "figures checked against a website", never
  // "a lawyer signed this", and one label reading as both is how unsigned procedure came to
  // look confirmed.
  const noApprover = entries.filter((e) => !e.approval?.lawyerApprover).map((e) => e.id);
  const noStages = entries.filter((e) => (e.stages ?? []).length === 0).map((e) => e.id);
  console.log(
    `data-check sign-off: ${entries.length - noApprover.length}/${entries.length} entries have a named lawyer approver.`,
  );
  if (noApprover.length) console.log(`  awaiting sign-off: ${noApprover.join(", ")}`);
  if (noStages.length) {
    console.log(
      `  still a single deadline rule rather than per-stage procedure (${noStages.length}): ${noStages.join(", ")}`,
    );
  }

  if (hard.length) {
    console.error("\ndata-check FAILED (safety):\n  " + hard.join("\n  "));
    process.exit(1);
  }
  console.log("data-check OK (no safety violations).");
}

main();
