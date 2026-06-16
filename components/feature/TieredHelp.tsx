import type { HelpService } from "@/lib/schemas/corpus";
import { Icon } from "@/components/ui/icons";
import {
  classifyHelpTier,
  directoryByTier,
  lawyerTermForEntry,
  lawyerSearchUrl,
  LIV_URL,
} from "@/lib/help/services";

/**
 * Tiered "get free help" (handoff: order matters — free is encouraged, paid is clearly
 * secondary). Tier 1 = free government/tribunal (green), Tier 2 = free legal help (navy),
 * Tier 3 = a private lawyer (muted) via the LIV referral + a live search. Always rendered
 * with a result (a load-bearing trust surface).
 */
function ServiceLine({ s }: { s: HelpService }) {
  const isUrl = /^https?:\/\//.test(s.link);
  return (
    <div>
      {isUrl ? (
        <a href={s.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline-offset-2 hover:underline">
          {s.service}
        </a>
      ) : (
        <span className="font-semibold text-ink">{s.service}</span>
      )}
      <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">{s.who}</p>
    </div>
  );
}

export function TieredHelp({
  entryId,
  entryTitle,
  services,
  title = "Get free help",
}: {
  entryId: string;
  entryTitle: string;
  services: HelpService[];
  title?: string;
}) {
  const gov = services.filter((s) => classifyHelpTier(s) === "government");
  const legal = services.filter((s) => classifyHelpTier(s) === "legal");
  const tier1 = gov.length ? gov : directoryByTier("government").slice(0, 2);
  const tier2 = legal.length ? legal : directoryByTier("legal").slice(0, 2);
  const term = lawyerTermForEntry(entryId, entryTitle);

  return (
    <div className="card">
      <h3 className="flex items-center gap-2 font-serif text-[17px] font-bold text-ink">
        <Icon.People className="h-[18px] w-[18px] text-help" />
        {title}
      </h3>

      {/* Tier 1 — free government / tribunal */}
      <div className="mt-3.5 space-y-2.5 rounded-icon border-l-[3px] border-help bg-help-soft p-3.5">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-help">
          Tier 1 · Free government
        </div>
        {tier1.map((s) => (
          <ServiceLine key={s.service} s={s} />
        ))}
      </div>

      {/* Tier 2 — free legal help */}
      <div className="mt-2.5 space-y-2.5 rounded-icon border-l-[3px] border-navy bg-navy-soft p-3.5">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-navy">
          Tier 2 · Free legal help
        </div>
        {tier2.map((s) => (
          <ServiceLine key={s.service} s={s} />
        ))}
      </div>

      {/* Tier 3 — a private lawyer (paid, clearly secondary) */}
      <div className="mt-2.5 rounded-icon border border-line-card border-l-[3px] border-l-[#cdd3da] p-3.5">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-ink-faint">
          Tier 3 · Paid
        </div>
        <p className="mt-1.5 text-[14px] font-semibold text-ink-soft">Find a private lawyer</p>
        <p className="mt-0.5 text-[12.5px] text-ink-faint">Fees apply.</p>
        <div className="mt-2 flex flex-col gap-1 text-[13px]">
          <a href={LIV_URL} target="_blank" rel="noopener noreferrer" className="text-navy underline-offset-2 hover:underline">
            Law Institute of Victoria — referral service →
          </a>
          <a href={lawyerSearchUrl(term)} target="_blank" rel="noopener noreferrer" className="text-navy underline-offset-2 hover:underline">
            Search for a {term} lawyer →
          </a>
        </div>
      </div>
    </div>
  );
}
