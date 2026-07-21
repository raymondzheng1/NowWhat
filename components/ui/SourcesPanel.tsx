import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icons";
import { parseSource } from "@/lib/sources/link";

/**
 * "Where this comes from" — the trust surface (handoff: load-bearing, always visible).
 *
 * Each source renders as its human label plus the publisher's domain as a real link, so a
 * person can open the source and read it themselves rather than taking our word for it. A
 * source with no domain in it stays honest prose — we never invent a URL.
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
    <section aria-label={t("sources")} className="card">
      <h3 className="flex items-center gap-2 font-display text-[18px] font-bold text-ink">
        <Icon.Shield className="h-[19px] w-[19px] text-rail" />
        {t("sources")}
      </h3>
      <ul className="mt-3 space-y-3">
        {sources.map((raw, i) => {
          const { label, links } = parseSource(raw);
          return (
            <li key={i} className="border-l-2 border-accent pl-3 text-[14.5px] leading-snug">
              <span className="block font-semibold text-ink">{label}</span>
              {links.length > 0 && (
                <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  {links.map((l) => (
                    <a
                      key={l.domain}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[13.5px] font-medium text-accent underline underline-offset-2 hover:text-ink"
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
        <p className="mt-3 text-meta text-ink-faint">
          {t("lastVerified")}: {lastVerified}
        </p>
      ) : null}
    </section>
  );
}
