/**
 * Editorial page header (sticker album) — the tone-setter for every content page:
 * a small tracked Archivo kicker, a big Archivo 900 headline on the paper, and an
 * optional measured lead. No sticker, no rotation: the header IS the page, not an
 * object laid on it, so it stays square and the stickers below do the tilting.
 *
 * The kicker uses red-ink (not the tan .eyebrow default) because 13px bold tan is
 * 3.6:1 on cream — below AA for small text.
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
      <p className="eyebrow text-red-ink">{kicker}</p>
      <h1 className="mt-3.5 max-w-[720px] text-h1">{title}</h1>
      {lead ? (
        <p className="mt-5 max-w-[58ch] text-lede text-ink-soft [text-wrap:pretty]">{lead}</p>
      ) : null}
    </header>
  );
}
