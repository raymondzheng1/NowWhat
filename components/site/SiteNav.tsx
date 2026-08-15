"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PRODUCT_NAME } from "@/lib/config";
import { Icon } from "@/components/ui/icons";

/**
 * Site header (sticker album). A 2px ink rule under a row of: the logo sticker (white,
 * rotated -1.2deg, hard shadow) on the left, and the nav on the right, ending in the red
 * "A person, any time" pill — the always-visible route to a human (product constraint #2).
 *
 * Mobile: the same logo sticker plus a hamburger that opens a sheet; the human-help pill
 * stays visible at all widths, because it must never be behind a menu.
 */
export function SiteNav() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const name = PRODUCT_NAME.replace(/\?$/, "");

  const links = [
    { href: "/start", label: t("start") },
    { href: "/decode", label: t("scan") },
    { href: "/ask", label: t("ask") },
    { href: "/learn", label: t("guides") },
    { href: "/faq", label: t("faq") },
  ];

  return (
    <header className="border-b-2 border-ink">
      <div className="container-wide flex flex-wrap items-center justify-between gap-4 py-5">
        <Link
          href="/"
          aria-label={`${PRODUCT_NAME} home`}
          className="sticker inline-flex rounded-sticker bg-paper px-4 py-2 font-display text-[19px] font-black text-ink"
          style={{ "--rot": "-1.2deg" } as React.CSSProperties}
        >
          {name}
          <span className="text-red">?</span>
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label="Main"
          className="hidden items-center gap-6 font-display text-[13px] font-extrabold uppercase tracking-[0.06em] md:flex"
        >
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-ink-soft hover:text-ink">
              {l.label}
            </Link>
          ))}
          <Link
            href="/help"
            className="sticker inline-flex min-h-[44px] items-center rounded-pill px-5 py-3 text-cream-onRed"
            style={{ "--rot": "0.8deg", background: "var(--red-cta)" } as React.CSSProperties}
          >
            {t("person")}
          </Link>
        </nav>

        {/* Mobile: human help stays visible; everything else goes in the sheet. */}
        <div className="flex items-center gap-3 md:hidden">
          <Link
            href="/help"
            className="sticker inline-flex min-h-[44px] items-center rounded-pill px-4 py-3 font-display text-[12px] font-extrabold uppercase tracking-[0.06em] text-cream-onRed"
            style={{ "--rot": "0.8deg", background: "var(--red-cta)" } as React.CSSProperties}
          >
            {t("person")}
          </Link>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-sticker border-2 border-ink bg-paper text-ink"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <Icon.Close className="h-5 w-5" strokeWidth={2.4} /> : <Icon.Menu className="h-5 w-5" strokeWidth={2.4} />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Main" className="border-t-2 border-ink bg-paper md:hidden">
          <ul className="container-wide flex flex-col py-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="block border-b border-line py-4 font-display text-[15px] font-extrabold uppercase tracking-[0.06em] text-ink"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="py-4">
              <Link href="/help" className="btn btn-primary w-full" onClick={() => setOpen(false)}>
                {t("help")}
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
