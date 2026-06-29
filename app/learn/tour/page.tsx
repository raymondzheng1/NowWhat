import type { Metadata } from "next";
import { listProcesses, getComparison, listGrounds } from "@/lib/legal";
import { LearnContainer } from "@/components/feature/learn/LearnContainer";
import { LearnTrust } from "@/components/feature/learn/LearnTrust";
import { LearnTour } from "@/components/feature/learn/LearnTour";

export const metadata: Metadata = {
  title: "A 2-minute tour of how review works",
  description:
    "A calm, step-by-step walkthrough of how to challenge a government decision: merits review, judicial review, which fits, and the grounds people raise. General information, not advice.",
  alternates: { canonical: "/learn/tour" },
};

export default function TourPage() {
  return (
    <LearnContainer
      breadcrumb={[
        { name: "Home", href: "/" },
        { name: "How review works", href: "/learn" },
        { name: "2-minute tour", href: "/learn/tour" },
      ]}
    >
      <LearnTour processes={listProcesses()} comparison={getComparison()} grounds={listGrounds()} />
      <LearnTrust />
    </LearnContainer>
  );
}
