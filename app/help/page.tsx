import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { GetHelp } from "@/components/ui/GetHelp";
import { LawyerSearch } from "@/components/ui/LawyerSearch";
import { directoryByTier } from "@/lib/help/services";

export const metadata: Metadata = {
  title: "Get free help",
  description:
    "Free, independent Victorian services that can help with a government decision: tribunals, the Ombudsman, Victoria Legal Aid, community legal centres, and how to find a lawyer.",
  alternates: { canonical: "/help" },
};

export default function HelpPage() {
  const t = useTranslations("help");
  return (
    <div className="container-prose py-10">
      <h1 className="font-display text-3xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-2 mb-6 text-ink-soft">{t("intro")}</p>

      <div className="space-y-6">
        <GetHelp services={directoryByTier("government")} title={t("government")} />
        <GetHelp services={directoryByTier("legal")} title={t("legal")} />
        <LawyerSearch term="government decisions" />
      </div>
    </div>
  );
}
