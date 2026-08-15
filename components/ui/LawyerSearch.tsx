import { useTranslations } from "next-intl";
import { LIV_URL, lawyerSearchUrl } from "@/lib/help/services";

/**
 * Tier 3 of "get help" (PRD §6.7 escalation): private lawyers. Points to the Law
 * Institute of Victoria's referral service and a live, matter-tailored web search.
 * No endorsement of any firm — these are neutral entry points the user controls.
 *
 * Deliberately the flattest card on the page (hairline, no sticker shadow, no tilt):
 * paid help is clearly secondary to the free services above it.
 */
export function LawyerSearch({ term }: { term: string }) {
  const t = useTranslations("help");
  return (
    <section className="rounded-card border border-line bg-paper p-5 sm:p-6">
      <h3 className="font-display text-[19px] font-extrabold text-ink">{t("privateTitle")}</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{t("privateIntro")}</p>
      <ul className="mt-3.5 space-y-2.5">
        <li>
          <a
            href={LIV_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="link inline-flex min-h-[44px] items-center text-[15px]"
          >
            {t("livLabel")}
          </a>
        </li>
        <li>
          <a
            href={lawyerSearchUrl(term)}
            target="_blank"
            rel="noopener noreferrer"
            className="link inline-flex min-h-[44px] items-center text-[15px]"
          >
            {t("searchLabel")}
          </a>
        </li>
      </ul>
    </section>
  );
}
