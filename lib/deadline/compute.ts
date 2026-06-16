import type { PathwayEntry } from "@/lib/schemas/corpus";
import { deadlineIsRenderable } from "@/lib/schemas/corpus";
import { now } from "@/lib/time/clock";

/**
 * Deadline computation (PRD §6.4 — the "Deadline Guardian"). A concrete date is only
 * ever produced when the pathway's deadline is VERIFIED + SOURCED. Otherwise we return
 * an honest "a time limit applies — confirm it" result and the UI routes to help.
 * This is the never-state-an-unsourced-deadline guarantee at the compute layer.
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function addDaysUtc(isoDate: string, days: number): Date {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export type DeadlineResult =
  | {
      renderable: true;
      pathwayName: string;
      body: string;
      days: number;
      howCounted?: string;
      deadlineDate: string; // YYYY-MM-DD
      daysRemaining: number; // from now() — may be negative (already passed)
      passed: boolean;
      source: string;
    }
  | {
      renderable: false;
      pathwayName: string;
      body: string;
      /** Plain message shown instead of a fabricated date. */
      message: string;
    };

export function computeDeadline(
  entry: PathwayEntry,
  pathwayName: string,
  decisionDate: string,
): DeadlineResult | null {
  const pathway = entry.pathways.find((p) => p.name === pathwayName);
  if (!pathway) return null;

  if (!deadlineIsRenderable(pathway)) {
    return {
      renderable: false,
      pathwayName: pathway.name,
      body: pathway.body,
      message:
        "A time limit applies to this step, but we don't yet have a confirmed figure to count from. A free legal service can confirm the exact date for your situation — and it's best to act sooner rather than later.",
    };
  }

  const days = pathway.deadlineDays as number;
  const deadline = addDaysUtc(decisionDate, days);
  const deadlineDate = deadline.toISOString().slice(0, 10);
  const todayMidnightUtc = new Date(now().toISOString().slice(0, 10) + "T00:00:00Z");
  const daysRemaining = Math.round((deadline.getTime() - todayMidnightUtc.getTime()) / MS_PER_DAY);

  return {
    renderable: true,
    pathwayName: pathway.name,
    body: pathway.body,
    days,
    howCounted: pathway.howCounted,
    deadlineDate,
    daysRemaining,
    passed: daysRemaining < 0,
    source: pathway.source,
  };
}
