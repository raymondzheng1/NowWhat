import { classifyData, getDataEntry, fallbackId, fallbackEntry } from "@/lib/data";
import { isVerifyMarker, type DataPathway, type Jurisdiction } from "@/lib/schemas/data";

/**
 * Triage (PRD §3 step 1) — DETERMINISTIC, no model spend. Branches on WHO made the
 * decision (jurisdiction) and what kind it is, selects the procedural data entry, and
 * reports the avenue family: merits review (MR), judicial review (JR), or a dignified
 * "no review available" endpoint. The concrete deadline rule + reasons clock come from
 * the same data entry (rendered per lib/deadline/rule + lib/reasons — never a countdown).
 */

export interface TriageInput {
  /** Who made the decision: a Victorian or a Commonwealth body. */
  jurisdiction: Jurisdiction;
  /** The chosen decision area (e.g. "notice to vacate") and/or a short description. */
  decisionType?: string;
  text?: string;
}

export interface AvenueView {
  mrAvailable: boolean;
  mrBody: string;
  jrAvailable: boolean;
  jrForum: string;
  /** Set when there is a dignified endpoint instead of a review right. */
  noReviewEndpoint: string | null;
}

export interface TriageResult {
  entry: DataPathway;
  isFallback: boolean;
  jurisdiction: Jurisdiction;
  avenue: AvenueView;
}

function cleanForDisplay(s: string): string {
  // The body/forum strings may carry a trailing source/VERIFY note in seeds; show only
  // the plain name to the user (the source is rendered separately + honestly).
  return (s.split("(")[0] ?? s).replace(/\s*—\s*VERIFY.*$/i, "").trim();
}

/** Never show an endpoint that still contains a VERIFY placeholder (it's a full sentence,
 *  so we hide it rather than truncate — like the deadline/reasons views). */
function cleanEndpoint(s: string | null): string | null {
  return s && !isVerifyMarker(s) ? s : null;
}

/** The avenue family for a chosen entry (when the person picks an area explicitly). */
export function avenueView(entry: DataPathway): AvenueView {
  return {
    mrAvailable: entry.avenue.mr.available,
    mrBody: cleanForDisplay(entry.avenue.mr.body),
    jrAvailable: entry.avenue.jr.available,
    jrForum: cleanForDisplay(entry.avenue.jr.forum),
    noReviewEndpoint: cleanEndpoint(entry.avenue.noReviewEndpoint),
  };
}

export function triage(input: TriageInput): TriageResult {
  const hay = [input.decisionType, input.text].filter(Boolean).join(" ").trim();
  const c = hay
    ? classifyData(hay, input.jurisdiction)
    : { entryId: fallbackId(input.jurisdiction), isFallback: true, matched: [] };

  const entry = getDataEntry(c.entryId) ?? fallbackEntry(input.jurisdiction);
  if (!entry) {
    // Should never happen (a fallback always exists), but stay honest if it does.
    throw new Error(`triage: no data entry for ${input.jurisdiction}`);
  }

  return {
    entry,
    isFallback: c.isFallback,
    jurisdiction: input.jurisdiction,
    avenue: {
      mrAvailable: entry.avenue.mr.available,
      mrBody: cleanForDisplay(entry.avenue.mr.body),
      jrAvailable: entry.avenue.jr.available,
      jrForum: cleanForDisplay(entry.avenue.jr.forum),
      noReviewEndpoint: cleanEndpoint(entry.avenue.noReviewEndpoint),
    },
  };
}
