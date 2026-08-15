import Link from "next/link";
import { PRODUCT_NAME } from "@/lib/config";

/**
 * Slim focused header for the tool input screens (/ask, /decode, /chat), where the
 * marketing chrome is hidden (sticker album). A 2px ink rule under the paper: a quiet
 * "Home" link on the left and the small logo sticker in the middle.
 */
export function ToolTopBar() {
  const name = PRODUCT_NAME.replace(/\?$/, "");
  return (
    <div className="flex h-[56px] items-center justify-between gap-3 border-b-2 border-ink px-5 sm:h-[64px] sm:px-8">
      <Link
        href="/"
        className="inline-flex min-h-[44px] items-center font-display text-[13px] font-extrabold uppercase tracking-[0.06em] text-ink-soft hover:text-ink"
      >
        ← Home
      </Link>
      <Link
        href="/"
        aria-label={`${PRODUCT_NAME} home`}
        className="sticker inline-flex min-h-[44px] items-center rounded-sticker bg-paper px-3.5 py-1.5 font-display text-[15px] font-black text-ink"
        style={{ "--rot": "-1.2deg" } as React.CSSProperties}
      >
        {name}
        <span className="text-red-ink">?</span>
      </Link>
      <span className="w-[72px]" aria-hidden="true" />
    </div>
  );
}
