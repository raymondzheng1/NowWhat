import { describe, it } from "vitest";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { getDataEntry } from "@/lib/data";
import { getEntry } from "@/lib/corpus/index";
import { getProcess, listGrounds, listConcepts } from "@/lib/legal";
import { avenueView } from "@/lib/triage";
import { planFor, type PathId } from "@/lib/analysis";
import { composeMemo, memoPathName } from "@/lib/memo/compose";
import { buildMemoContext } from "@/lib/memo/context";
import { composeLetter } from "@/lib/letter/compose";
import type { DraftKind } from "@/lib/draft/build";
import { groundAppliesIn } from "@/lib/schemas/legal";
import messages from "@/lib/i18n/messages/en.json";

/**
 * THE BENCH: run the app's own pipeline on a scenario, offline, and write what it produces.
 *
 * For benchmarking the analysis and letters against worked answers. It mirrors what
 * `components/feature/RightsSaverClient.tsx` computes for the analysis step — the plan, the
 * chosen path, the criteria, the marked grounds, the full notes (`composeMemo`), the context
 * the model is shown (`buildMemoContext`), the deterministic letter (`composeLetter`) — and
 * writes the EXACT request bodies the page would POST to /api/memo and /api/letter-polish, so
 * the model-written parts can be fetched live from the same inputs.
 *
 * Skipped unless BENCH_INPUT names a scenario file, so it never runs in `npm run verify`.
 *   BENCH_INPUT=path/to/scenario.json BENCH_OUTPUT=path/to/dir npx vitest run tests/bench
 *
 * Scenario JSON:
 *   { "entryId": "vic-generic", "pathId": "judicial-review", "story": "...",
 *     "groundIds": ["procedural-fairness-hearing"], "groundNotes": { "<groundId>": "..." },
 *     "criteriaNotes": { "<criterion text>": "..." }, "internalNote": "...",
 *     "goals": ["..."], "decisionDate": "2026-05-15" }
 */

const INPUT = process.env.BENCH_INPUT;
const OUTPUT = process.env.BENCH_OUTPUT ?? resolve(__dirname, "out");

const R = messages.rights as unknown as Record<string, string>;
const L = messages.letter as unknown as Record<string, string>;
const t = (k: string) => R[k] ?? k;

const LETTER_KIND: Record<PathId, DraftKind> = {
  "internal-review": "internal-review-request",
  "merits-review": "merits-review-application",
  "court-election": "court-election-enquiry",
  "judicial-review": "judicial-review-application",
};
const INTERNAL_NOTE_KEY = "What you are asking them to look at again";

interface Scenario {
  entryId: string;
  pathId: PathId;
  story: string;
  groundIds?: string[];
  groundNotes?: Record<string, string>;
  criteriaNotes?: Record<string, string>;
  internalNote?: string;
  goals?: string[];
  decisionDate?: string;
}

