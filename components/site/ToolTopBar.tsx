import Link from "next/link";
import { Crest } from "@/components/ui/Wordmark";

/**
 * Slim focused header for the tool input screens (/ask, /decode), where the marketing
 * header is hidden. Crest centred, a quiet "Home" on the left.
 */
export function ToolTopBar() {
  return (
    <div className="flex h-[52px] items-center justify-between border-b-2 border-navy bg-paper px-[18px] sm:h-16 sm:px-9">
      <Link href="/" className="text-sm font-semibold text-navy hover:underline">
        ← Home
      </Link>
      <Link href="/" aria-label="What Now? home">
        <Crest size={28} />
      </Link>
      <span className="w-12" aria-hidden="true" />
    </div>
  );
}
