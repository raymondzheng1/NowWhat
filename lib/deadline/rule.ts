import { isVerifyMarker, type DataPathway } from "@/lib/schemas/data";

/**
 * Time-limit NOTE for the procedural data layer.
 *
 * Product decision (2026-06-30, with legal sign-off): time limits are NOT a headline for
 * our users. We do not chase exact day-counts or show a prominent countdown. Instead we
 * state the GENERIC rule briefly and point to the relevant Act + free help, as one modest
 * line inside the analysis (never on the homepage, never a computed countdown).
 *
 * So this view always returns a short, safe rule (the entry's generic Act-referencing
 * text, or a generic fallback if an entry still holds a VERIFY placeholder) plus an
 * official source link when one is real.
 *
 * (Distinct from lib/deadline/compute.ts, which serves the legacy Now What? decode corpus.)
 */

export interface DeadlineRuleView {
  /** A brief, generic statement of the time-limit rule (names the relevant Act where known). */
  rule: string;
  /** Official source link, when real (null while a source is still a placeholder). */
  sourceUrl: string | null;
}

const GENERIC_RULE =
  "Most reviews have a strict time limit, set by the law for your decision. Check it with the official body or a free service.";

export function deadlineRuleView(e: DataPathway): DeadlineRuleView {
  return {
    rule: isVerifyMarker(e.deadlineRule) ? GENERIC_RULE : e.deadlineRule,
    sourceUrl: isVerifyMarker(e.sourceUrl) ? null : e.sourceUrl,
  };
}

/** The four paths a person can work through in /start. */
export type RulePath = "internal-review" | "merits-review" | "court-election" | "judicial-review";

/**
 * Where an entry's rule turns to the Supreme Court. Everything from here on is about judicial
 * review — Order 56's sixty days, the Administrative Law Act's thirty, and that trying another
 * path first does not restart "either clock".
 */
const COURT_PART = /\s*If you are looking at the Supreme Court instead\b[\s\S]*$/;

/**
 * The entry's rule, as it applies to the path being worked through — verbatim, never reworded.
 *
 * The rule for a general Victorian decision and for public housing ends with the Supreme
 * Court's time limits. On a VCAT or internal-review analysis those were the ONLY figures in the
 * time-limit block, so a person applying to VCAT read "60 days" and "30 days" as their limit
 * (the merits-review benchmark, 2026-10-31). Off the judicial-review path the court sentences
 * are left out; on it, the whole rule shows. The words that remain are the entry's own.
 */
export function ruleForPath(rule: string, path?: RulePath | null): string {
  if (!path || path === "judicial-review") return rule;
  return rule.replace(COURT_PART, "").trim() || rule;
}

const DOMAIN = /\b((?:[a-z0-9-]+\.)+gov\.au)\b/i;

/**
 * The official link for the path being worked through.
 *
 * Each entry has ONE official link, and for a general Victorian decision it is the Supreme
 * Court's — printed as "Official source" on an analysis of a VCAT application. Each avenue
 * names its own source; where that names a government website, this links to it (the entry's
 * own exact URL when it is the same site). Where the avenue names none, there is no link
 * rather than a wrong one.
 */
export function officialSourceForPath(e: DataPathway, path?: RulePath | null): string | null {
  const fallback = isVerifyMarker(e.sourceUrl) ? null : e.sourceUrl;
  if (!path) return fallback;
  const av =
    path === "internal-review"
      ? e.avenue.ir
      : path === "merits-review"
        ? e.avenue.mr
        : path === "court-election"
          ? e.avenue.court
          : e.avenue.jr;
  const src = av?.source ?? "";
  const domain = DOMAIN.exec(src)?.[1]?.toLowerCase().replace(/^www\./, "");
  if (!domain) return null;
  if (fallback && new URL(fallback).hostname.replace(/^www\./, "") === domain) return fallback;
  return `https://www.${domain}`;
}
