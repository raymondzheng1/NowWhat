import { useTranslations } from "next-intl";
import type { HelpService } from "@/lib/schemas/corpus";
import { Icon } from "@/components/ui/icons";
import { CallButton } from "@/components/ui/CallButton";

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}
function isPhone(s: string): boolean {
  return /^\+?[\d][\d\s()-]{5,}$/.test(s);
}

/**
 * The always-present escalation block (CLAUDE.md non-negotiable: always offer human
 * help). Free help is the green surface — glyph + word + colour, never colour alone —
 * with phone numbers set large and given a full tap target, because on a phone that is
 * the fastest route to a person. Renders real services from the corpus; a "VERIFY" link
 * is shown as plain text rather than a broken/fabricated link (grounded-or-silent
 * applies to links too).
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
      className="rounded-card border-2 border-help bg-help-soft p-5 shadow-sticker sm:p-6"
    >
      <h3 className="mb-1 flex items-center gap-2.5 font-display text-[19px] font-black text-help-ink">
        <Icon.People className="h-[19px] w-[19px] shrink-0" strokeWidth={2} />
        {title ?? t("title")}
      </h3>
      <p className="mb-4 text-[14.5px] text-help-ink">{t("alwaysFree")}</p>
      <ul className="space-y-4">
        {services.map((s, i) => (
          <li key={i}>
            <p className="font-display text-[16px] font-extrabold text-ink">{s.service}</p>
            <p className="mt-0.5 text-[14.5px] leading-snug text-ink-soft">{s.who}</p>
            {/* The number first: on a phone, calling beats reading a website. */}
            {s.phone && (
              <div className="mt-2">
                <CallButton phone={s.phone} label={s.service} />
              </div>
            )}
            {isUrl(s.link) ? (
              <a
                href={s.link}
                target="_blank"
                rel="noopener noreferrer"
                className="link mono mt-1 inline-flex min-h-[44px] items-center break-all text-[14.5px]"
              >
                {s.link}
              </a>
            ) : isPhone(s.link) ? (
              <a
                href={`tel:${s.link.replace(/\s/g, "")}`}
                className="mt-1 inline-flex min-h-[44px] items-center font-display text-[19px] font-black text-help-ink underline underline-offset-4"
              >
                {s.link}
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
