/**
 * Build-time PWA icon renderer.
 *
 * The GitHub connector cannot carry binary files, so the app icons are
 * drawn from code at build time instead of being committed as PNGs.
 * This script rasterises the studio mark (the same polyline as the SVG
 * favicon: a rising signal line on a near-black rounded square) with a
 * tiny pure-Node PNG encoder — no native dependencies, works in CI.
 * Output: dist/icons/icon-192.png, icon-512.png, icon-maskable-512.png,
 * apple-touch-icon.png (180).
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BG = [2, 6, 23];        // slate-950 #020617
const MARK = [52, 211, 153];  // emerald-400 #34d399
const POINTS = [[9, 21], [14, 11], [18, 18], [20, 15], [23, 21]]; // 32-grid, from the favicon

// --- minimal PNG encoder (8-bit RGBA) ---
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // bit depth 8, colour type 6 (RGBA)
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- rasteriser (supersampled SDF) ---
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const cx = x1 + t * dx, cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}
function render(size, { maskable = false } = {}) {
  const SS = 4; // supersample factor
  const big = size * SS;
  const px = new Float32Array(big * big * 4);
  const scale = big / 32;
  const markScale = maskable ? 0.76 : 1; // maskable safe zone
  const off = (1 - markScale) * 16;      // in grid units, centres the mark
  const halfStroke = 1.35;               // grid units (favicons's 2.4/2, slightly bolder for small sizes)
  const radius = maskable ? 0 : 7.5;     // rounded-corner radius in grid units ('any' icons)
  const aa = 1.2 / scale * SS;           // anti-alias width in grid units
  for (let y = 0; y < big; y++) {
    for (let x = 0; x < big; x++) {
      const gx = (x + 0.5) / scale, gy = (y + 0.5) / scale;
      // background: rounded rect over the 32-grid (full-bleed when maskable)
      let bgA = 1;
      if (!maskable) {
        const qx = Math.max(Math.abs(gx - 16) - (16 - radius), 0);
        const qy = Math.max(Math.abs(gy - 16) - (16 - radius), 0);
        const d = Math.hypot(qx, qy) - radius;
        bgA = Math.max(0, Math.min(1, 0.5 - d / aa));
      }
      // mark: distance to the polyline
      const mx = (gx - off) / markScale, my = (gy - off) / markScale;
      let dMin = Infinity;
      for (let i = 0; i < POINTS.length - 1; i++) {
        dMin = Math.min(dMin, distToSegment(mx, my, ...POINTS[i], ...POINTS[i + 1]));
      }
      const markA = Math.max(0, Math.min(1, 0.5 - (dMin - halfStroke) / aa));
      const o = (y * big + x) * 4;
      px[o] = BG[0] + (MARK[0] - BG[0]) * markA;
      px[o + 1] = BG[1] + (MARK[1] - BG[1]) * markA;
      px[o + 2] = BG[2] + (MARK[2] - BG[2]) * markA;
      px[o + 3] = 255 * bgA;
    }
  }
  // box downsample to the target size
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * big + (x * SS + sx)) * 4;
          r += px[i]; g += px[i + 1]; b += px[i + 2]; a += px[i + 3];
        }
      }
      const o = (y * size + x) * 4, n = SS * SS;
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = a / n;
    }
  }
  return encodePng(size, out);
}

const dist = new URL('../dist/', import.meta.url).pathname;
const dir = join(dist, 'icons');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'icon-192.png'), render(192));
writeFileSync(join(dir, 'icon-512.png'), render(512));
writeFileSync(join(dir, 'icon-maskable-512.png'), render(512, { maskable: true }));
writeFileSync(join(dir, 'apple-touch-icon.png'), render(180, { maskable: true }));
console.log('build-icons: 4 icons written to dist/icons');