describe.skipIf(!INPUT)("bench", () => {
  it("runs the pipeline on the scenario", () => {
    const s = JSON.parse(readFileSync(INPUT!, "utf8")) as Scenario;
    const entry = getDataEntry(s.entryId);
    if (!entry) throw new Error(`no data entry ${s.entryId}`);
    const merits = getProcess("merits-review")!;
    const judicial = getProcess("judicial-review")!;
    const jurisdiction = entry.jurisdiction;

    const plan = planFor({
      avenue: avenueView(entry),
      meritsReview: merits,
      judicialReview: judicial,
      jurisdiction,
      criteria: entry.mrCriteria ?? [],
      internalCriteria: entry.irCriteria ?? [],
      courtCriteria: entry.courtCriteria ?? [],
    });
    const path = plan.paths.find((p) => p.id === s.pathId);
    if (!path) throw new Error(`path ${s.pathId} is not open for ${s.entryId}: ${plan.paths.map((p) => p.id).join(", ")}`);

    const concepts = listConcepts().filter((c) => c.jurisdictions.length === 0 || c.jurisdictions.includes(jurisdiction));
    const internal = concepts.find((c) => c.id === "internal-review") ?? null;
    const process = s.pathId === "internal-review" ? null : s.pathId === "judicial-review" ? judicial : merits;
    const shownGrounds = listGrounds().filter((g) => groundAppliesIn(g, jurisdiction));
    const grounds = s.pathId === "judicial-review" ? shownGrounds.filter((g) => (s.groundIds ?? []).includes(g.id)) : [];
    const criteriaNotes = { ...(s.criteriaNotes ?? {}), ...(s.internalNote ? { [INTERNAL_NOTE_KEY]: s.internalNote } : {}) };
    const pathName = memoPathName({
      process,
      internal: s.pathId === "internal-review" ? internal : null,
      character: path.character ?? "tribunal",
      t,
    });
    const forum = path.body || process?.plainName || t("pathTitleInternal");

    const memo = composeMemo({
      entry,
      process,
      internal: s.pathId === "internal-review" ? internal : null,
      internalNote: s.internalNote ?? "",
      standing: s.pathId === "internal-review" ? null : (concepts.find((c) => c.id === "standing") ?? null),
      justiciability: concepts.find((c) => c.id === "justiciability") ?? null,
      character: path.character ?? "tribunal",
      criteria: path.criteria ?? [],
      grounds,
      groundNotes: s.groundNotes ?? {},
      criteriaNotes,
      story: s.story,
      goals: s.goals ?? [],
      goalOther: "",
      decisionDate: s.decisionDate,
      forum,
      pathId: s.pathId,
      paths: plan.paths.map((pp) => ({
        name:
          pp.id === "internal-review"
            ? t("pathTitleInternal")
            : pp.id === "judicial-review"
              ? judicial.name
              : pp.id === "court-election"
                ? t("pathTitleCourtElection")
                : pp.character === "tribunal"
                  ? merits.name
                  : t("pathTitleNotTribunal"),
        body: pp.body,
        question: pp.question,
        conditional: pp.conditional,
        chosen: pp.id === s.pathId,
      })),
      t,
    });

    const context = buildMemoContext({
      entry,
      process: s.pathId === "judicial-review" ? judicial : s.pathId === "merits-review" ? merits : null,
      internal: s.pathId === "internal-review" ? internal : null,
      grounds,
      criteria: path.criteria ?? [],
      forum,
      pathName,
      pathId: s.pathId,
    });

    const corpusEntry = getEntry(s.entryId);
    const letter = corpusEntry
      ? composeLetter({
          entry: corpusEntry,
          kind: LETTER_KIND[s.pathId],
          account: {
            answers: {
              "q-story": s.story,
              "q-internal": (s.internalNote ?? "").trim(),
              "q-criteria": Object.values(s.criteriaNotes ?? {}).map((v) => v.trim()).filter(Boolean).join("\n\n"),
              ...Object.fromEntries(
                Object.entries(s.groundNotes ?? {})
                  .filter(([id, v]) => (s.groundIds ?? []).includes(id) && v.trim())
                  .map(([id, v]) => [`g-${id}`, v.trim()]),
              ),
            },
            groundIds: s.groundIds ?? [],
          },
          headingFor: (k) => L[k] ?? k,
          groundsLead: L.groundsLead ?? "",
          otherConcerns: L.otherConcerns ?? "",
          universal: [
            { id: "q-story", label: R.accountQStory ?? "What happened?" },
            { id: "q-internal", label: L.internalHeading ?? INTERNAL_NOTE_KEY },
            { id: "q-criteria", label: L.criteriaHeading ?? "" },
          ],
          decisionDate: s.decisionDate,
        })
      : null;

    const notes: Record<string, string> = {};
    for (const [k, v] of Object.entries(s.groundNotes ?? {})) if (v.trim()) notes[k] = v;
    for (const [k, v] of Object.entries(criteriaNotes)) if (v.trim()) notes[k] = v;

    mkdirSync(OUTPUT, { recursive: true });
    writeFileSync(resolve(OUTPUT, "full_notes.txt"), memo.body, "utf8");
    writeFileSync(resolve(OUTPUT, "model_context.txt"), context, "utf8");
    writeFileSync(resolve(OUTPUT, "letter_draft.txt"), letter?.body ?? "(no letter for this entry)", "utf8");
    writeFileSync(
      resolve(OUTPUT, "memo_request.json"),
      JSON.stringify(
        {
          entryId: s.entryId,
          pathId: s.pathId,
          forum,
          pathName,
          groundIds: s.groundIds ?? [],
          criteria: path.criteria ?? [],
          story: s.story,
          notes,
          goals: s.goals ?? [],
        },
        null,
        2,
      ),
      "utf8",
    );
    writeFileSync(
      resolve(OUTPUT, "letter_request.json"),
      JSON.stringify({ entryId: s.entryId, draft: letter?.body ?? "", theirWords: s.story }, null, 2),
      "utf8",
    );
    writeFileSync(
      resolve(OUTPUT, "plan.json"),
      JSON.stringify({ paths: plan.paths.map((p) => ({ id: p.id, body: p.body, character: p.character, criteria: p.criteria })) }, null, 2),
      "utf8",
    );
  });
});
