import type { Metadata } from "next";
import { getProcess } from "@/lib/legal";
import { ProcessRoute } from "@/components/feature/learn/ProcessRoute";

const p = getProcess("merits-review")!;

export const metadata: Metadata = {
  title: "Merits review explained",
  description: `${p.oneLine} Plain-English guide to merits review at VCAT and the ART — what it is, who hears it, and what it can do. General information, not advice.`,
  alternates: { canonical: "/learn/merits-review" },
};

export default function MeritsReviewPage() {
  return <ProcessRoute id="merits-review" />;
}
