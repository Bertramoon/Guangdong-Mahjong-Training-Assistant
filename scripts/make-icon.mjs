import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'resources'), { recursive: true });

const tile = (size) => `
  <g transform="translate(${size * 0.21}, ${size * 0.11}) rotate(8 ${size * 0.29} ${size * 0.39})">
    <rect width="${size * 0.585}" height="${size * 0.78}" rx="${size * 0.07}" fill="#f7f3e8"/>
    <rect width="${size * 0.585}" height="${size * 0.78}" rx="${size * 0.07}"
      fill="none" stroke="#c9c2ad" stroke-width="${size * 0.01}"/>
    <circle cx="${size * 0.2925}" cy="${size * 0.27}" r="${size * 0.058}" fill="#1a5c3a"/>
    <circle cx="${size * 0.2925}" cy="${size * 0.27}" r="${size * 0.033}" fill="#f7f3e8"/>
    <text x="${size * 0.2925}" y="${size * 0.72}"
      font-family="Microsoft YaHei, SimSun, serif" font-size="${size * 0.47}"
      font-weight="bold" fill="#c0392b" text-anchor="middle">萬</text>
  </g>`;

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="felt" cx="50%" cy="32%" r="80%">
      <stop offset="0%" stop-color="#2a7a4f"/>
      <stop offset="100%" stop-color="#123f28"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#felt)"/>${tile(1024)}
</svg>`;

const splashSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
  <defs>
    <radialGradient id="felt" cx="50%" cy="40%" r="75%">
      <stop offset="0%" stop-color="#1e6b43"/>
      <stop offset="100%" stop-color="#0e2f1d"/>
    </radialGradient>
  </defs>
  <rect width="2732" height="2732" fill="url(#felt)"/>${tile(2732)}
</svg>`;

writeFileSync(join(root, 'resources', 'icon.svg'), iconSvg);
writeFileSync(join(root, 'resources', 'splash.svg'), splashSvg);
console.log('SVG written to resources/');
