import type { PathwayEntry, HelpService } from "@/lib/schemas/corpus";
import { deadlineIsRenderable } from "@/lib/schemas/corpus";

/**
 * The client-safe view of a corpus entry returned by the API. Pure corpus content
 * (the trust surface) — never user input.
 */
export interface PathwaySummary {
  name: string;
  body: string;
  deadline: string;
  howCounted?: string;
  howToStart: string;
  cost?: string;
  source: string;
  deadlineRenderable: boolean;
}

export interface EntrySummary {
  id: string;
  title: string;
  jurisdiction: string;
  status: "seed" | "verified";
  reviewable: { value: string; basis: string };
  rightToReasons: { available: string; how: string; provision: string };
  pathways: PathwaySummary[];
  groundsOrCriteria: string[];
  evidenceChecklist: string[];
  getHelp: HelpService[];
  sources: string[];
  lastVerified: string | null;
}

export function toEntrySummary(e: PathwayEntry): EntrySummary {
  return {
    id: e.id,
    title: e.title,
    jurisdiction: e.jurisdiction,
    status: e.status,
    reviewable: { value: e.reviewable.value, basis: e.reviewable.basis },
    rightToReasons: {
      available: e.rightToReasons.available,
      how: e.rightToReasons.how,
      provision: e.rightToReasons.provision,
    },
    pathways: e.pathways.map((p) => ({
      name: p.name,
      body: p.body,
      deadline: p.deadline,
      howCounted: p.howCounted,
      howToStart: p.howToStart,
      cost: p.cost,
      source: p.source,
      deadlineRenderable: deadlineIsRenderable(p),
    })),
    groundsOrCriteria: e.groundsOrCriteria,
    evidenceChecklist: e.evidenceChecklist,
    getHelp: e.getHelp,
    sources: e.sources,
    lastVerified: e.lastVerified,
  };
}
