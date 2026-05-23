import type { Tile } from '../engine/types';

const DOT_POS: Record<number, [number, number][]> = {
  1: [[22, 30]],
  2: [[22, 16], [22, 44]],
  3: [[32, 14], [22, 30], [12, 46]],
  4: [[12, 16], [32, 16], [12, 44], [32, 44]],
  5: [[12, 16], [32, 16], [22, 30], [12, 44], [32, 44]],
  6: [[12, 14], [12, 30], [12, 46], [32, 14], [32, 30], [32, 46]],
  7: [[12, 10], [22, 16], [32, 22], [12, 38], [32, 38], [12, 52], [32, 52]],
  8: [[12, 9], [12, 23], [12, 37], [12, 51], [32, 9], [32, 23], [32, 37], [32, 51]],
  9: [[10, 12], [22, 12], [34, 12], [10, 30], [22, 30], [34, 30], [10, 48], [22, 48], [34, 48]],
};

const COLORS = {
  blue: { fill: '#2277cc', stroke: '#0d4488', hl: '#55aaee', spec: '#aaddff' },
  green: { fill: '#2d8e2d', stroke: '#1a5e1a', hl: '#3da83d', spec: '#7ecf7e' },
  red: { fill: '#cc1111', stroke: '#990000', hl: '#ee4444', spec: '#ff8888' },
};

function dot(cx: number, cy: number, color: 'blue' | 'green' | 'red', r: number = 6): string {
  const c = COLORS[color];
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c.fill}" stroke="${c.stroke}" stroke-width="0.8"/>`
    + `<circle cx="${cx}" cy="${cy}" r="${r * 0.5}" fill="${c.hl}" stroke="none"/>`
    + `<circle cx="${cx - 1.5}" cy="${cy - 1.5}" r="${r * 0.22}" fill="${c.spec}" stroke="none"/>`;
}

const TONG_COLORS: Record<number, ('blue' | 'green' | 'red')[]> = {
  2: ['blue', 'green'],
  3: ['blue', 'green', 'blue'],
  4: ['green', 'blue', 'blue', 'green'],
  5: ['green', 'blue', 'red', 'blue', 'green'],
  6: ['green', 'blue', 'green', 'blue', 'green', 'blue'],
  7: ['green', 'green', 'green', 'green', 'blue', 'blue', 'green'],
  8: ['green', 'blue', 'green', 'blue', 'green', 'blue', 'green', 'blue'],
  9: ['blue', 'green', 'blue', 'blue', 'green', 'blue', 'blue', 'green', 'blue'],
};

function bambooStick(cx: number, cy: number, h: number = 20, color: 'green' | 'red' | 'blue' = 'green'): string {
  const w = 5;
  const c = color === 'green'
    ? { fill: '#2d8e2d', stroke: '#1a5e1a', hl: '#3da83d' }
    : color === 'red'
      ? { fill: '#cc1111', stroke: '#990000', hl: '#ee4444' }
      : { fill: '#2277cc', stroke: '#0d4488', hl: '#55aaee' };
  return `<rect x="${cx - w / 2}" y="${cy - h / 2 + 2}" width="${w}" height="${h - 4}" rx="2.5" fill="${c.fill}" stroke="${c.stroke}" stroke-width="0.5"/>`
    + `<line x1="${cx - w / 2}" y1="${cy - h / 6}" x2="${cx + w / 2}" y2="${cy - h / 6}" stroke="${c.stroke}" stroke-width="0.5"/>`
    + `<line x1="${cx - w / 2}" y1="${cy + h / 6}" x2="${cx + w / 2}" y2="${cy + h / 6}" stroke="${c.stroke}" stroke-width="0.5"/>`
    + `<rect x="${cx - w / 2 + 0.8}" y="${cy - h / 2 + 3}" width="${w - 1.6}" height="${h - 6}" rx="1.5" fill="${c.hl}" stroke="none"/>`;
}

function bambooLine(x1: number, y1: number, x2: number, y2: number): string {
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const angle = Math.atan2(x2 - x1, y2 - y1) * 180 / Math.PI;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const w = 4;
  return `<g transform="translate(${cx}, ${cy}) rotate(${angle})">`
    + `<line x1="0" y1="${-len / 2}" x2="0" y2="${len / 2}" stroke="#2d8e2d" stroke-width="${w}" stroke-linecap="round"/>`
    + `<line x1="${-w / 2 - 0.5}" y1="${-len / 6}" x2="${w / 2 + 0.5}" y2="${-len / 6}" stroke="#1a5e1a" stroke-width="0.5"/>`
    + `<line x1="${-w / 2 - 0.5}" y1="${len / 6}" x2="${w / 2 + 0.5}" y2="${len / 6}" stroke="#1a5e1a" stroke-width="0.5"/>`
    + `</g>`;
}

