import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og/fonts";
import { CrestEl, OG } from "@/lib/og/render";
import { getFaq, getPublishedFaqs } from "@/lib/faq/load";

export const runtime = "nodejs";
export const alt = "What Now? — common question";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getPublishedFaqs().map((f) => ({ slug: f.slug }));
}

/** Per-article share card: the question in Archivo on cream paper, tile + ink rules. */
export default async function FaqOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const question = getFaq(slug)?.question ?? "Common questions";

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column", background: OG.paper }}>
        <div style={{ height: 12, background: OG.red }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <CrestEl size={62} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontFamily: OG.display, fontWeight: 900, fontSize: 26, color: OG.ink }}>What Now?</span>
              <span style={{ fontFamily: OG.display, fontSize: 14, letterSpacing: 4, color: OG.tan, fontWeight: 900, marginTop: 5 }}>
                COMMON QUESTIONS · VICTORIA
              </span>
            </div>
          </div>
          <div style={{ fontFamily: OG.display, fontWeight: 900, fontSize: 52, lineHeight: 1.14, color: OG.ink, maxWidth: 1040 }}>
            {question}
          </div>
          <div style={{ fontFamily: OG.display, fontWeight: 400, fontSize: 24, color: OG.inkSoft }}>
            Free, plain-English help with a Victorian government decision.
          </div>
        </div>
        <div style={{ height: 12, background: OG.ink }} />
      </div>
    ),
    { ...size, fonts: ogFonts() },
  );
}
