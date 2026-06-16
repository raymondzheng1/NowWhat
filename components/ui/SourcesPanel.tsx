import { useTranslations } from "next-intl";

/**
 * The trust surface (PRD §9): shows exactly where each statement is grounded. Sources
 * come straight from the corpus entry — the user can see what every answer rests on.
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
    <section aria-label={t("sources")} className="rounded-card border border-line bg-paper-sunk p-4">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-faint">
        {t("sources")}
      </h3>
      <ul className="space-y-1 text-sm text-ink-soft">
        {sources.map((s, i) => (
          <li key={i} className="break-words">• {s}</li>
        ))}
      </ul>
      {lastVerified ? (
        <p className="mt-2 text-xs text-ink-faint">
          {t("lastVerified")}: {lastVerified}
        </p>
      ) : null}
    </section>
  );
}
