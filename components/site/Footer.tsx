"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Wordmark } from "@/components/ui/Wordmark";
import { isAppRoute } from "@/components/site/Header";

/**
 * Footer (Direction C): navy-dark with a 2px brass top border. Crest + wordmark, the
 * standing disclaimer, and the quiet links.
 */
export function Footer() {
  const t = useTranslations("footer");
  const pathname = usePathname();
  if (isAppRoute(pathname)) return null;
  return (
    <footer className="mt-16 border-t-2 border-brass bg-navy-dark text-[#9fb0c4]">
      <div className="container-wide flex flex-col gap-5 py-10">
        <Wordmark size={28} tone="light" textClassName="text-[16px]" />
        <p className="max-w-prose text-sm leading-relaxed">{t("infoNotAdvice")}</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-5 text-sm">
          {(
            [
              ["/about", t("about")],
              ["/help", t("help")],
              ["/contact", t("contact")],
              ["/privacy", t("privacy")],
              ["/terms", t("terms")],
            ] as const
          ).map(([href, label]) => (
            <Link key={href} href={href} className="text-[#9fb0c4] underline-offset-2 hover:text-white hover:underline">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
