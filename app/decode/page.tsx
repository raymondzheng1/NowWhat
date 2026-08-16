import type { Metadata } from "next";
import { DecodeClient } from "@/components/feature/DecodeClient";
import { getFaqsForEntry } from "@/lib/faq/load";
import { listEntries } from "@/lib/corpus/index";
import { listDataEntries } from "@/lib/data/index";
import { analysisForCorpusEntry } from "@/lib/analysis/for-corpus";
import { getProcess } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Scan or paste a government decision letter",
  description:
    "Scan, upload, or paste a government decision letter and get a plain-English explanation, the review pathway, and the time limit. We never keep your letter.",
  alternates: { canonical: "/decode" },
};


/**
 * Server-side joins handed to the client result: the answers written for each decision
 * type, and which decision types have a procedural pathway (so we only offer the guided
 * flow when there is really something to walk into).
 */
function connections() {
  const faqsByEntry = Object.fromEntries(
    listEntries().map((e) => [
      e.id,
      getFaqsForEntry(e.id).map((f) => ({ slug: f.slug, question: f.question })),
    ]),
  );
  const pathwayIds = listDataEntries().map((e) => e.id);
  // The same "what this means for you" the guided flow gives, keyed by decision type. The
  // decode explains the LETTER; this explains the decision it is about.
  const merits = getProcess("merits-review")!;
  const judicial = getProcess("judicial-review")!;
  const analysisByEntry: Record<string, NonNullable<ReturnType<typeof analysisForCorpusEntry>>> =
    {};
  for (const e of listEntries()) {
    const a = analysisForCorpusEntry(e.id, merits, judicial);
    if (a) analysisByEntry[e.id] = a;
  }
  return { faqsByEntry, pathwayIds, analysisByEntry, merits, judicial };
}

export default function DecodePage() {
  return <DecodeClient {...connections()} />;
}
