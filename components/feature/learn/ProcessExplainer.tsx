import type { Process } from "@/lib/schemas/legal";
import { Icon } from "@/components/ui/icons";

/**
 * Renders one review PROCESS (merits or judicial) from the concept layer. Used full-size
 * on the library page and the guided tour, and compact (in-flow) in the Rights Saver.
 * Presentational + deterministic — the same words everywhere.
 */
function PointList({
  title,
  items,
  ordered = false,
}: {
  title: string;
  items: string[];
  ordered?: boolean;
}) {
  if (items.length === 0) return null;
  const List = ordered ? "ol" : "ul";
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">{title}</h3>
      <List className={`mt-2 space-y-1.5 text-[15px] leading-[1.6] text-ink-soft ${ordered ? "list-decimal pl-5" : ""}`}>
        {items.map((s, i) => (
          <li key={i} className={ordered ? "" : "flex gap-2.5"}>
            {!ordered && <span aria-hidden className="mt-2 h-1 w-1 flex-none rounded-full bg-accent" />}
            <span>{s}</span>
          </li>
        ))}
      </List>
    </div>
  );
}

export function ProcessExplainer({
  process: p,
  level = "h2",
  compact = false,
}: {
  process: Process;
  level?: "h1" | "h2";
  compact?: boolean;
}) {
  const Heading = level;
  return (
    <article className="space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-accent">{p.plainName}</p>
        <Heading className={`mt-2 font-display font-semibold text-ink ${level === "h1" ? "text-[34px] sm:text-[44px] leading-[1.05]" : "text-[26px]"}`}>
          {p.name}
        </Heading>
        <p className="mt-2 font-display text-[19px] italic leading-snug text-ink-soft">“{p.question}”</p>
      </div>

      <p className="max-w-[60ch] text-[16px] leading-[1.7] text-ink">{p.whatItIs}</p>

      <div className="rounded-card border border-line bg-sand-surface p-4">
        <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
          <Icon.People className="h-4 w-4 text-accent" strokeWidth={1.8} /> Who hears it
        </h3>
        <ul className="mt-2 space-y-2">
          {p.bodies.map((b, i) => (
            <li key={i} className="text-[15px] leading-[1.55] text-ink">
              <span className="rounded-pill bg-rail px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-rail-fg">
                {b.jurisdiction === "Cth" ? "Cth" : "Vic"}
              </span>{" "}
              <span className="font-semibold">{b.name}</span>
              {b.note ? <span className="text-ink-soft"> — {b.note}</span> : null}
            </li>
          ))}
        </ul>
      </div>

      <div className={`grid gap-6 ${compact ? "" : "sm:grid-cols-2"}`}>
        <PointList title="Can you apply?" items={p.canApply} />
        <PointList title="What happens" items={p.whatHappens} ordered />
        <PointList title="What they can do" items={p.remedies} />
        {p.limits.length > 0 && <PointList title="What it can’t do" items={p.limits} />}
      </div>

      {!compact && p.goodToKnow.length > 0 && (
        <div className="rounded-card border-l-[3px] border-gold bg-gold-soft px-4 py-3">
          <PointList title="Good to know" items={p.goodToKnow} />
        </div>
      )}
    </article>
  );
}
