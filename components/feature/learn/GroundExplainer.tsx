import type { Ground } from "@/lib/schemas/legal";

/**
 * Renders one GROUND of review in plain English — used on the per-ground page, the guided
 * tour, and (expanded) in the grounds explorer. Neutral by design: "what might relate to
 * this", never "this proves your case"; "what it is not" guards against over-reading.
 */
export function GroundExplainer({ ground: g, level = "h2" }: { ground: Ground; level?: "h1" | "h2" }) {
  const Heading = level;
  return (
    <article className="space-y-6">
      <div>
        {/* .eyebrow's own tan is 3.61:1 on paper — AA-safe ink-faint, per components/ui/Eyebrow. */}
        <p className="eyebrow text-ink-faint">Ground of review</p>
        <Heading className={`mt-2.5 font-display font-black text-ink ${level === "h1" ? "text-[32px] sm:text-[42px] leading-[1.04] tracking-[-0.025em]" : "text-[24px] leading-[1.12]"}`}>
          <span className="text-red-ink">{g.name}:</span> {g.plainName}
        </Heading>
        <p className="mt-3.5 font-display text-[19px] leading-snug text-ink-soft">{g.oneLine}</p>
      </div>

      <p className="max-w-[60ch] text-[16.5px] leading-[1.7] text-ink">{g.whatItMeans}</p>

      <div
        className="card sticker border-2 border-line"
        style={{ "--rot": "-0.7deg" } as React.CSSProperties}
      >
        <h3 className="font-display text-[12.5px] font-black uppercase tracking-[0.12em] text-red-ink">A plain example</h3>
        <p className="mt-2 text-[16px] leading-[1.6] text-ink-soft">{g.plainExample}</p>
      </div>

      <div>
        <h3 className="font-display text-[12.5px] font-black uppercase tracking-[0.12em] text-red-ink">What might relate to this</h3>
        <p className="mt-1.5 text-[14.5px] leading-[1.55] text-ink-faint">
          These are things that can <em>relate</em> to this ground. They don’t mean the decision was unlawful — only that it may be worth raising. A free service can help you work it out.
        </p>
        <ul className="mt-3.5 space-y-2 text-[16px] leading-[1.6] text-ink">
          {g.whatRelates.map((s, i) => (
            <li key={i} className="flex gap-2.5">
              <span aria-hidden className="mt-[9px] h-1.5 w-1.5 flex-none rounded-[2px] bg-red" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* The questions behind the ground. These were written as `elements[].layPrompt`, are
          lawyer-verified, and were rendered nowhere — the richest lay-facing material in the
          corpus sat unused. They ask about lived experience, never for a legal conclusion. */}
      {g.elements.length > 0 && (
        <div>
          <h3 className="font-display text-[12.5px] font-black uppercase tracking-[0.12em] text-red-ink">
            Questions this ground asks
          </h3>
          <ul className="mt-3.5 space-y-3.5">
            {g.elements.map((e) => (
              <li key={e.id} className="rounded-card border-2 border-line bg-cream px-4 py-3.5">
                <p className="font-display text-[12.5px] font-black uppercase tracking-[0.1em] text-ink-faint">
                  {e.name}
                </p>
                <p className="mt-1 text-[16px] leading-[1.6] text-ink">{e.layPrompt}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {g.whatItIsNot ? (
        <div className="rounded-card border-l-[6px] border-ink bg-paper px-5 py-4 shadow-card">
          <h3 className="font-display text-[12.5px] font-black uppercase tracking-[0.12em] text-ink">What this does not mean</h3>
          <p className="mt-2 text-[16px] leading-[1.6] text-ink-soft">{g.whatItIsNot}</p>
        </div>
      ) : null}

      {/* The authorities. Rendered last and deliberately quietly: a citation is here to show
          the ground is real law, not to suggest anyone's own case will go the same way. That
          sentence is load-bearing — a reader who meets "the decision was quashed" without it
          can reasonably hear a promise. */}
      {g.leadingCases.length > 0 && (
        <div className="border-t-2 border-line pt-6">
          <h3 className="font-display text-[12.5px] font-black uppercase tracking-[0.12em] text-red-ink">
            Where this ground comes from
          </h3>
          <p className="mt-1.5 max-w-[60ch] text-[14.5px] leading-[1.55] text-ink-faint">
            Courts worked this ground out over many years. These are the decisions it rests on.
            Every case turns on its own facts, so none of them tells you what will happen with
            your decision.
          </p>
          <ul className="mt-4 space-y-4">
            {g.leadingCases.map((c) => (
              <li key={c.name}>
                <p className="font-display text-[15.5px] font-extrabold leading-snug text-ink">
                  {c.name}
                  {c.pinpoint ? <span className="font-normal text-ink-faint"> — {c.pinpoint}</span> : null}
                </p>
                <p className="mt-1 text-[15.5px] leading-[1.6] text-ink-soft">{c.explains}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="font-mono text-[13px] tracking-[0.04em] text-ink-faint">
        Mostly used in {g.usedIn.includes("judicial-review") ? "judicial review" : ""}
        {g.usedIn.includes("merits-review") ? (g.usedIn.length > 1 ? " and merits review" : "merits review") : ""}.
      </p>
    </article>
  );
}
