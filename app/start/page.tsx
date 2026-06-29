import type { Metadata } from "next";
import { RightsSaverClient } from "@/components/feature/RightsSaverClient";
import { getProcess, groundsForProcess } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Work out what you can do",
  description:
    "Answer a few plain questions about a government decision (Victoria or Commonwealth) and get the review path, the time-limit rule, a draft request for reasons, and free help — in plain English. Nothing you enter is stored.",
  alternates: { canonical: "/start" },
};

export default function StartPage() {
  // M-Lean "Rights Saver" — the deterministic triage → deadline-rule → reasons → handoff
  // flow (no model spend). Replaces the old wizard as the primary path. Renders its own
  // focused shell (the marketing chrome + chat launcher are hidden on /start via SiteShell).
  // The Learn concept layer (processes + judicial-review grounds) is passed in from the
  // server so the result can explain the options in-flow and compile selected grounds.
  return (
    <RightsSaverClient
      meritsReview={getProcess("merits-review")!}
      judicialReview={getProcess("judicial-review")!}
      jrGrounds={groundsForProcess("judicial-review")}
    />
  );
}
