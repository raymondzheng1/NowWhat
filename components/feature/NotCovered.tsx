import { GetHelp } from "@/components/ui/GetHelp";
import { Icon } from "@/components/ui/icons";
import type { HelpService } from "@/lib/schemas/corpus";

/**
 * The honest "not covered" state (CLAUDE.md invariant #4; handoff: feels safe, not failed).
 * We never guess — we say so and route to a real free service. Always renders help.
 *
 * Sticker album: this is exactly the "absent / pending" case the EMPTY SLOT device is
 * reserved for — a dashed gap in the album (no shadow, because it isn't a sticker yet).
 * Never the deadline amber, never a red alarm: red here is a border and a glyph, not a
 * warning about time. The wording and the free-help routing below are unchanged.
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
    <div className="space-y-5">
      <div className="slot-empty p-5 sm:p-6" style={{ transform: "rotate(1.1deg)" }}>
        <div className="flex items-center gap-2 font-display text-[12.5px] font-black uppercase tracking-[0.12em] text-ink">
          <Icon.Info className="h-[17px] w-[17px] text-red" strokeWidth={2.2} />
          We&rsquo;re not sure
        </div>
        <h2 className="mt-2.5 text-h3 text-ink">{title}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{body}</p>
      </div>
      <GetHelp services={fallback} />
    </div>
  );
}
