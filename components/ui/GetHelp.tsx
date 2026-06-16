import { useTranslations } from "next-intl";
import type { HelpService } from "@/lib/schemas/corpus";

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}
function isPhone(s: string): boolean {
  return /^\+?[\d][\d\s()-]{5,}$/.test(s);
}

/**
 * The always-present escalation block (CLAUDE.md non-negotiable: always offer human
 * help). Renders real services from the corpus; a "VERIFY" link is shown as plain text
 * rather than a broken/fabricated link (grounded-or-silent applies to links too).
 */
export function GetHelp({
  services,
  title,
}: {
  services: HelpService[];
  title?: string;
}) {
  const t = useTranslations("help");
  return (
    <section
      aria-label={title ?? t("title")}
      className="rounded-card border border-help-soft bg-help-soft p-5"
    >
      <h3 className="mb-1 font-display text-lg font-bold text-help-ink">
        {title ?? t("title")}
      </h3>
      <p className="mb-3 text-sm text-help-ink">{t("alwaysFree")}</p>
      <ul className="space-y-3">
        {services.map((s, i) => (
          <li key={i}>
            <p className="font-semibold text-ink">{s.service}</p>
            <p className="text-sm text-ink-soft">{s.who}</p>
            {isUrl(s.link) ? (
              <a href={s.link} target="_blank" rel="noopener noreferrer" className="link text-sm">
                {s.link}
              </a>
            ) : isPhone(s.link) ? (
              <a href={`tel:${s.link.replace(/\s/g, "")}`} className="link text-sm">{s.link}</a>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
