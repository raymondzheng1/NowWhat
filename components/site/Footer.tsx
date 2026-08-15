import Link from "next/link";
import { useTranslations } from "next-intl";
import { ReplayGuides } from "@/components/site/ReplayGuides";
import { Lock } from "@/components/ui/PrivacyNote";

/**
 * Footer (sticker album) — a 2px ink rule, then the standing disclaimer (product
 * constraint #3, bold ink lead-in), a mono link row, and the lock line (constraint #4).
 * Visibility is handled by SiteShell (hidden on the focused tool surfaces).
 */
export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="container-wide pb-12 pt-4">
      <div className="border-t-2 border-ink pt-5">
        <p className="mb-3 max-w-[820px] text-[14.5px] leading-relaxed text-ink-soft">
          <b className="font-semibold text-ink">{t("infoNotAdvice")}</b> {t("adviceTail")}
        </p>
        <div className="mono flex flex-wrap items-center justify-between gap-4">
          <nav aria-label="Footer" className="flex flex-wrap gap-5 text-[12.5px] uppercase">
            {(
              [
                ["/learn", t("learn")],
                ["/faq", t("faq")],
                ["/help", t("help")],
                ["/about", t("about")],
                ["/contact", t("contact")],
                ["/privacy", t("privacy")],
                ["/terms", t("terms")],
              ] as const
            ).map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="text-ink-faint underline underline-offset-[3px] hover:text-ink"
              >
                {label}
              </Link>
            ))}
            <ReplayGuides className="uppercase text-ink-faint underline underline-offset-[3px] hover:text-ink" />
          </nav>
          <span className="lock text-ink-faint">
            <Lock />
            {t("lockLine")}
          </span>
        </div>
      </div>
    </footer>
  );
}
