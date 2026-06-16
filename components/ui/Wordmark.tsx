import { PRODUCT_NAME } from "@/lib/config";

/**
 * Monogram crest + "What Now?" wordmark (Direction C). Navy rounded square with a 1px
 * brass inset frame and serif "WN"; the wordmark sets the "?" in brass. Tone "light" is
 * for navy surfaces (footer / get-help strip).
 */
const SERIF = "var(--font-display), Georgia, serif";

export function Crest({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true" focusable="false">
      <rect width="44" height="44" rx="7" fill="#1b3a5b" />
      <rect x="3.5" y="3.5" width="37" height="37" rx="4.5" fill="none" stroke="#b08d57" strokeWidth="1" />
      <text
        x="22"
        y="28.5"
        textAnchor="middle"
        fontSize="16"
        fontWeight="700"
        fill="#f3e7d0"
        style={{ fontFamily: SERIF }}
      >
        WN
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
          className={`font-serif font-bold tracking-[-0.01em] ${textClassName} ${light ? "text-white" : "text-ink"}`}
        >
          {PRODUCT_NAME.replace(/\?$/, "")}
          <span className={light ? "text-white" : "text-brass-q"}>?</span>
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
