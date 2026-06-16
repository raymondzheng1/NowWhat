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

/** Per-article share card: the question in serif on ivory, with the crest + rules. */
export default async function FaqOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const question = getFaq(slug)?.question ?? "Common questions";

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column", background: OG.ivory }}>
        <div style={{ height: 10, background: OG.brass }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <CrestEl size={62} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontFamily: OG.serif, fontWeight: 700, fontSize: 26, color: OG.ink }}>What Now?</span>
              <span style={{ fontSize: 14, letterSpacing: 4, color: OG.brassText, fontWeight: 700, marginTop: 5 }}>
                COMMON QUESTIONS · VICTORIA
              </span>
            </div>
          </div>
          <div style={{ fontFamily: OG.serif, fontWeight: 700, fontSize: 52, lineHeight: 1.16, color: OG.navy, maxWidth: 1040 }}>
            {question}
          </div>
          <div style={{ fontSize: 24, color: OG.inkSoft }}>
            Free, plain-English help with a Victorian government decision.
          </div>
        </div>
        <div style={{ height: 10, background: OG.navy }} />
      </div>
    ),
    { ...size, fonts: ogFonts() },
  );
}
