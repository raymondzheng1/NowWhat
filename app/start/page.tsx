import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { listEntries } from "@/lib/corpus/index";
import { toEntrySummary } from "@/lib/corpus/summary";
import { WizardClient } from "@/components/feature/WizardClient";

export const metadata: Metadata = {
  title: "Work out what you can do",
  description:
    "Answer a couple of quick questions about a Victorian government decision and get your options, the time limit, a draft, and free help — in plain English.",
  alternates: { canonical: "/start" },
};

// Show the most common, specific areas first; the generic guide last.
const ORDER = ["vic-renting", "vic-fines", "vic-public-housing", "vic-generic"];

export default async function StartPage() {
  const t = await getTranslations("wizard");
  const entries = listEntries()
    .map(toEntrySummary)
    .sort((a, b) => {
      const ia = ORDER.indexOf(a.id);
      const ib = ORDER.indexOf(b.id);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

  return (
    <div className="container-prose py-10">
      <h1 className="font-display text-3xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-2 mb-6 text-ink-soft">{t("intro")}</p>
      <WizardClient entries={entries} />
    </div>
  );
}
