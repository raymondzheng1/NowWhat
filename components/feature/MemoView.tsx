"use client";

import type { MemoBlock } from "@/lib/memo/compose";
import { CallButton } from "@/components/ui/CallButton";

const URL_RE = /(https?:\/\/[^\s)]+[^\s).,;:])/g;

/**
 * A web address in our text, made tappable. Sources arrive as plain strings — some of them a
 * bare "https://…" — and a phone reader cannot copy a URL out of a paragraph with any ease.
 */
function Linked({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="link break-all">
            {p}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          p
        ),
      )}
    </>
  );
}

/**
 * The memo, rendered as a document rather than as a wall of monospace.
 *
 * It used to be `memo.body` in a read-only <textarea>. Three things were wrong with that,
 * and all of them mattered most on the step the whole flow exists to produce:
 *
 *   · Every link was dead. The memo points at the guide for each ground it names, and in a
 *     textarea those arrived as bare URLs a reader had to retype into a browser.
 *   · The structure was thrown away. A legal note depends on the difference between a
 *     heading, a rule, a case and the person's own words; a textarea renders all four as
 *     the same grey monospace.
 *   · It was a scroll box inside a page that already scrolls, so on a phone the memo was
 *     read three lines at a time.
 *
 * The plain text has not gone anywhere — `composeMemo` derives it from these same blocks,
 * so Copy and Download still hand over exactly what is on screen.
 */
export function MemoView({ blocks }: { blocks: MemoBlock[] }) {
  return (
    <article className="mt-4 space-y-1">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "heading":
            return (
              <h3
                key={i}
                className="mt-7 border-b-2 border-line pb-1.5 font-display text-[17px] font-black uppercase tracking-[0.06em] text-ink first:mt-0"
              >
                {b.text}
              </h3>
            );
          case "subheading":
            return (
              <h4
                key={i}
                className="mt-5 font-display text-[15.5px] font-extrabold text-red-ink"
              >
                {b.text}
              </h4>
            );
          case "meta":
            return (
              <p key={i} className="flex flex-wrap gap-x-2 text-[15px] leading-relaxed">
                <span className="font-semibold text-ink">{b.label}:</span>
                <span className="text-ink-soft">{b.value}</span>
              </p>
            );
          case "item":
            return (
              <div key={i} className="mt-1.5 flex gap-2.5 text-[15px] leading-relaxed text-ink-soft">
                <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 flex-none rounded-[2px] bg-accent" />
                <span className="min-w-0">
                  <Linked text={b.text} />
                  {b.detail && (
                    <span className="mt-0.5 block text-[14.5px] leading-snug text-ink-faint">
                      {b.detail}
                    </span>
                  )}
                </span>
              </div>
            );
          case "note":
            // Ours, about one part of a test, hung under that part. A hairline rule and an
            // indent do the tying; the person's own words get the teal block instead, so
            // the two are never mistaken for each other at a glance.
            return (
              <p
                key={i}
                className="ml-4 mt-1 border-l-2 border-line pl-3 text-[14.5px] leading-snug text-ink-soft"
              >
                <span className="font-semibold text-ink">{b.label}: </span>
                {b.text}
              </p>
            );
          case "quote":
            // Their own words, set apart so a reader can see at a glance which parts of this
            // document are the person's and which are ours. Never characterised.
            return (
              <figure key={i} className="mt-2">
                {b.label && (
                  <figcaption className="font-display text-[12.5px] font-black uppercase tracking-[0.1em] text-ink-faint">
                    {b.label}
                  </figcaption>
                )}
                <blockquote className="mt-1 border-l-[3px] border-help bg-help-soft px-3.5 py-2 text-[15px] italic leading-relaxed text-ink">
                  {b.text}
                </blockquote>
              </figure>
            );
          case "link":
            // Opened in a new tab: someone reading their memo should not lose it to follow a
            // definition, and on this step losing it means walking the flow again.
            return (
              <p key={i} className="mt-1.5 text-[15px] leading-relaxed">
                <a
                  href={b.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link inline-flex min-h-[44px] items-center gap-1.5"
                >
                  {b.text}
                  <span aria-hidden="true">↗</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </p>
            );
          case "contact":
            return (
              <div key={i} className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <a
                  href={b.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-semibold"
                >
                  {b.service}
                  <span aria-hidden="true">↗</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                {b.phone && <CallButton phone={b.phone} label={b.service} />}
              </div>
            );
          case "disclaimer":
            return (
              <p
                key={i}
                className="mt-4 rounded-sticker border-2 border-amber-border bg-amber-bg px-4 py-2.5 text-[14.5px] leading-relaxed text-ink-soft"
              >
                {b.text}
              </p>
            );
          default:
            return (
              <p key={i} className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">
                {b.text}
              </p>
            );
        }
      })}
    </article>
  );
}
