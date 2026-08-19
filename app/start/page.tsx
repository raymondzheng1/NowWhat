import type { Metadata } from "next";
import { RightsSaverClient } from "@/components/feature/RightsSaverClient";
import { getProcess, groundsForProcess, listConcepts } from "@/lib/legal";
import { listDataEntries } from "@/lib/data";
import { getFaqsForEntry } from "@/lib/faq/load";
import { listEntries } from "@/lib/corpus/index";

export const metadata: Metadata = {
  title: "Work out how to review a government decision",
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
  // Every FAQ article already names the pathway it was written for (frontmatter entryId),
  // so the answer library and this flow describe the same matters. Build the join here (a
  // server component can read the content directory) and hand it down, so the result can
  // offer the real questions people ask about THIS decision.
  const faqsByEntry = Object.fromEntries(
    listDataEntries().map((e) => [
      e.id,
      getFaqsForEntry(e.id).map((f) => ({ slug: f.slug, question: f.question })),
    ]),
  );

  // The application-letter drafts are built by a pure function over the decode corpus
  // entry, so we ship the entries themselves rather than calling an API: the Rights Saver
  // stays entirely client-side and nothing about the person's matter leaves the device.
  const corpusByEntry = Object.fromEntries(listEntries().map((e) => [e.id, e]));

  return (
    <RightsSaverClient
      corpusByEntry={corpusByEntry}
      faqsByEntry={faqsByEntry}
      meritsReview={getProcess("merits-review")!}
      judicialReview={getProcess("judicial-review")!}
      jrGrounds={groundsForProcess("judicial-review")}
      concepts={listConcepts()}
    />
  );
}
