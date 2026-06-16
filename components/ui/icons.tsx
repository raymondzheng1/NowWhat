import type { ReactNode } from "react";

/**
 * Calm, non-techy line icons (Direction C). Stroke = currentColor, so colour them with
 * a text-* class (e.g. `text-navy`) and size with h-/w- classes. No AI/robot/sparkle
 * motifs (handoff non-negotiable). Decorative — aria-hidden by default.
 */
export interface IconProps {
  className?: string;
  strokeWidth?: number;
}

function S({
  className,
  strokeWidth = 1.8,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const Icon = {
  House: (p: IconProps) => (
    <S {...p}>
      <path d="M4 11l8-6 8 6" />
      <path d="M6 10v9h12v-9" />
      <path d="M10 19v-5h4v5" />
    </S>
  ),
  Receipt: (p: IconProps) => (
    <S {...p}>
      <path d="M5 4h14v16l-2.5-1.5L14 20l-2-1.5L10 20l-2.5-1.5L5 20z" />
      <path d="M9 9h6M9 13h6" />
    </S>
  ),
  Apartments: (p: IconProps) => (
    <S {...p}>
      <path d="M4 20V8l5-3v15" />
      <path d="M9 20V9l7-4v15" />
      <path d="M16 20V10l4 2v8" />
      <path d="M3 20h18" />
    </S>
  ),
  Document: (p: IconProps) => (
    <S {...p}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </S>
  ),
  Paste: (p: IconProps) => (
    <S {...p}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </S>
  ),
  ListLines: (p: IconProps) => (
    <S {...p}>
      <path d="M4 5h16M4 10h16M4 15h10" />
    </S>
  ),
  Shield: (p: IconProps) => (
    <S {...p}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
    </S>
  ),
  ShieldCheck: (p: IconProps) => (
    <S {...p}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </S>
  ),
  People: (p: IconProps) => (
    <S {...p}>
      <circle cx="9" cy="8" r="3" />
      <path d="M4 19c0-3 2.5-5 5-5s5 2 5 5" />
    </S>
  ),
  Clock: (p: IconProps) => (
    <S {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </S>
  ),
  CalendarPlus: (p: IconProps) => (
    <S {...p}>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M4 9h16M8 3v4M16 3v4M12 13v4M10 15h4" />
    </S>
  ),
  Printer: (p: IconProps) => (
    <S {...p}>
      <path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z" />
    </S>
  ),
  Lock: (p: IconProps) => (
    <S {...p}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </S>
  ),
  Info: (p: IconProps) => (
    <S {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </S>
  ),
  Warning: (p: IconProps) => (
    <S {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </S>
  ),
  CheckSquare: (p: IconProps) => (
    <S {...p}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 12l3 3 5-6" />
    </S>
  ),
  Close: (p: IconProps) => (
    <S {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </S>
  ),
  Menu: (p: IconProps) => (
    <S {...p}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </S>
  ),
};

export type IconName = keyof typeof Icon;
