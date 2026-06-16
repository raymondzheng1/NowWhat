import type { ReactNode } from "react";

/** The signature "Chambers" brass hairline rule (decorative). */
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
      className={`block bg-brass ${className}`}
      style={{ width, height: 1.5 }}
    />
  );
}

/**
 * Uppercase, tracked, brass-toned label — the letterhead motif. By default a short brass
 * rule sits above it; pass rule="none" to omit.
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
      <span className="eyebrow">{children}</span>
    </span>
  );
}
