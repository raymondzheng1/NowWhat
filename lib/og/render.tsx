/**
 * Shared JSX for next/og ImageResponse renders (satori subset — flexbox only, no
 * absolute layout tricks). The monogram crest: navy field, brass inset frame, serif "WN".
 */
export const OG = {
  navy: "#1b3a5b",
  brass: "#b08d57",
  brassQ: "#9c7a3e",
  brassText: "#6f5527",
  ivory: "#f7f4ee",
  ink: "#14253a",
  inkSoft: "#44566b",
  crestText: "#f3e7d0",
  serif: "Libre Baskerville",
};

export function CrestEl({ size }: { size: number }) {
  const inset = Math.round(size * 0.09);
  const inner = size - inset * 2;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: OG.navy,
        borderRadius: Math.round(size * 0.16),
      }}
    >
      <div
        style={{
          width: inner,
          height: inner,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `${Math.max(1, Math.round(size * 0.012))}px solid ${OG.brass}`,
          borderRadius: Math.round(size * 0.1),
        }}
      >
        <div
          style={{
            fontFamily: OG.serif,
            fontWeight: 700,
            fontSize: Math.round(size * 0.34),
            color: OG.crestText,
            lineHeight: 1,
          }}
        >
          WN
        </div>
      </div>
    </div>
  );
}
