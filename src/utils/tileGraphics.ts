import type { Tile } from '../engine/types';

const DOT_POS: Record<number, [number, number][]> = {
  1: [[22, 30]],
  2: [[32, 14], [12, 46]],
  3: [[32, 14], [22, 30], [12, 46]],
  4: [[12, 14], [32, 14], [12, 46], [32, 46]],
  5: [[12, 14], [32, 14], [22, 30], [12, 46], [32, 46]],
  6: [[12, 14], [12, 30], [12, 46], [32, 14], [32, 30], [32, 46]],
  7: [[12, 14], [12, 30], [12, 46], [32, 14], [32, 30], [32, 46], [22, 8]],
  8: [[12, 9], [12, 23], [12, 37], [12, 51], [32, 9], [32, 23], [32, 37], [32, 51]],
  9: [[12, 14], [22, 14], [32, 14], [12, 30], [22, 30], [32, 30], [12, 46], [22, 46], [32, 46]],
};

function dot(cx: number, cy: number, r: number = 6): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#2277cc" stroke="#0d4488" stroke-width="0.8"/>`
    + `<circle cx="${cx}" cy="${cy}" r="${r * 0.5}" fill="#55aaee" stroke="none"/>`
    + `<circle cx="${cx - 1.5}" cy="${cy - 1.5}" r="${r * 0.22}" fill="#aaddff" stroke="none"/>`;
}

function bamboo(cx: number, cy: number): string {
  const w = 6, h = 18;
  return `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="1.5" fill="#2d8e2d" stroke="#1a5e1a" stroke-width="0.5"/>`
    + `<line x1="${cx - w / 2}" y1="${cy - 4}" x2="${cx + w / 2}" y2="${cy - 4}" stroke="#1a5e1a" stroke-width="0.6"/>`
    + `<line x1="${cx - w / 2}" y1="${cy + 4}" x2="${cx + w / 2}" y2="${cy + 4}" stroke="#1a5e1a" stroke-width="0.6"/>`
    + `<rect x="${cx - w / 2 + 1}" y="${cy - h / 2 + 2}" width="${w - 2}" height="${h - 4}" rx="1" fill="#3da83d" stroke="none"/>`;
}

const NUM_CHARS = '一二三四伍六七八九';

export function getTileSVG(tile: Tile): string {
  let body = '';

  switch (tile.type) {
    case 'tong':
      body = DOT_POS[tile.value].map(([cx, cy]) => dot(cx, cy, tile.value === 1 ? 8 : 6)).join('');
      break;
    case 'tiao':
      if (tile.value === 1) {
        body = `<text x="22" y="32" text-anchor="middle" dominant-baseline="central" font-size="28" font-weight="bold" fill="#2d8e2d" font-family="serif">🐦</text>`;
      } else {
        body = DOT_POS[tile.value].map(([cx, cy]) => bamboo(cx, cy)).join('');
      }
      break;
    case 'wan':
      body = `<text x="22" y="24" text-anchor="middle" dominant-baseline="central" font-size="22" font-weight="bold" fill="#222" font-family="SimSun,serif">${NUM_CHARS[tile.value - 1]}</text>`
        + `<text x="22" y="44" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="bold" fill="#cc1111" font-family="SimSun,serif">萬</text>`;
      break;
    case 'feng': {
      const chars = '东南西北';
      body = `<text x="22" y="32" text-anchor="middle" dominant-baseline="central" font-size="26" font-weight="bold" fill="#222" font-family="SimSun,serif">${chars[tile.value - 1]}</text>`;
      break;
    }
    case 'jian':
      if (tile.value === 1) {
        body = `<rect x="6" y="8" width="32" height="44" rx="4" fill="#cc1111" stroke="#990000" stroke-width="1"/>`
          + `<text x="22" y="32" text-anchor="middle" dominant-baseline="central" font-size="28" font-weight="bold" fill="#fff" font-family="SimSun,serif">中</text>`;
      } else if (tile.value === 2) {
        body = `<rect x="6" y="8" width="32" height="44" rx="4" fill="#008800" stroke="#005500" stroke-width="1"/>`
          + `<text x="22" y="32" text-anchor="middle" dominant-baseline="central" font-size="24" font-weight="bold" fill="#fff" font-family="SimSun,serif">發</text>`;
      } else {
        body = `<rect x="8" y="10" width="28" height="40" rx="4" fill="#f5f5f0" stroke="#aaa" stroke-width="2"/>`
          + `<rect x="12" y="14" width="20" height="32" rx="2" fill="none" stroke="#ccc" stroke-width="1"/>`;
      }
      break;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 60" width="100%" height="100%">${body}</svg>`;
}
