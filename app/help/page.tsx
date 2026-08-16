import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { GetHelp } from "@/components/ui/GetHelp";
import { LawyerSearch } from "@/components/ui/LawyerSearch";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrivacyNote } from "@/components/ui/PrivacyNote";
import { directoryByTier } from "@/lib/help/services";

export const metadata: Metadata = {
  title: "Free legal help with a government decision",
  description:
    "Free, independent help with a Commonwealth or Victorian government decision: tribunals (ART, VCAT), the Ombudsman, Victoria Legal Aid, community legal centres, and how to find a lawyer.",
  alternates: { canonical: "/help" },
};

/**
 * The tiered directory (sticker album). Each tier is a standalone card, so each gets a
 * small deterministic tilt — free help first (green), then the paid-lawyer tier, which
 * stays square and quiet at the bottom of the page.
 */
export default function HelpPage() {
  const t = useTranslations("help");
  return (
    <div className="container-prose py-12 sm:py-16">
      <PageHeader kicker={t("kicker")} title={t("title")} lead={t("intro")} />

      <div className="mt-10 space-y-7">
        <div className="-rotate-0.7">
          <GetHelp services={directoryByTier("government")} title={t("government")} />
        </div>
        <div className="rotate-0.6">
          <GetHelp services={directoryByTier("legal")} title={t("legal")} />
        </div>
        <LawyerSearch term="government decisions" />
      </div>

      <PrivacyNote className="mt-10 text-ink-faint" />
    </div>
  );
}
