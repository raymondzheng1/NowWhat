import { planFor, type ResultPlan } from "@/lib/analysis";
import { avenueView, type AvenueView } from "@/lib/triage";
import { deadlineRuleView } from "@/lib/deadline/rule";
import { getDataEntry } from "@/lib/data";

/**
 * Join the decode corpus to the procedural data layer.
 *
 * /decode and /ask answer against the legacy decode corpus (`corpus/index.json`), while the
 * analysis layer is driven by the lawyer-verified procedural layer (`data/index.json`).
 * The ids overlap deliberately — cth-centrelink, vic-fines, vic-generic, vic-public-housing,
 * vic-renting — so a letter we could explain can also carry the same "what this means for
 * you" that the guided flow gives. Returns null when there is no procedural entry, and the
 * result simply omits the analysis rather than inventing one.
 *
 * Computed on the server from committed indexes: no model, and nothing derived from the
 * person's letter passes through here.
 */
export interface CorpusAnalysis {
  plan: ResultPlan;
  avenue: AvenueView;
  deadline: { rule: string; sourceUrl?: string | null };
}

export function analysisForCorpusEntry(
  entryId: string,
  meritsReview: Parameters<typeof planFor>[0]["meritsReview"],
  judicialReview: Parameters<typeof planFor>[0]["judicialReview"],
): CorpusAnalysis | null {
  const entry = getDataEntry(entryId);
  if (!entry) return null;
  const avenue = avenueView(entry);
  const dl = deadlineRuleView(entry);
  return {
    plan: planFor({ avenue, meritsReview, judicialReview, jurisdiction: entry.jurisdiction }),
    avenue,
    deadline: { rule: dl.rule, sourceUrl: dl.sourceUrl },
  };
}
