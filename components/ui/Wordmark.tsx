import { PRODUCT_NAME } from "@/lib/config";

/**
 * The brand mark (sticker album). The tile is a red rounded square with a cream "W" —
 * the same mark as the favicon and the share image. The wordmark sets the "?" in red.
 * Tone "light" is for placement on an ink/red surface.
 */
export function Crest({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true" focusable="false">
      <rect width="44" height="44" rx="8" fill="#CD3F28" />
      <text
        x="22"
        y="31"
        textAnchor="middle"
        fontSize="26"
        fontWeight="900"
        fill="#FFF6EC"
        style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
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
          className={`font-display font-black tracking-[-0.02em] ${textClassName} ${
            light ? "text-cream" : "text-ink"
          }`}
        >
          {PRODUCT_NAME.replace(/\?$/, "")}
          <span className={light ? "text-cream-onRed" : "text-red"}>?</span>
        </span>
        {tagline && (
          <span className="mt-1.5 font-display text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
            Know your next step
          </span>
        )}
      </span>
    </span>
  );
}
