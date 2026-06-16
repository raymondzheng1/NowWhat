import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icons";

/**
 * "Where this comes from" — the trust surface (handoff: load-bearing, always visible).
 * Each source sits on a brass left-border (the letterhead motif); links go to the source.
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
      <h3 className="flex items-center gap-2 font-serif text-[17px] font-bold text-ink">
        <Icon.Shield className="h-[18px] w-[18px] text-navy" />
        {t("sources")}
      </h3>
      <ul className="mt-3 space-y-2.5">
        {sources.map((s, i) => {
          const isUrl = /^https?:\/\//.test(s);
          return (
            <li key={i} className="border-l-2 border-brass pl-3 text-[13.5px] leading-snug">
              {isUrl ? (
                <a
                  href={s}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-navy underline-offset-2 hover:underline"
                >
                  {s}
                </a>
              ) : (
                <span className="font-semibold text-ink">{s}</span>
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