function bird(): string {
  return `<path d="M14,14 Q12,8 18,6 Q24,4 28,10 Q32,16 26,22 L28,32 Q32,40 26,48 Q22,52 18,44 L16,34 Q10,28 14,20 Z" fill="#2277cc" stroke="#0d4488" stroke-width="0.5"/>`
    + `<circle cx="14" cy="10" r="5" fill="#cc1111" stroke="#990000" stroke-width="0.5"/>`
    + `<path d="M10,6 L6,2 L12,7 Z" fill="#cc1111"/>`
    + `<path d="M9,10 L3,12 L9,14 Z" fill="#ffcc00" stroke="#ddaa00" stroke-width="0.3"/>`
    + `<path d="M26,22 Q36,28 32,42 Q30,48 26,38" fill="#cc1111" stroke="#990000" stroke-width="0.5"/>`
    + `<path d="M22,26 Q32,34 28,48 Q26,54 22,42" fill="#cc1111" stroke="#990000" stroke-width="0.5"/>`
    + `<line x1="20" y1="34" x2="18" y2="44" stroke="#cc1111" stroke-width="0.8"/>`
    + `<line x1="24" y1="34" x2="26" y2="44" stroke="#cc1111" stroke-width="0.8"/>`;
}

const TIAO_POS: Record<number, [number, number, number][]> = {
  2: [[22, 16, 20], [22, 44, 20]],
  3: [[22, 14, 20], [22, 30, 20], [22, 46, 20]],
  4: [[12, 18, 20], [32, 18, 20], [12, 42, 20], [32, 42, 20]],
  5: [[12, 18, 20], [32, 18, 20], [22, 30, 20], [12, 42, 20], [32, 42, 20]],
  6: [[12, 14, 18], [12, 30, 18], [12, 46, 18], [32, 14, 18], [32, 30, 18], [32, 46, 18]],
  7: [[10, 16, 14], [10, 30, 14], [10, 44, 14], [22, 30, 32], [34, 16, 14], [34, 30, 14], [34, 44, 14]],
  9: [[10, 12, 18], [22, 12, 18], [34, 12, 18], [10, 30, 18], [22, 30, 18], [34, 30, 18], [10, 48, 18], [22, 48, 18], [34, 48, 18]],
};

const TIAO_COLORS: Record<number, ('green' | 'red')[]> = {
  2: ['green', 'green'],
  3: ['green', 'green', 'green'],
  4: ['green', 'green', 'green', 'green'],
  5: ['green', 'green', 'red', 'green', 'green'],
  6: ['green', 'green', 'green', 'green', 'green', 'green'],
  7: ['green', 'green', 'green', 'green', 'green', 'green', 'green'],
  9: ['green', 'red', 'green', 'green', 'red', 'green', 'green', 'red', 'green'],
};

function eightTiao(): string {
  // 上半 W 形：左右竖条 + 两根斜条从竖条末端向下汇聚到中间
  return bambooLine(10, 8, 10, 26)       // 左竖条
    + bambooLine(34, 8, 34, 26)          // 右竖条
    + bambooLine(10, 13, 22, 26)         // 左斜条从竖条末端汇聚
    + bambooLine(34, 13, 22, 26)         // 右斜条从竖条末端汇聚
    // 下半 M 形：左右竖条 + 两根斜条从竖条顶端向上汇聚到中间
    + bambooLine(10, 34, 10, 52)         // 左竖条
    + bambooLine(34, 34, 34, 52)         // 右竖条
    + bambooLine(10, 47, 22, 34)         // 左斜条从竖条顶端汇聚
    + bambooLine(34, 47, 22, 34);        // 右斜条从竖条顶端汇聚
}

const NUM_CHARS = '一二三四五六七八九';

export function getTileSVG(tile: Tile): string {
  let body = '';

  switch (tile.type) {
    case 'tong':
      if (tile.value === 1) {
        body = `<circle cx="22" cy="30" r="18" fill="#2277cc" stroke="#0d4488" stroke-width="1"/>`
          + `<circle cx="22" cy="30" r="13" fill="#e8f4fc" stroke="#55aaee" stroke-width="0.8"/>`
          + `<circle cx="22" cy="30" r="5" fill="#cc1111" stroke="none"/>`
          + `<circle cx="20" cy="28" r="1.5" fill="#ffaaaa" stroke="none"/>`;
      } else {
        const colors = TONG_COLORS[tile.value];
        const r = tile.value === 9 ? 5 : 6;
        body = DOT_POS[tile.value].map(([cx, cy], i) => dot(cx, cy, colors[i], r)).join('');
      }
      break;
    case 'tiao':
      if (tile.value === 1) {
        body = bird();
      } else if (tile.value === 7) {
        body = bambooStick(22, 12, 18, 'red')
          + bambooStick(10, 30, 18, 'green')
          + bambooStick(22, 30, 18, 'blue')
          + bambooStick(34, 30, 18, 'green')
          + bambooStick(10, 48, 18, 'green')
          + bambooStick(22, 48, 18, 'blue')
          + bambooStick(34, 48, 18, 'green');
      } else if (tile.value === 8) {
        body = eightTiao();
      } else {
        const positions = TIAO_POS[tile.value];
        const colors = TIAO_COLORS[tile.value];
        body = positions.map(([cx, cy, h], i) => bambooStick(cx, cy, h, colors[i])).join('');
      }
      break;
    case 'wan':
      body = `<text x="22" y="16" text-anchor="middle" dominant-baseline="central" font-size="18" font-weight="bold" fill="#2a52be" font-family="SimSun,serif">${NUM_CHARS[tile.value - 1]}</text>`
        + `<text x="22" y="40" text-anchor="middle" dominant-baseline="central" font-size="18" font-weight="bold" fill="#cc1111" font-family="SimSun,serif">萬</text>`;
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
