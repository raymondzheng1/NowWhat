/**
 * Shared JSX for next/og ImageResponse renders (satori subset — flexbox only, no absolute
 * layout tricks). Sticker-album mark: a red rounded tile with a cream "W", matching the
 * favicon. Legacy key names are kept so the image routes need no rewiring.
 */
export const OG = {
  paper: "#F6EDD9",
  ink: "#2B2417",
  inkSoft: "#5C5138",
  tan: "#8A7A55",
  red: "#CD3F28",
  cream: "#FFF6EC",
  amber: "#E0A52C",
  display: "Archivo",
  // legacy aliases used by the image routes
  navy: "#2B2417",
  brass: "#E0452C",
  brassQ: "#E0452C",
  brassText: "#8A7A55",
  ivory: "#F6EDD9",
  crestText: "#FFF6EC",
  serif: "Archivo",
};

/** The brand tile — red sticker with a cream W (same mark as the favicon). */
export function CrestEl({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: OG.red,
        borderRadius: Math.round(size * 0.19),
      }}
    >
      <div
        style={{
          fontFamily: OG.display,
          fontWeight: 900,
          fontSize: Math.round(size * 0.6),
          color: OG.cream,
          lineHeight: 1,
        }}
      >
        W
      </div>
    </div>
  );
}
