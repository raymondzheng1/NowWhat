"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Wordmark } from "@/components/ui/Wordmark";
import { Icon } from "@/components/ui/icons";

// Focused tool surfaces provide their own header (progress / start-over / close).
const APP_ROUTES = ["/start", "/ask", "/decode", "/chat"];
export function isAppRoute(pathname: string): boolean {
  return APP_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/**
 * Site header (Direction C): sticky, 2px navy bottom border, crest + wordmark, text nav
 * + a secondary "Ask a question". Mobile collapses the nav behind a hamburger (the menu
 * is closeable by button, not backdrop-only).
 */
export function Header() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (isAppRoute(pathname)) return null;

  const links = [
    { href: "/#how", label: t("howItWorks") },
    { href: "/help", label: t("help") },
    { href: "/faq", label: t("faq") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b-2 border-navy bg-paper">
      <div className="container-wide flex h-[58px] items-center justify-between gap-4 sm:h-[74px]">
        <Link href="/" aria-label={t("home")} className="rounded-md">
          <Wordmark size={40} textClassName="text-[19px] sm:text-[21px]" />
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-ui font-medium text-ink-soft hover:text-navy">
              {l.label}
            </Link>
          ))}
          <Link href="/ask" className="btn-secondary px-4 text-sm" style={{ minHeight: 44 }}>
            {t("ask")}
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-button border border-line text-ink-soft md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <Icon.Close className="h-5 w-5" strokeWidth={2} /> : <Icon.Menu className="h-5 w-5" strokeWidth={2} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav id="mobile-menu" aria-label="Main" className="border-t border-line bg-paper px-[18px] py-3 md:hidden">
          <ul className="flex flex-col">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="block border-b border-line py-3 text-ui font-medium text-ink"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="pt-3">
              <Link href="/ask" className="btn-secondary w-full" onClick={() => setOpen(false)}>
                {t("ask")}
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
