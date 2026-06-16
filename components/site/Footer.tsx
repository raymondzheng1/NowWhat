import Link from "next/link";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="mt-16 border-t border-line bg-paper">
      <div className="container-wide flex flex-col gap-4 py-8 text-sm text-ink-soft">
        <p className="max-w-prose font-medium text-ink">{t("infoNotAdvice")}</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-4">
          <Link href="/help" className="link">{t("help")}</Link>
          <Link href="/faq" className="link">{t("faq")}</Link>
          <Link href="/about" className="link">{t("about")}</Link>
          <Link href="/privacy" className="link">{t("privacy")}</Link>
        </nav>
      </div>
    </footer>
  );
}
