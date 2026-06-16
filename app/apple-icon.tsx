import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og/fonts";
import { CrestEl } from "@/lib/og/render";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Apple touch icon (opaque navy crest). */
export default function AppleIcon() {
  return new ImageResponse(<CrestEl size={180} />, { ...size, fonts: ogFonts() });
}
