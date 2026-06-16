import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og/fonts";
import { CrestEl } from "@/lib/og/render";

export const runtime = "nodejs";
export const dynamic = "force-static";

/** 512×512 PWA icon (referenced by app/manifest.ts; also used maskable). */
export function GET() {
  return new ImageResponse(<CrestEl size={512} />, { width: 512, height: 512, fonts: ogFonts() });
}
