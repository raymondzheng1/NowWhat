import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * Custom 404 (sticker album) — the page that isn't there IS the empty slot, so it uses
 * the dashed .slot-empty device (absent/pending, never a deadline). Calm, and it routes
 * the person to the places they most likely wanted: the Rights Saver, the guide library,
 * the FAQ, and free help. Renders inside SiteShell, so unknown paths keep the full
 * chrome (nav/footer).
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
      <div
        className="slot-empty max-w-[720px] p-6 sm:p-8"
        style={{ transform: "rotate(1.1deg)" }}
      >
        {/* Label in ink, not red: red-deep/red-ink at 12.5px measure ~4.2:1 on the slot's
            red-tinted ground (they clear AA on plain paper, not on the tint). The dashed
            border and the note carry the red instead. */}
        <p className="font-display text-label font-black uppercase text-ink">{t("kicker")}</p>
        <h1 className="mt-2.5 text-[32px] leading-[1.05] sm:text-[42px]">{t("title")}</h1>
        <p className="mt-4 max-w-[52ch] text-body text-ink-soft">{t("lead")}</p>
        <p className="note mt-3 -rotate-1 text-[21px]">{t("slotNote")}</p>
      </div>

      <div className="mt-9">
        <Link href="/start" className="btn btn-primary">
          {t("ctaStart")}
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>

      <ul className="mt-10 max-w-[560px] border-t-2 border-ink">
        {links.map((l) => (
          <li key={l.href} className="border-b border-line">
            <Link
              href={l.href}
              className="group flex items-center justify-between gap-4 py-4 text-[16px] font-medium text-ink hover:text-red-ink"
            >
              {l.label}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-red-ink">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
