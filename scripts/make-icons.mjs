// Temporary app icon: a ring with a dot (SPEC «Іконки»). The real logo is a separate task for the artist.
// Draws PNGs with plain Node (no dependencies). Run: npm run icons

import { mkdirSync, writeFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';

const BG = [0x0b, 0x0c, 0x10];
const ACCENT = [0xff, 0xb5, 0x47];

// Geometry as a share of the icon size. Everything fits inside the 80% maskable safe zone.
const RING_RADIUS = 0.3;
const RING_WIDTH = 0.055;
const DOT_RADIUS = 0.075;
const SAMPLES = 4; // 4×4 samples per pixel for smooth edges

function accentCoverage(x, y, size) {
  const c = size / 2;
  let hits = 0;
  for (let sy = 0; sy < SAMPLES; sy++) {
    for (let sx = 0; sx < SAMPLES; sx++) {
      const dx = x + (sx + 0.5) / SAMPLES - c;
      const dy = y + (sy + 0.5) / SAMPLES - c;
      const d = Math.hypot(dx, dy) / size;
      const onRing = Math.abs(d - RING_RADIUS) <= RING_WIDTH / 2;
      const onDot = d <= DOT_RADIUS;
      if (onRing || onDot) hits++;
    }
  }
  return hits / (SAMPLES * SAMPLES);
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3); // first byte: filter type 0
    for (let x = 0; x < size; x++) {
      const a = accentCoverage(x, y, size);
      for (let ch = 0; ch < 3; ch++) {
        row[1 + x * 3 + ch] = Math.round(BG[ch] * (1 - a) + ACCENT[ch] * a);
      }
    }
    rows.push(row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (rgb) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="${hex(BG)}"/>
  <circle cx="50" cy="50" r="${RING_RADIUS * 100}" fill="none" stroke="${hex(ACCENT)}" stroke-width="${RING_WIDTH * 100}"/>
  <circle cx="50" cy="50" r="${DOT_RADIUS * 100}" fill="${hex(ACCENT)}"/>
</svg>
`;

const out = new URL('../public/icons/', import.meta.url);
mkdirSync(out, { recursive: true });
writeFileSync(new URL('icon-192.png', out), png(192));
writeFileSync(new URL('icon-512.png', out), png(512));
writeFileSync(new URL('icon-maskable-512.png', out), png(512));
writeFileSync(new URL('apple-touch-icon.png', out), png(180));
writeFileSync(new URL('icon.svg', out), svg);
console.log('Icons written to public/icons/');
