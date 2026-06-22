import Link from "next/link";
import { Crest } from "@/components/ui/Wordmark";

/**
 * Slim focused header for the tool input screens (/ask, /decode, /chat), where the
 * marketing chrome is hidden. Crest centred, a quiet "Home" on the left. K2 teal.
 */
export function ToolTopBar() {
  return (
    <div className="flex h-[52px] items-center justify-between border-b border-line bg-sand-surface px-[22px] sm:h-16 sm:px-9">
      <Link href="/" className="text-sm font-semibold text-rail hover:underline">
        ← Home
      </Link>
      <Link href="/" aria-label="What Now? home">
        <Crest size={28} />
      </Link>
      <span className="w-12" aria-hidden="true" />
    </div>
  );
}
