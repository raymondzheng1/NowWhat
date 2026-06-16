"use client";

import { GetHelp } from "@/components/ui/GetHelp";
import type { HelpService } from "@/lib/schemas/corpus";

/**
 * The honest "not covered" state (CLAUDE.md invariant #4). We never guess — we say so
 * and route to a real free service. Always renders help.
 */
export function NotCovered({
  title,
  body,
  services,
}: {
  title: string;
  body: string;
  services: HelpService[];
}) {
  const fallback: HelpService[] =
    services.length > 0
      ? services
      : [
          {
            service: "Community Legal Centres Australia",
            who: "find your nearest free community legal centre",
            link: "VERIFY",
          },
          { service: "Legal Aid", who: "your state or territory Legal Aid", link: "VERIFY" },
        ];
  return (
    <div className="space-y-4">
      <div className="card border-clock-soft bg-clock-soft">
        <h2 className="font-display text-xl font-bold text-clock-ink">{title}</h2>
        <p className="mt-2 text-ink-soft">{body}</p>
      </div>
      <GetHelp services={fallback} />
    </div>
  );
}
