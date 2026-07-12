/**
 * Editorial page header (K2) — the same voice as the homepage bands: small tracked
 * kicker in the copper accent, a large Cormorant display headline, and an optional
 * measured lead. Use on every content page so the site reads as one piece.
 */
export function PageHeader({
  kicker,
  title,
  lead,
}: {
  kicker: string;
  title: string;
  lead?: string;
}) {
  return (
    <header>
      <p className="text-[11px] uppercase tracking-[0.28em] text-accent">{kicker}</p>
      <h1 className="mt-4 max-w-[720px] font-display text-[34px] font-semibold leading-[1.06] text-ink sm:text-[44px]">
        {title}
      </h1>
      {lead ? (
        <p className="mt-5 max-w-[56ch] text-[15.5px] leading-[1.68] text-ink-soft">{lead}</p>
      ) : null}
    </header>
  );
}
