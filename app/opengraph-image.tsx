import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og/fonts";
import { CrestEl, OG } from "@/lib/og/render";

export const runtime = "nodejs";
export const alt = "What Now? — free, plain-English help with a Victorian government decision";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The 1200x630 social share image: the brand tile + wordmark on cream paper, ink rules. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column", background: OG.paper }}>
        <div style={{ height: 12, background: OG.red }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <CrestEl size={128} />
          <div style={{ display: "flex", alignItems: "baseline", marginTop: 34 }}>
            <div style={{ fontFamily: OG.display, fontWeight: 900, fontSize: 92, color: OG.ink, lineHeight: 1, letterSpacing: -3 }}>What Now</div>
            <div style={{ fontFamily: OG.display, fontWeight: 900, fontSize: 92, color: OG.red, lineHeight: 1 }}>?</div>
          </div>
          <div style={{ marginTop: 22, fontFamily: OG.display, fontWeight: 900, fontSize: 20, letterSpacing: 7, color: OG.tan }}>
            THEY SAID NO. YOU MAY SAY: LOOK AGAIN.
          </div>
          <div style={{ marginTop: 28, fontFamily: OG.display, fontWeight: 400, fontSize: 30, color: OG.inkSoft, maxWidth: 880, textAlign: "center", lineHeight: 1.4 }}>
            Free, plain-English help with a government decision. No account, nothing stored.
          </div>
        </div>
        <div style={{ height: 12, background: OG.ink }} />
      </div>
    ),
    { ...size, fonts: ogFonts() },
  );
}
