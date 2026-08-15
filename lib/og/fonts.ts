import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Archivo (the brand display face) as font buffers for next/og ImageResponse, used by the
 * OG share images. The .ttf files live in /assets (not /public — they are read at build,
 * never served). satori supports ttf/otf/woff (not woff2).
 */
type OgFont = { name: string; data: Buffer; weight: 400 | 900; style: "normal" };

let cache: OgFont[] | null = null;

export function ogFonts(): OgFont[] {
  if (!cache) {
    const dir = join(process.cwd(), "assets");
    cache = [
      { name: "Archivo", data: readFileSync(join(dir, "archivo-900.ttf")), weight: 900, style: "normal" },
      { name: "Archivo", data: readFileSync(join(dir, "archivo-400.ttf")), weight: 400, style: "normal" },
    ];
  }
  return cache;
}
