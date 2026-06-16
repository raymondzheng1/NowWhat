// Generates app/favicon.ico — the legacy fallback favicon (modern browsers use the
// scalable app/icon.svg instead). next/og emits PNG, not ICO, so this wraps a small
// hand-rolled crest PNG (navy field + brass inset frame) in a PNG-in-ICO container.
// Run once: `node scripts/make-favicon.mjs`. No image dependency.

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NAVY = [27, 58, 91]; // #1b3a5b
const BRASS = [176, 141, 87]; // #b08d57
const SIZE = 32;

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function makePng(size) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  const pad = Math.round(size * 0.12);
  const thk = Math.max(1, Math.round(size * 0.06));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const inFrame = x >= pad && x < size - pad && y >= pad && y < size - pad;
      const onRing =
        inFrame && (x < pad + thk || x >= size - pad - thk || y < pad + thk || y >= size - pad - thk);
      const [r, g, b] = onRing ? BRASS : NAVY;
      const off = y * (size * 3 + 1) + 1 + x * 3;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

// Wrap the PNG in a single-image ICO (PNG-in-ICO is supported by all modern browsers).
const png = makePng(SIZE);
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // image count
const entry = Buffer.alloc(16);
entry[0] = SIZE % 256; // width (0 = 256)
entry[1] = SIZE % 256; // height
entry[2] = 0; // palette
entry[3] = 0; // reserved
entry.writeUInt16LE(1, 4); // planes
entry.writeUInt16LE(32, 6); // bpp
entry.writeUInt32LE(png.length, 8); // size of image data
entry.writeUInt32LE(6 + 16, 12); // offset to image data
writeFileSync(resolve(ROOT, "app/favicon.ico"), Buffer.concat([header, entry, png]));
console.log("Wrote app/favicon.ico");
