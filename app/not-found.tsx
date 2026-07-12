import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * Custom 404 (K2) — calm, and routes the person to the places they most likely wanted:
 * the Rights Saver, the guide library, the FAQ, and free help. Renders inside SiteShell,
 * so unknown paths keep the full chrome (rail/nav/footer).
 */
export default function NotFound() {
  const t = useTranslations("notFound");
  const links = [
    { href: "/learn", label: t("linkLearn") },
    { href: "/faq", label: t("linkFaq") },
    { href: "/help", label: t("linkHelp") },
  ];
  return (
    <div className="container-wide py-16 sm:py-24">
      <p className="text-[11px] uppercase tracking-[0.28em] text-accent">{t("kicker")}</p>
      <h1 className="mt-4 max-w-[640px] font-display text-[36px] font-semibold leading-[1.06] text-ink sm:text-[48px]">
        {t("title")}
      </h1>
      <p className="mt-5 max-w-[52ch] text-[15.5px] leading-[1.68] text-ink-soft">{t("lead")}</p>
      <div className="mt-9">
        <Link href="/start" className="btn-primary px-6">
          {t("ctaStart")}
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
      <ul className="mt-10 max-w-[560px] border-t border-line">
        {links.map((l) => (
          <li key={l.href} className="border-b border-line">
            <Link
              href={l.href}
              className="group flex items-center justify-between gap-4 py-4 text-[15px] font-medium text-ink hover:text-accent"
            >
              {l.label}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
