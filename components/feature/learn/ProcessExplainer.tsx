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
      <h3 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">{title}</h3>
      <List className={`mt-2 space-y-1.5 text-[16px] leading-[1.6] text-ink-soft ${ordered ? "list-decimal pl-5" : ""}`}>
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
        <p className="text-[12px] uppercase tracking-[0.22em] text-accent">{p.plainName}</p>
        <Heading className={`mt-2 font-display font-bold text-ink ${level === "h1" ? "text-[34px] sm:text-[44px] leading-[1.05]" : "text-[26px]"}`}>
          {p.name}
        </Heading>
        <p className="mt-2 font-display text-[19px] italic leading-snug text-ink-soft">“{p.question}”</p>
      </div>

      <p className="max-w-[60ch] text-[16px] leading-[1.7] text-ink">{p.whatItIs}</p>

      {/* Who hears it. Framed nationally first: the Commonwealth body is the main picture,
          and the Victorian one is presented as the STATE EQUIVALENT rather than a second,
          parallel jurisdiction. Two equal "Cth / Vic" pills made the reader do the work of
          figuring out which half applied to them. */}
      <div className="rounded-card border border-line bg-sand-surface p-4">
        <h3 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">
          <Icon.People className="h-4 w-4 text-accent" strokeWidth={1.8} /> Who hears it
        </h3>
        <ul className="mt-2 space-y-2">
          {p.bodies
            .filter((b) => b.jurisdiction === "Cth")
            .map((b, i) => (
              <li key={`cth-${i}`} className="text-[16px] leading-[1.55] text-ink">
                <span className="font-semibold">{b.name}</span>
                {b.note ? <span className="text-ink-soft"> — {b.note}</span> : null}
              </li>
            ))}
        </ul>
        {p.bodies.some((b) => b.jurisdiction === "Vic") && (
          <div className="mt-3 border-t border-line pt-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              The state equivalent
            </p>
            <ul className="mt-1.5 space-y-2">
              {p.bodies
                .filter((b) => b.jurisdiction === "Vic")
                .map((b, i) => (
                  <li key={`vic-${i}`} className="text-[16px] leading-[1.55] text-ink">
                    <span className="font-semibold">{b.name}</span>
                    {b.note ? <span className="text-ink-soft"> — {b.note}</span> : null}
                  </li>
                ))}
            </ul>
            <p className="mt-2 text-[14px] leading-snug text-ink-faint">
              We cover Victoria in detail. Every state has its own equivalent, and it works the
              same way.
            </p>
          </div>
        )}
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
