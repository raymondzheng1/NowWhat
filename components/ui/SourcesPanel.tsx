import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icons";
import { parseSource } from "@/lib/sources/link";

/**
 * "Where this comes from" — the trust surface (handoff: load-bearing, always visible).
 *
 * Styled as a receipt: mono lines down a hairline left rule, so it reads as a printed
 * record rather than marketing. Each source renders as its human label plus the
 * publisher's domain as a real link, so a person can open the source and read it
 * themselves rather than taking our word for it. A source with no domain in it stays
 * honest prose — we never invent a URL.
 */
export function SourcesPanel({
  sources,
  lastVerified,
}: {
  sources: string[];
  lastVerified?: string | null;
}) {
  const t = useTranslations("common");
  if (sources.length === 0) return null;
  return (
    <section
      aria-label={t("sources")}
      className="card sticker"
      style={{ "--rot": "0.7deg" } as React.CSSProperties}
    >
      <h3 className="flex items-center gap-2.5 font-display text-[17px] font-black uppercase tracking-[0.08em] text-ink">
        <Icon.Shield className="h-[18px] w-[18px] shrink-0 text-red-ink" strokeWidth={2} />
        {t("sources")}
      </h3>
      <ul className="mt-3.5 space-y-3 border-l border-line pl-3.5">
        {sources.map((raw, i) => {
          const { label, links } = parseSource(raw);
          return (
            /* The label is real reading matter (statute names, publisher titles), so it
               stays body sans at the 14.5px floor. The receipt feel comes from the
               hairline rule, the mono domains and the mono "last checked" line. */
            <li key={i} className="text-[14.5px] leading-snug text-ink">
              <span className="block font-semibold">{label}</span>
              {links.length > 0 && (
                <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  {links.map((l) => (
                    <a
                      key={l.domain}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[12.5px] text-red-ink underline underline-offset-2 hover:text-ink"
                    >
                      {l.domain}
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        aria-hidden="true"
                        className="shrink-0"
                      >
                        <path d="M7 17 17 7M9 7h8v8" />
                      </svg>
                    </a>
                  ))}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {lastVerified ? (
        <p className="mono mt-3.5 border-t border-line pt-3 text-[12px] uppercase text-ink-faint">
          {t("lastVerified")}: {lastVerified}
        </p>
      ) : null}
    </section>
  );
}
