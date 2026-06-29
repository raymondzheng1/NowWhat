import type { Metadata } from "next";
import { getComparison } from "@/lib/legal";
import { LearnContainer } from "@/components/feature/learn/LearnContainer";
import { LearnTrust } from "@/components/feature/learn/LearnTrust";
import { MrVsJr } from "@/components/feature/learn/MrVsJr";

export const metadata: Metadata = {
  title: "Merits review vs judicial review",
  description:
    "The difference between merits review and judicial review, side by side, with a calm guide to which one fits what you are hoping for. General information, not advice.",
  alternates: { canonical: "/learn/compare" },
};

export default function ComparePage() {
  const comparison = getComparison();
  return (
    <LearnContainer back={{ href: "/learn", label: "How review works" }}>
      <header className="max-w-[720px]">
        <p className="text-[11px] uppercase tracking-[0.22em] text-accent">Two paths</p>
        <h1 className="mt-3 font-display text-[34px] font-semibold leading-[1.06] text-ink sm:text-[44px]">
          Merits review vs judicial review
        </h1>
      </header>
      <div className="mt-8">
        <MrVsJr comparison={comparison} />
      </div>
      <LearnTrust />
    </LearnContainer>
  );
}
