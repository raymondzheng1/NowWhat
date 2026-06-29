import type { Ground } from "@/lib/schemas/legal";

/**
 * Renders one GROUND of review in plain English — used on the per-ground page, the guided
 * tour, and (expanded) in the grounds explorer. Neutral by design: "what might relate to
 * this", never "this proves your case"; "what it is not" guards against over-reading.
 */
export function GroundExplainer({ ground: g, level = "h2" }: { ground: Ground; level?: "h1" | "h2" }) {
  const Heading = level;
  return (
    <article className="space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-accent">Ground of review</p>
        <Heading className={`mt-2 font-display font-semibold text-ink ${level === "h1" ? "text-[32px] sm:text-[42px] leading-[1.06]" : "text-[24px]"}`}>
          {g.plainName}
        </Heading>
        <p className="mt-1 text-[13px] uppercase tracking-[0.1em] text-ink-faint">{g.name}</p>
        <p className="mt-3 font-display text-[19px] leading-snug text-ink-soft">{g.oneLine}</p>
      </div>

      <p className="max-w-[60ch] text-[16px] leading-[1.7] text-ink">{g.whatItMeans}</p>

      <div className="rounded-card border border-line bg-sand-surface px-4 py-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">A plain example</h3>
        <p className="mt-1.5 text-[15px] leading-[1.6] text-ink-soft">{g.plainExample}</p>
      </div>

      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">What might relate to this</h3>
        <p className="mt-1 text-[13px] text-ink-faint">
          These are things that can <em>relate</em> to this ground. They don’t mean the decision was unlawful — only that it may be worth raising. A free service can help you work it out.
        </p>
        <ul className="mt-3 space-y-2 text-[15px] leading-[1.6] text-ink">
          {g.whatRelates.map((s, i) => (
            <li key={i} className="flex gap-2.5">
              <span aria-hidden className="mt-2 h-1 w-1 flex-none rounded-full bg-accent" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      {g.whatItIsNot ? (
        <div className="rounded-card border-l-[3px] border-gold bg-gold-soft px-4 py-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">What this does not mean</h3>
          <p className="mt-1.5 text-[15px] leading-[1.6] text-ink">{g.whatItIsNot}</p>
        </div>
      ) : null}

      <p className="text-[13px] text-ink-faint">
        Mostly used in {g.usedIn.includes("judicial-review") ? "judicial review" : ""}
        {g.usedIn.includes("merits-review") ? (g.usedIn.length > 1 ? " and merits review" : "merits review") : ""}.
      </p>
    </article>
  );
}
