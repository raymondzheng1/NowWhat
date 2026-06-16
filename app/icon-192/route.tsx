import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og/fonts";
import { CrestEl } from "@/lib/og/render";

export const runtime = "nodejs";
export const dynamic = "force-static";

/** 192×192 PWA icon (referenced by app/manifest.ts). Generated once at build. */
export function GET() {
  return new ImageResponse(<CrestEl size={192} />, { width: 192, height: 192, fonts: ogFonts() });
}
