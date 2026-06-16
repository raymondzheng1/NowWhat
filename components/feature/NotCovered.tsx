import { GetHelp } from "@/components/ui/GetHelp";
import { Icon } from "@/components/ui/icons";
import type { HelpService } from "@/lib/schemas/corpus";

/**
 * The honest "not covered" state (CLAUDE.md invariant #4; handoff: feels safe, not failed).
 * We never guess — we say so and route to a real free service. Always renders help.
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
          { service: "Victoria Legal Aid", who: "free legal information and advice — 1300 792 387", link: "https://www.legalaid.vic.gov.au" },
          { service: "Community legal centres", who: "free local legal help — find your nearest centre", link: "https://www.fclc.org.au" },
        ];
  return (
    <div className="space-y-4">
      <div className="rounded-panel border border-gold-line bg-gold-soft p-5 sm:p-6">
        <div className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.12em] text-brass-text">
          <Icon.Info className="h-[17px] w-[17px] text-gold" strokeWidth={2} />
          We&rsquo;re not sure
        </div>
        <h2 className="mt-2.5 font-serif text-[22px] font-bold leading-snug text-gold-strong">{title}</h2>
        <p className="mt-2 leading-relaxed text-gold-text">{body}</p>
      </div>
      <GetHelp services={fallback} />
    </div>
  );
}
