import type { Metadata } from "next";
import { DecodeClient } from "@/components/feature/DecodeClient";
import { getFaqsForEntry } from "@/lib/faq/load";
import { listEntries } from "@/lib/corpus/index";
import { listDataEntries } from "@/lib/data/index";

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
  return { faqsByEntry, pathwayIds };
}

export default function DecodePage() {
  return <DecodeClient {...connections()} />;
}
