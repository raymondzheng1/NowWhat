import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { GetHelp } from "@/components/ui/GetHelp";
import { LawyerSearch } from "@/components/ui/LawyerSearch";
import { PageHeader } from "@/components/ui/PageHeader";
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
    <div className="container-prose py-12 sm:py-16">
      <PageHeader kicker={t("kicker")} title={t("title")} lead={t("intro")} />

      <div className="mt-10 space-y-6">
        <GetHelp services={directoryByTier("government")} title={t("government")} />
        <GetHelp services={directoryByTier("legal")} title={t("legal")} />
        <LawyerSearch term="government decisions" />
      </div>
    </div>
  );
}
