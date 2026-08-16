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
export default async function HelpPage({
  searchParams,
}: {
  searchParams: Promise<{ jur?: string }>;
}) {
  const { jur } = await searchParams;
  // The flow links here with ?jur=Cth|Vic so a Centrelink matter leads with the federal
  // services and a Victorian one leads with VCAT — rather than everyone getting Victoria.
  const lead: "Cth" | "Vic" = jur === "Cth" ? "Cth" : "Vic";
  const other: "Cth" | "Vic" = lead === "Cth" ? "Vic" : "Cth";
  return <HelpBody lead={lead} other={other} />;
}

function HelpBody({ lead, other }: { lead: "Cth" | "Vic"; other: "Cth" | "Vic" }) {
  const t = useTranslations("help");
  const label = (j: "Cth" | "Vic") => (j === "Cth" ? t("cthLabel") : t("vicLabel"));
  return (
    <div className="container-prose py-12 sm:py-16">
      <PageHeader kicker={t("kicker")} title={t("title")} lead={t("intro")} />

      <div className="mt-10 space-y-7">
        <div className="-rotate-0.7">
          <GetHelp
            services={directoryByTier("government", lead)}
            title={`${t("government")} — ${label(lead)}`}
          />
        </div>
        <div className="rotate-0.6">
          <GetHelp
            services={directoryByTier("legal", lead)}
            title={`${t("legal")} — ${label(lead)}`}
          />
        </div>

        {/* The other government's services stay one tap away — people are sometimes dealing
            with both, and nobody should have to guess which list they need. */}
        <details className="card">
          <summary className="cursor-pointer py-2 font-display text-[16px] font-extrabold text-ink">
            {t("otherJur", { jur: label(other) })}
          </summary>
          <div className="mt-5 space-y-6">
            <GetHelp
              services={directoryByTier("government", other)}
              title={`${t("government")} — ${label(other)}`}
            />
            <GetHelp
              services={directoryByTier("legal", other)}
              title={`${t("legal")} — ${label(other)}`}
            />
          </div>
        </details>

        <LawyerSearch term="government decisions" />
      </div>

      <PrivacyNote className="mt-10 text-ink-faint" />
    </div>
  );
}
