import type { Metadata } from "next";
import { getProcess } from "@/lib/legal";
import { ProcessRoute } from "@/components/feature/learn/ProcessRoute";

const p = getProcess("judicial-review")!;

export const metadata: Metadata = {
  title: "Judicial review explained",
  description: `${p.oneLine} Plain-English guide to judicial review in the Supreme Court of Victoria and the Federal Court — legality, grounds, and remedies. General information, not advice.`,
  alternates: { canonical: "/learn/judicial-review" },
};

export default function JudicialReviewPage() {
  return <ProcessRoute id="judicial-review" />;
}
