"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PRODUCT_NAME } from "@/lib/config";
import { Icon } from "@/components/ui/icons";

/**
 * Site navigation (Direction K2):
 *  - desktop: a quiet, right-aligned top nav inside the main column, with a bottom
 *    hairline. "Ask a question" is set in the gold accent.
 *  - mobile: a teal top bar (horizontal wordmark + hamburger). The menu is a sheet that
 *    closes by button (never backdrop-only), reusing the codebase's mobile-nav pattern.
 */
export function SiteNav() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const name = PRODUCT_NAME.replace(/\?$/, "");

  const links = [
    { href: "/learn", label: t("howItWorks") },
    { href: "/faq", label: t("faq") },
    { href: "/help", label: t("help") },
  ];

  return (
    <>
      {/* Desktop top nav */}
      <nav
        aria-label="Main"
        className="hidden items-center justify-end gap-8 border-b border-line px-12 py-6 text-[11px] uppercase tracking-[0.2em] text-ink-soft md:flex"
      >
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-ink">
            {l.label}
          </Link>
        ))}
        <Link href="/ask" className="text-accent hover:text-ink">
          {t("ask")}
        </Link>
      </nav>

      {/* Mobile top bar */}
      <div className="flex items-center justify-between bg-rail px-[22px] py-4 md:hidden">
        <Link
          href="/"
          aria-label={`${PRODUCT_NAME} home`}
          className="font-display text-[18px] font-semibold tracking-[0.04em] text-rail-fg"
        >
          {name}
          <b className="font-semibold text-rail-accent">?</b>
        </Link>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-button border border-rail-accent text-rail-fg"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <Icon.Close className="h-5 w-5" strokeWidth={2} /> : <Icon.Menu className="h-5 w-5" strokeWidth={2} />}
        </button>
      </div>

      {/* Mobile menu sheet */}
      {open && (
        <nav id="mobile-menu" aria-label="Main" className="border-b border-line bg-sand-surface px-[22px] py-2 md:hidden">
          <ul className="flex flex-col">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="block border-b border-line py-3.5 text-[15px] font-medium text-ink"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="py-3.5">
              <Link href="/ask" className="font-semibold text-accent" onClick={() => setOpen(false)}>
                {t("ask")}
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </>
  );
}
