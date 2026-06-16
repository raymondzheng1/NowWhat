import Link from "next/link";
import { useTranslations } from "next-intl";

export function Header() {
  const t = useTranslations("nav");
  const c = useTranslations("common");
  return (
    <header className="border-b border-line bg-paper">
      <div className="container-wide flex items-center justify-between gap-4 py-3">
        <Link href="/" className="flex flex-col leading-tight">
          <span className="font-display text-xl font-bold text-brand-ink">{c("productName")}</span>
          <span className="text-xs text-ink-faint">{c("tagline")}</span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-3 text-sm">
          <Link href="/start" className="link">{t("start")}</Link>
          <Link href="/ask" className="link hidden sm:inline">{t("ask")}</Link>
          <Link href="/faq" className="link hidden sm:inline">{t("faq")}</Link>
          <Link href="/help" className="btn-secondary py-2 text-sm">{t("help")}</Link>
        </nav>
      </div>
    </header>
  );
}
