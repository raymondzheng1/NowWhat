"use client";

/**
 * A draft letter, rendered as a letter.
 *
 * It used to be the raw draft in a read-only <textarea>. The letters are built around
 * placeholders — "[Your name]", "[date on your letter]", "[name the ground — for example…]"
 * — and in a monospace box those are indistinguishable from the sentences around them. A
 * person copying one into an email to an agency had no way to see what they still had to
 * fill in, and the most common way to get that wrong is to send it with the brackets in.
 *
 * So the placeholders are marked. Everything else is the draft, verbatim: this only changes
 * how the text looks, never what it says, and Copy still hands over the plain original.
 */

/** `[like this]` — the bits the person has to replace before sending. */
const PLACEHOLDER = /\[([^\]]+)\]/g;

function renderLine(line: string, key: number) {
  // A NOTE-TO-SELF block inside the judicial-review draft: it is addressed to the reader,
  // not to the agency, and it must not be mistaken for part of the letter they send.
  const isNote = /^NOTE TO YOURSELF/i.test(line.trim());
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of line.matchAll(PLACEHOLDER)) {
    const at = m.index ?? 0;
    if (at > last) parts.push(line.slice(last, at));
    parts.push(
      <mark
        key={`${key}-${at}`}
        className="rounded-[4px] border border-amber-border bg-amber-bg px-1 py-[1px] text-ink-soft"
      >
        {m[1]}
      </mark>,
    );
    last = at + m[0].length;
  }
  if (last < line.length) parts.push(line.slice(last));
  if (line.trim() === "") return <span key={key} className="block h-3" aria-hidden="true" />;
  return (
    <p
      key={key}
      className={
        isNote
          ? "mt-2 font-display text-[14px] font-black uppercase tracking-[0.08em] text-amber-ink"
          : "text-[15px] leading-relaxed text-ink"
      }
    >
      {parts.length ? parts : line}
    </p>
  );
}

export function LetterView({ body, label }: { body: string; label: string }) {
  const lines = body.split("\n");
  return (
    <div
      aria-label={label}
      className="mt-4 rounded-card border-2 border-line bg-paper px-4 py-4 sm:px-6 sm:py-5"
    >
      {lines.map((l, i) => renderLine(l, i))}
    </div>
  );
}

/** Shown once beside a draft, so the highlight has a stated meaning. */
export function LetterPlaceholderKey({ text }: { text: string }) {
  return (
    <p className="mt-3 flex flex-wrap items-center gap-2 text-[14.5px] leading-snug text-ink-faint">
      <mark className="rounded-[4px] border border-amber-border bg-amber-bg px-1 py-[1px] text-ink-soft">
        like this
      </mark>
      <span>{text}</span>
    </p>
  );
}
