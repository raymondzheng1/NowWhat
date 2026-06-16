import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { GetHelp } from "@/components/ui/GetHelp";
import { getEntry, FALLBACK_ENTRY_ID } from "@/lib/corpus/index";

export const metadata: Metadata = {
  title: "Get free help",
  description: "Free, independent legal services that can help with a government decision.",
  alternates: { canonical: "/help" },
};

export default function HelpPage() {
  const t = useTranslations("help");
  const general = getEntry(FALLBACK_ENTRY_ID)?.getHelp ?? [];
  return (
    <div className="container-prose py-10">
      <h1 className="font-display text-3xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-2 mb-6 text-ink-soft">{t("intro")}</p>
      <GetHelp services={general} title={t("general")} />
    </div>
  );
}
