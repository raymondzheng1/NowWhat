import type { ReactNode } from "react";

/** A short, hard brand rule that sits above a section label (decorative). */
export function BrassRule({
  width = 30,
  className = "",
}: {
  width?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`block rounded-full bg-red ${className}`}
      style={{ width, height: 3 }}
    />
  );
}

/**
 * Uppercase, tracked Archivo section label — the sticker-album eyebrow. By default a short
 * red rule sits above it; pass rule="none" to omit. Colour is the AA-safe ink-faint (the
 * tan in `.eyebrow` is reserved for large Caveat notes).
 */
export function Eyebrow({
  children,
  rule = "above",
  className = "",
}: {
  children: ReactNode;
  rule?: "above" | "none";
  className?: string;
}) {
  return (
    <span className={`inline-flex flex-col gap-2 ${className}`}>
      {rule === "above" && <BrassRule />}
      <span className="eyebrow text-ink-faint">{children}</span>
    </span>
  );
}
