import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Libre Baskerville (the brand serif) as font buffers for next/og ImageResponse, used by
 * the OG share image and the generated PNG app icons. The .woff files live in /assets
 * (not /public — they are read at build, never served). satori supports woff (not woff2).
 */
type OgFont = { name: string; data: Buffer; weight: 400 | 700; style: "normal" };

let cache: OgFont[] | null = null;

export function ogFonts(): OgFont[] {
  if (!cache) {
    const dir = join(process.cwd(), "assets");
    cache = [
      { name: "Libre Baskerville", data: readFileSync(join(dir, "lb-700.woff")), weight: 700, style: "normal" },
      { name: "Libre Baskerville", data: readFileSync(join(dir, "lb-400.woff")), weight: 400, style: "normal" },
    ];
  }
  return cache;
}
