import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'resources'), { recursive: true });

const tile = (size) => `
  <defs>
    <linearGradient id="zhongGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e8543f"/>
      <stop offset="100%" stop-color="#b3271c"/>
    </linearGradient>
    <filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${size * 0.012}"/>
    </filter>
    <style>@import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&amp;display=swap');</style>
  </defs>
  <g transform="rotate(-10 ${size * 0.5} ${size * 0.5})">
    <ellipse cx="${size * 0.5}" cy="${size * 0.9}" rx="${size * 0.36}" ry="${size * 0.055}"
      fill="rgba(0,0,0,0.3)" filter="url(#softBlur)"/>
    <g transform="translate(${size * 0.21}, ${size * 0.11})">
      <rect x="${size * 0.02}" y="${size * 0.022}" width="${size * 0.585}" height="${size * 0.78}" rx="${size * 0.07}" fill="#d9d2bd"/>
      <rect width="${size * 0.585}" height="${size * 0.78}" rx="${size * 0.07}" fill="#f7f3e8"/>
      <rect width="${size * 0.585}" height="${size * 0.78}" rx="${size * 0.07}"
        fill="none" stroke="#c9c2ad" stroke-width="${size * 0.01}"/>
      <rect x="${size * 0.055}" y="${size * 0.05}" width="${size * 0.475}" height="${size * 0.3}" rx="${size * 0.055}"
        fill="rgba(255,255,255,0.35)"/>
      <text x="${size * 0.2925}" y="${size * 0.40}"
        dominant-baseline="central"
        font-family="Ma Shan Zheng, KaiTi, STKaiti, serif" font-size="${size * 0.6}"
        font-weight="bold" fill="url(#zhongGrad)" stroke="#8f1d14" stroke-width="${size * 0.01}"
        paint-order="stroke" text-anchor="middle">中</text>
    </g>
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
