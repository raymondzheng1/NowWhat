"use client";

import { useEffect, useRef } from "react";

/**
 * A textarea that grows to fit its content.
 *
 * The draft letters used a fixed `rows`, which meant two things went wrong: on screen the
 * person read their own letter through a small scrolling window, and on paper the browser
 * printed only the visible box — so most of the letter was lost. Since printing is the only
 * way anything is kept here (nothing is stored), a clipped letter is a real failure.
 *
 * `minRows` is the floor, so a short draft still looks like a letter rather than a field.
 */
export function AutoTextarea({
  value,
  minRows = 8,
  className = "",
  ...rest
}: {
  value: string;
  minRows?: number;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "rows">) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={minRows}
      className={`resize-none overflow-hidden ${className}`}
      {...rest}
    />
  );
}
