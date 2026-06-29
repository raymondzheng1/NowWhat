import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * Footer (Direction K2) — quiet, on the sand page: the standing disclaimer with a bold
 * "We never keep your details" privacy note, and an uppercase link row. Visibility is
 * handled by SiteShell (hidden on the focused tool surfaces).
 */
export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-content flex-col gap-5 px-[22px] py-8 sm:flex-row sm:items-center sm:justify-between sm:px-12">
        <p className="max-w-[520px] text-meta leading-relaxed text-ink-faint">
          {t("infoNotAdvice")}{" "}
          <strong className="font-semibold text-ink-soft">{t("neverStored")}</strong>
        </p>
        <nav
          aria-label="Footer"
          className="flex flex-wrap gap-5 text-[12px] uppercase tracking-[0.12em] text-ink-soft"
        >
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
            <Link key={href} href={href} className="hover:text-ink">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
