import type { Metadata } from "next";
import { AskClient } from "@/components/feature/AskClient";
import { getFaqsForEntry } from "@/lib/faq/load";
import { listEntries } from "@/lib/corpus/index";
import { listDataEntries } from "@/lib/data/index";

export const metadata: Metadata = {
  title: "Ask a question about a government decision",
  description:
    "Ask about a Commonwealth or Victorian government decision in your own words. Plain-English answers on review options and time limits, each showing its official source.",
  alternates: { canonical: "/ask" },
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

export default function AskPage() {
  return <AskClient {...connections()} />;
}
