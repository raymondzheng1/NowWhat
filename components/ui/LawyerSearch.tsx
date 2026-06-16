import { useTranslations } from "next-intl";
import { LIV_URL, lawyerSearchUrl } from "@/lib/help/services";

/**
 * Tier 3 of "get help" (PRD §6.7 escalation): private lawyers. Points to the Law
 * Institute of Victoria's referral service and a live, matter-tailored web search.
 * No endorsement of any firm — these are neutral entry points the user controls.
 */
export function LawyerSearch({ term }: { term: string }) {
  const t = useTranslations("help");
  return (
    <section className="rounded-card border border-line bg-paper p-5">
      <h3 className="font-display text-lg font-bold text-ink">{t("privateTitle")}</h3>
      <p className="mt-1 text-sm text-ink-soft">{t("privateIntro")}</p>
      <ul className="mt-3 space-y-2">
        <li>
          <a href={LIV_URL} target="_blank" rel="noopener noreferrer" className="link">
            {t("livLabel")}
          </a>
        </li>
        <li>
          <a
            href={lawyerSearchUrl(term)}
            target="_blank"
            rel="noopener noreferrer"
            className="link"
          >
            {t("searchLabel")}
          </a>
        </li>
      </ul>
    </section>
  );
}
