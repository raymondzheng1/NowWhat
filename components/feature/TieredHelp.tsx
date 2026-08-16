import type { ReactNode } from "react";
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
 * secondary). Tier 1 = free government/tribunal (green), Tier 2 = free legal help (ink),
 * Tier 3 = a private lawyer (muted, flat) via the LIV referral + a live search. Always
 * rendered with a result (a load-bearing trust surface).
 *
 * This is the ONE foil element on the result screen: talking to a free service is the
 * recommended action, so it gets the iridescent frame and nothing else on the page does.
 * Each tier is labelled glyph + word + colour, never colour alone.
 */
function TierLabel({
  icon,
  className,
  children,
}: {
  icon: ReactNode;
  className: string;
  children: ReactNode;
}) {
  return (
    <span className={`pill gap-1.5 ${className}`}>
      {icon}
      {children}
    </span>
  );
}

import { CallButton } from "@/components/ui/CallButton";

function ServiceLine({ s }: { s: HelpService }) {
  const isUrl = /^https?:\/\//.test(s.link);
  return (
    <div>
      {isUrl ? (
        <a
          href={s.link}
          target="_blank"
          rel="noopener noreferrer"
          className="font-display text-[15px] font-extrabold text-red-ink underline underline-offset-2 hover:text-ink"
        >
          {s.service}
        </a>
      ) : (
        <span className="font-display text-[15px] font-extrabold text-ink">{s.service}</span>
      )}
      <p className="mt-0.5 text-[14.5px] leading-snug text-ink-soft">{s.who}</p>
      {s.phone && (
        <div className="mt-2">
          <CallButton phone={s.phone} label={s.service} variant="plain" />
        </div>
      )}
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
    <div className="foil sticker" style={{ "--rot": "-0.9deg" } as React.CSSProperties}>
      <div className="foil-inner">
        <h3 className="flex items-center gap-2.5 font-display text-[19px] font-black text-ink">
          <Icon.People className="h-[19px] w-[19px] shrink-0 text-help" strokeWidth={2} />
          {title}
        </h3>

        {/* Tier 1 — free government / tribunal */}
        <div className="mt-4 space-y-2.5 rounded-sticker border-l-4 border-help bg-help-soft p-3.5">
          <TierLabel
            className="bg-help text-white"
            icon={<Icon.CheckSquare className="h-[13px] w-[13px] shrink-0" strokeWidth={2.4} />}
          >
            Tier 1 · Free government
          </TierLabel>
          {tier1.map((s) => (
            <ServiceLine key={s.service} s={s} />
          ))}
        </div>

        {/* Tier 2 — free legal help */}
        <div className="mt-3 space-y-2.5 rounded-sticker border-l-4 border-ink bg-cream p-3.5">
          <TierLabel
            className="bg-ink text-cream"
            icon={<Icon.People className="h-[13px] w-[13px] shrink-0" strokeWidth={2.4} />}
          >
            Tier 2 · Free legal help
          </TierLabel>
          {tier2.map((s) => (
            <ServiceLine key={s.service} s={s} />
          ))}
        </div>

        {/* Tier 3 — a private lawyer (paid, clearly secondary: flat, no fill) */}
        <div className="mt-3 rounded-sticker border border-line p-3.5">
          <TierLabel
            className="bg-cream-deep text-ink-soft"
            icon={<Icon.Receipt className="h-[13px] w-[13px] shrink-0" strokeWidth={2.4} />}
          >
            Tier 3 · Paid
          </TierLabel>
          <p className="mt-2 font-display text-[15px] font-extrabold text-ink-soft">
            Find a private lawyer
          </p>
          <p className="mt-0.5 text-[14.5px] text-ink-faint">Fees apply.</p>
          <div className="mt-1.5 flex flex-col">
            <a
              href={LIV_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="link inline-flex min-h-[44px] items-center text-[14.5px]"
            >
              Law Institute of Victoria — referral service →
            </a>
            <a
              href={lawyerSearchUrl(term)}
              target="_blank"
              rel="noopener noreferrer"
              className="link inline-flex min-h-[44px] items-center text-[14.5px]"
            >
              Search for a {term} lawyer →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
