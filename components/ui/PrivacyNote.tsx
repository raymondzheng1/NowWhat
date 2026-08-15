import type { ReactNode } from "react";

/**
 * The padlock glyph from the design (stroke tan, 11-12px). Inline SVG so it inherits
 * currentColor context but keeps the specified stroke.
 */
export function Lock({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size + 1}
      viewBox="0 0 12 13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <rect x="1.5" y="5.5" width="9" height="6" rx="1" />
      <path d="M3.5 5.5 V4 A2.5 2.5 0 0 1 8.5 4 V5.5" />
    </svg>
  );
}

/**
 * The repeated privacy trust motif (product constraint #4): a small lock + a short mono
 * line. Appears in the hero, the tool footers, and the result.
 */
export function PrivacyNote({
  children = "FREE / NO ACCOUNT / NOTHING STORED",
  className = "",
  center = false,
}: {
  children?: ReactNode;
  className?: string;
  center?: boolean;
}) {
  return (
    <span className={`lock ${center ? "justify-center" : ""} ${className}`}>
      <Lock />
      <span className="uppercase">{children}</span>
    </span>
  );
}
