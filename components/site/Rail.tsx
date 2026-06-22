import Link from "next/link";
import { PRODUCT_NAME } from "@/lib/config";

/**
 * Fixed vertical brand rail (Direction K2) — desktop only. Deep-teal, full viewport
 * height, 96px wide: crest (top), vertical wordmark (middle), "FREE · NO LOGIN" tag
 * (bottom). Brand only — navigation lives in the top nav. The mobile equivalent is the
 * teal top bar in SiteNav.
 */
export function Rail() {
  const name = PRODUCT_NAME.replace(/\?$/, "");
  return (
    <nav
      aria-label={`${PRODUCT_NAME} home`}
      className="fixed inset-y-0 left-0 z-20 hidden w-rail flex-col items-center justify-between bg-rail py-7 md:flex"
    >
      <Link
        href="/"
        aria-label={`${PRODUCT_NAME} home`}
        className="flex h-[30px] w-[30px] items-center justify-center border border-rail-accent"
      >
        <span className="font-display text-[13px] font-bold text-rail-fg">W</span>
      </Link>

      <Link
        href="/"
        aria-label={`${PRODUCT_NAME} home`}
        className="font-display text-[21px] font-semibold tracking-[0.12em] text-rail-fg [writing-mode:vertical-rl] rotate-180"
      >
        {name}
        <b className="font-semibold text-rail-accent">?</b>
      </Link>

      <span className="text-[9.5px] uppercase tracking-[0.26em] text-rail-accent [writing-mode:vertical-rl] rotate-180">
        Free · No login
      </span>
    </nav>
  );
}
