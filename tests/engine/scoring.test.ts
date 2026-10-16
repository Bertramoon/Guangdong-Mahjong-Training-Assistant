import { describe, it, expect } from 'vitest';
import { calculateFan, type FanContext } from '../../src/engine/scoring';
import type { Tile, TileType, Meld } from '../../src/engine/types';

let _id = 0;
function t(type: TileType, value: number): Tile {
  return { type, value, id: _id++ };
}
/** [type, value, count][] → Tile[] */
function tiles(spec: [TileType, number, number][]): Tile[] {
  const out: Tile[] = [];
  for (const [type, value, count] of spec) {
    for (let i = 0; i < count; i++) out.push(t(type, value));
  }
  return out;
}
function fansOf(r: { fans: { name: string }[] }): string[] {
  return r.fans.map(f => f.name);
}
function hasFan(fans: string[], name: string): boolean {
  return fans.includes(name);
}

const SELF: FanContext = { isKongBlossom: false };

describe('calculateFan - 纯推倒胡计分', () => {
  it('含鬼平胡：基础 1 番 / 2 分，无其他加成', () => {
    // 鬼牌(条1)充当将牌
    const hand = tiles([
      ['wan', 1, 1], ['wan', 2, 1], ['wan', 3, 1],
      ['tiao', 4, 1], ['tiao', 5, 1], ['tiao', 6, 1],
      ['tong', 7, 1], ['tong', 8, 1], ['tong', 9, 1],
      ['jian', 1, 3], ['tiao', 1, 2],
    ]);
    const r = calculateFan(hand, [], 'tiao', 1, SELF);
    expect(fansOf(r)).toEqual(['平胡']);
    expect(r.totalFan).toBe(1);
    expect(r.score).toBe(2);
  });

  it('无鬼平胡：平胡 + 无鬼硬胡 = 2 番 / 4 分', () => {
    const hand = tiles([
      ['wan', 1, 1], ['wan', 2, 1], ['wan', 3, 1],
      ['tiao', 4, 1], ['tiao', 5, 1], ['tiao', 6, 1],
      ['tong', 7, 1], ['tong', 8, 1], ['tong', 9, 1],
      ['jian', 1, 3], ['tiao', 5, 2],
    ]);
    const r = calculateFan(hand, [], null, null, SELF);
    expect(hasFan(fansOf(r), '平胡')).toBe(true);
    expect(hasFan(fansOf(r), '无鬼硬胡')).toBe(true);
    expect(r.totalFan).toBe(2);
    expect(r.score).toBe(4);
  });

  it('杠上开花 ×2：平胡 + 无鬼 + 杠开 = 3 番 / 8 分', () => {
    const hand = tiles([
      ['wan', 1, 1], ['wan', 2, 1], ['wan', 3, 1],
      ['tiao', 4, 1], ['tiao', 5, 1], ['tiao', 6, 1],
      ['tong', 7, 1], ['tong', 8, 1], ['tong', 9, 1],
      ['jian', 1, 3], ['tiao', 5, 2],
    ]);
    const r = calculateFan(hand, [], null, null, { isKongBlossom: true });
    expect(hasFan(fansOf(r), '杠上开花')).toBe(true);
    expect(r.totalFan).toBe(3);
    expect(r.score).toBe(8);
  });

  it('混一色/碰碰胡等牌型不加番：混一色胡只算 平胡+无鬼 = 2 番 / 4 分', () => {
    const hand = tiles([
      ['wan', 1, 1], ['wan', 2, 1], ['wan', 3, 1],
      ['tiao', 4, 1], ['tiao', 5, 1], ['tiao', 6, 1],
      ['wan', 7, 1], ['wan', 8, 1], ['wan', 9, 1],
      ['jian', 1, 3], ['wan', 5, 2],
    ]);
    const r = calculateFan(hand, [], null, null, SELF);
    expect(fansOf(r)).toEqual(['平胡', '无鬼硬胡']);
    expect(r.totalFan).toBe(2);
  });

  it('碰副露的碰碰胡不加番：只算 平胡+无鬼 = 2 番 / 4 分', () => {
    const concealed = tiles([
      ['wan', 1, 3], ['tiao', 3, 3], ['jian', 1, 3], ['tong', 5, 2],
    ]);
    const peng: Meld = { type: 'peng', tiles: [t('tong', 6), t('tong', 6), t('tong', 6)] };
    const r = calculateFan(concealed, [peng], null, null, SELF);
    expect(fansOf(r)).toEqual(['平胡', '无鬼硬胡']);
    expect(r.totalFan).toBe(2);
  });

  it('大胡：清一色 → 平胡+清一色+无鬼 = 3 番 / 8 分', () => {
    const hand = tiles([
      ['wan', 1, 3], ['wan', 2, 1], ['wan', 3, 1], ['wan', 4, 1],
      ['wan', 5, 1], ['wan', 6, 1], ['wan', 7, 1],
      ['wan', 8, 1], ['wan', 9, 1], ['wan', 5, 2],
    ]);
    const r = calculateFan(hand, [], null, null, SELF);
    expect(hasFan(fansOf(r), '清一色')).toBe(true);
    expect(r.totalFan).toBe(3);
    expect(r.score).toBe(8);
  });

  it('大胡：字一色（优先于小四喜）→ 3 番 / 8 分', () => {
    const hand = tiles([
      ['feng', 1, 3], ['feng', 2, 3], ['feng', 3, 3],
      ['jian', 1, 3], ['feng', 4, 2],
    ]);
    const r = calculateFan(hand, [], null, null, SELF);
    expect(hasFan(fansOf(r), '字一色')).toBe(true);
    expect(hasFan(fansOf(r), '小四喜')).toBe(false);
    expect(r.totalFan).toBe(3);
  });

  it('大胡：七对 → 3 番 / 8 分', () => {
    const hand = tiles([
      ['wan', 1, 2], ['wan', 2, 2], ['tiao', 4, 2], ['tiao', 5, 2],
      ['tong', 6, 2], ['jian', 1, 2], ['jian', 2, 2],
    ]);
    const r = calculateFan(hand, [], null, null, SELF);
    expect(hasFan(fansOf(r), '七对')).toBe(true);
    expect(r.totalFan).toBe(3);
  });

  it('大胡：四暗刻（门清全暗刻）→ 3 番 / 8 分', () => {
    const hand = tiles([
      ['wan', 1, 3], ['tiao', 3, 3], ['tong', 4, 3],
      ['wan', 5, 3], ['tong', 6, 2],
    ]);
    const r = calculateFan(hand, [], null, null, SELF);
    expect(hasFan(fansOf(r), '四暗刻')).toBe(true);
    expect(r.totalFan).toBe(3);
  });

  it('大胡：十八罗汉（4 杠 + 将）→ 3 番 / 8 分', () => {
    const melds: Meld[] = [
      { type: 'ming_gang', tiles: tiles([['wan', 1, 4]]), source: 1 },
      { type: 'an_gang', tiles: tiles([['tiao', 2, 4]]) },
      { type: 'jia_gang', tiles: tiles([['tong', 3, 4]]) },
      { type: 'ming_gang', tiles: tiles([['feng', 1, 4]]), source: 2 },
    ];
    const concealed = tiles([['tong', 5, 2]]);
    const r = calculateFan(concealed, melds, null, null, SELF);
    expect(hasFan(fansOf(r), '十八罗汉')).toBe(true);
    expect(r.totalFan).toBe(3);
  });

  it('大胡：大三元 → 3 番 / 8 分', () => {
    const hand = tiles([
      ['jian', 1, 3], ['jian', 2, 3], ['jian', 3, 3],
      ['wan', 1, 1], ['wan', 2, 1], ['wan', 3, 1], ['wan', 5, 2],
    ]);
    const r = calculateFan(hand, [], null, null, SELF);
    expect(hasFan(fansOf(r), '大三元')).toBe(true);
    expect(r.totalFan).toBe(3);
  });

  it('大胡：大四喜 → 3 番 / 8 分', () => {
    const hand = tiles([
      ['feng', 1, 3], ['feng', 2, 3], ['feng', 3, 3], ['feng', 4, 3],
      ['wan', 5, 2],
    ]);
    const r = calculateFan(hand, [], null, null, SELF);
    expect(hasFan(fansOf(r), '大四喜')).toBe(true);
    expect(r.totalFan).toBe(3);
  });

  it('大胡：小四喜 → 3 番 / 8 分', () => {
    const hand = tiles([
      ['feng', 1, 3], ['feng', 2, 3], ['feng', 3, 3], ['feng', 4, 2],
      ['wan', 1, 1], ['wan', 2, 1], ['wan', 3, 1],
    ]);
    const r = calculateFan(hand, [], null, null, SELF);
    expect(hasFan(fansOf(r), '小四喜')).toBe(true);
    expect(r.totalFan).toBe(3);
  });

  it('大胡：十三幺 → 3 番 / 8 分', () => {
    const hand = tiles([
      ['wan', 1, 1], ['wan', 9, 1], ['tiao', 1, 1], ['tiao', 9, 1],
      ['tong', 1, 1], ['tong', 9, 1],
      ['feng', 1, 1], ['feng', 2, 1], ['feng', 3, 1], ['feng', 4, 1],
      ['jian', 1, 2], ['jian', 2, 1], ['jian', 3, 1],
    ]);
    const r = calculateFan(hand, [], null, null, SELF);
    expect(hasFan(fansOf(r), '十三幺')).toBe(true);
    expect(r.totalFan).toBe(3);
  });

  it('大胡不累计：清一色七对只记清一色 → 3 番', () => {
    const hand = tiles([
      ['wan', 1, 2], ['wan', 2, 2], ['wan', 3, 2], ['wan', 4, 2],
      ['wan', 5, 2], ['wan', 6, 2], ['wan', 7, 2],
    ]);
    const r = calculateFan(hand, [], null, null, SELF);
    expect(hasFan(fansOf(r), '清一色')).toBe(true);
    expect(hasFan(fansOf(r), '七对')).toBe(false);
    expect(r.totalFan).toBe(3);
  });

  it('大胡与杠上开花叠加：清一色+无鬼+杠开 = 4 番 / 16 分', () => {
    const hand = tiles([
      ['wan', 1, 3], ['wan', 2, 1], ['wan', 3, 1], ['wan', 4, 1],
      ['wan', 5, 1], ['wan', 6, 1], ['wan', 7, 1],
      ['wan', 8, 1], ['wan', 9, 1], ['wan', 5, 2],
    ]);
    const r = calculateFan(hand, [], null, null, { isKongBlossom: true });
    expect(r.totalFan).toBe(4);
    expect(r.score).toBe(16);
  });

  it('满鬼：手牌 4 张鬼牌 → 固定 6 番 / 64 分', () => {
    const hand = tiles([
      ['tiao', 1, 4],
      ['feng', 1, 1], ['feng', 2, 1], ['feng', 3, 1], ['feng', 4, 1],
      ['jian', 1, 1], ['jian', 2, 1], ['jian', 3, 1],
      ['wan', 1, 1], ['wan', 2, 1], ['wan', 3, 1],
    ]);
    const r = calculateFan(hand, [], 'tiao', 1, SELF);
    expect(fansOf(r)).toEqual(['满鬼']);
    expect(r.totalFan).toBe(6);
    expect(r.score).toBe(64);
  });

  it('满鬼与杠上开花叠加 → 7 番 / 128 分', () => {
    const hand = tiles([
      ['tiao', 1, 4],
      ['feng', 1, 1], ['feng', 2, 1], ['feng', 3, 1], ['feng', 4, 1],
      ['jian', 1, 1], ['jian', 2, 1], ['jian', 3, 1],
      ['wan', 1, 1], ['wan', 2, 1], ['wan', 3, 1],
    ]);
    const r = calculateFan(hand, [], 'tiao', 1, { isKongBlossom: true });
    expect(r.totalFan).toBe(7);
    expect(r.score).toBe(128);
  });
});
