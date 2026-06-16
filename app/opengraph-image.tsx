import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og/fonts";
import { CrestEl, OG } from "@/lib/og/render";

export const runtime = "nodejs";
export const alt = "What Now? — free, plain-English help with a Victorian government decision";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The 1200×630 social share image: crest + wordmark on ivory with brass/navy rules. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column", background: OG.ivory }}>
        <div style={{ height: 10, background: OG.brass }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <CrestEl size={130} />
          <div style={{ display: "flex", alignItems: "baseline", marginTop: 36 }}>
            <div style={{ fontFamily: OG.serif, fontWeight: 700, fontSize: 88, color: OG.ink, lineHeight: 1 }}>What Now</div>
            <div style={{ fontFamily: OG.serif, fontWeight: 700, fontSize: 88, color: OG.brassQ, lineHeight: 1 }}>?</div>
          </div>
          <div style={{ marginTop: 20, fontFamily: OG.serif, fontWeight: 700, fontSize: 21, letterSpacing: 6, color: OG.brassText }}>
            KNOW YOUR NEXT STEP
          </div>
          <div style={{ marginTop: 30, fontFamily: OG.serif, fontWeight: 400, fontSize: 31, color: OG.inkSoft, maxWidth: 860, textAlign: "center", lineHeight: 1.4 }}>
            Free, plain-English help with a Victorian government decision.
          </div>
        </div>
        <div style={{ height: 10, background: OG.navy }} />
      </div>
    ),
    { ...size, fonts: ogFonts() },
  );
}
