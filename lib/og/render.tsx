/**
 * Shared JSX for next/og ImageResponse renders (satori subset — flexbox only, no
 * absolute layout tricks). K2 monogram crest: deep-teal field, copper inset frame,
 * serif "WN" in cream. Names kept (navy/brass/ivory) but pointed at K2 values.
 */
export const OG = {
  navy: "#10363d",
  brass: "#c79a52",
  brassQ: "#c79a52",
  brassText: "#8a6526",
  ivory: "#e8ddc7",
  ink: "#1c2a2b",
  inkSoft: "#566163",
  crestText: "#eef0e8",
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
