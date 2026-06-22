import { PRODUCT_NAME } from "@/lib/config";

/**
 * Monogram crest + "What Now?" wordmark (Direction K2). Deep-teal rounded square with a
 * thin copper inset frame and a cream serif "W"; the wordmark sets the "?" in gold.
 * Tone "light" is for teal surfaces (footer / get-help strip).
 */
const SERIF = "var(--font-display), Georgia, serif";

export function Crest({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true" focusable="false">
      <rect width="44" height="44" rx="7" fill="#10363d" />
      <rect x="3.5" y="3.5" width="37" height="37" rx="4.5" fill="none" stroke="#c79a52" strokeWidth="1" />
      <text
        x="22"
        y="29"
        textAnchor="middle"
        fontSize="18"
        fontWeight="700"
        fill="#eef0e8"
        style={{ fontFamily: SERIF }}
      >
        W
      </text>
    </svg>
  );
}

export function Wordmark({
  size = 44,
  tone = "dark",
  tagline = false,
  textClassName = "text-[22px]",
}: {
  size?: number;
  tone?: "dark" | "light";
  tagline?: boolean;
  textClassName?: string;
}) {
  const light = tone === "light";
  return (
    <span className="inline-flex items-center gap-3">
      <Crest size={size} />
      <span className="flex flex-col leading-none">
        <span
          className={`font-display font-semibold tracking-[0.01em] ${textClassName} ${light ? "text-rail-fg" : "text-ink"}`}
        >
          {PRODUCT_NAME.replace(/\?$/, "")}
          <span className={light ? "text-rail-accent" : "text-accent"}>?</span>
        </span>
        {tagline && (
          <span className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-faint">
            Know your next step
          </span>
        )}
      </span>
    </span>
  );
}
