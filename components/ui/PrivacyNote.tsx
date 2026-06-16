import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icons";

/**
 * The repeated privacy trust motif (handoff non-negotiable #6): a small lock + a short
 * line. Appears in the hero, the wizard footer, and the result.
 */
export function PrivacyNote({
  children = "We never keep your details.",
  className = "",
  center = false,
}: {
  children?: ReactNode;
  className?: string;
  center?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-meta text-ink-soft ${
        center ? "justify-center" : ""
      } ${className}`}
    >
      <Icon.Lock className="h-[15px] w-[15px] shrink-0 text-help" strokeWidth={1.9} />
      <span>{children}</span>
    </span>
  );
}
