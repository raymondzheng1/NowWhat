import Link from "next/link";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { SourcesPanel } from "@/components/ui/SourcesPanel";

/**
 * The load-bearing trust block at the foot of every Learn surface: the standing
 * disclaimer, the sources for this content, and two calm next steps — get free help, and
 * "see if this applies to your decision" (into the Rights Saver). Keeps Learn honest:
 * general information, always a route to a human, never advice.
 */
export function LearnTrust({ sources = [] }: { sources?: string[] }) {
  return (
    <div className="mt-10 space-y-5 border-t border-line pt-8">
      <Disclaimer />
      {sources.length > 0 && <SourcesPanel sources={sources} />}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/start" className="btn-primary">
          See if this applies to your decision
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
        <Link href="/help" className="btn-secondary">
          Get free help
        </Link>
      </div>
    </div>
  );
}
