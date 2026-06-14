import { describe, it, expect } from 'vitest';
import { calculateFan } from '../../src/engine/scoring';
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
function hasFan(fans: { name: string }[], name: string): boolean {
  return fans.some(f => f.name === name);
}

const SELF = { isSelfDraw: true, isKongBlossom: false };

describe('calculateFan', () => {
  it('鸡胡（无番型）底 0 番，自摸 +1 → 1 番 / 2 分', () => {
    const hand = tiles([
      ['wan', 1, 3], ['wan', 2, 1], ['wan', 3, 1], ['wan', 4, 1],
      ['tiao', 4, 1], ['tiao', 5, 1], ['tiao', 6, 1],
      ['tong', 7, 1], ['tong', 8, 1], ['tong', 9, 1],
      ['jian', 1, 2],
    ]);
    const r = calculateFan(hand, [], null, null, SELF);
    expect(hasFan(r.fans, '清一色')).toBe(false);
    expect(hasFan(r.fans, '碰碰胡')).toBe(false);
    expect(hasFan(r.fans, '平和')).toBe(false);
    expect(hasFan(r.fans, '自摸')).toBe(true);
    expect(r.totalFan).toBe(1);
    expect(r.score).toBe(2);
  });

  it('纯鸡胡（非自摸）= 0 番 / 1 分', () => {
    const hand = tiles([
      ['wan', 1, 3], ['wan', 2, 1], ['wan', 3, 1], ['wan', 4, 1],
      ['tiao', 4, 1], ['tiao', 5, 1], ['tiao', 6, 1],
      ['tong', 7, 1], ['tong', 8, 1], ['tong', 9, 1],
      ['jian', 1, 2],
    ]);
    const r = calculateFan(hand, [], null, null, { isSelfDraw: false, isKongBlossom: false });
    expect(r.fans).toHaveLength(0);
    expect(r.totalFan).toBe(0);
    expect(r.score).toBe(1);
  });

  it('平和 +1（门清全顺子、将牌非字）→ 加自摸 2 番 / 4 分', () => {
    const hand = tiles([
      ['wan', 1, 1], ['wan', 2, 1], ['wan', 3, 1],
      ['wan', 4, 1], ['wan', 5, 1], ['wan', 6, 1],
      ['tiao', 7, 1], ['tiao', 8, 1], ['tiao', 9, 1],
      ['tong', 2, 1], ['tong', 3, 1], ['tong', 4, 1],
      ['tong', 5, 2],
    ]);
    const r = calculateFan(hand, [], null, null, SELF);
    expect(hasFan(r.fans, '平和')).toBe(true);
    expect(r.totalFan).toBe(2);
    expect(r.score).toBe(4);
  });

  it('碰碰胡 +1（全刻子）→ 加自摸 2 番 / 4 分', () => {
    const hand = tiles([
      ['wan', 1, 3], ['tiao', 2, 3], ['tong', 3, 3],
      ['jian', 1, 3], ['jian', 2, 2],
    ]);
    const r = calculateFan(hand, [], null, null, SELF);
    expect(hasFan(r.fans, '碰碰胡')).toBe(true);
    expect(hasFan(r.fans, '平和')).toBe(false);
    expect(r.totalFan).toBe(2);
    expect(r.score).toBe(4);
  });

  it('清一色 +4（含刻子与顺子，不触发碰碰胡/平和）→ 加自摸 5 番 / 32 分', () => {
    // 111万(刻子强制) + 234万 + 456万 + 789万 + 55万：万1 无邻牌必为刻子
    const hand = tiles([
      ['wan', 1, 3], ['wan', 2, 1], ['wan', 3, 1], ['wan', 4, 2],
      ['wan', 5, 3], ['wan', 6, 1], ['wan', 7, 1], ['wan', 8, 1], ['wan', 9, 1],
    ]);
    const r = calculateFan(hand, [], null, null, SELF);
    expect(hasFan(r.fans, '清一色')).toBe(true);
    expect(hasFan(r.fans, '碰碰胡')).toBe(false);
    expect(hasFan(r.fans, '平和')).toBe(false);
    expect(r.totalFan).toBe(5);
    expect(r.score).toBe(32);
  });

  it('混一色 +1（一花色 + 字牌）→ 加自摸 2 番 / 4 分', () => {
    const hand = tiles([
      ['wan', 1, 3], ['wan', 2, 1], ['wan', 3, 1], ['wan', 4, 1],
      ['wan', 5, 1], ['wan', 6, 1], ['wan', 7, 1],
      ['jian', 1, 3], ['jian', 2, 2],
    ]);
    const r = calculateFan(hand, [], null, null, SELF);
    expect(hasFan(r.fans, '混一色')).toBe(true);
    expect(hasFan(r.fans, '清一色')).toBe(false);
    expect(r.totalFan).toBe(2);
    expect(r.score).toBe(4);
  });

  it('字一色 +8（全字牌）→ 加碰碰胡 +1、自摸 +1 = 10 番 / 1024 分', () => {
    const hand = tiles([
      ['feng', 1, 3], ['feng', 2, 3], ['feng', 3, 3],
      ['jian', 1, 3], ['feng', 4, 2],
    ]);
    const r = calculateFan(hand, [], null, null, SELF);
    expect(hasFan(r.fans, '字一色')).toBe(true);
    expect(hasFan(r.fans, '碰碰胡')).toBe(true);
    expect(r.totalFan).toBe(10);
    expect(r.score).toBe(1024);
  });

  it('七对 +4 → 加自摸 5 番 / 32 分', () => {
    const hand = tiles([
      ['wan', 1, 2], ['wan', 2, 2], ['wan', 3, 2],
      ['tiao', 4, 2], ['tiao', 5, 2], ['tong', 6, 2],
      ['jian', 1, 2],
    ]);
    const r = calculateFan(hand, [], null, null, SELF);
    expect(hasFan(r.fans, '七对')).toBe(true);
    expect(r.totalFan).toBe(5);
    expect(r.score).toBe(32);
  });

  it('清一色七对 = 清一色 +4 + 七对 +4 + 自摸 +1 = 9 番 / 512 分', () => {
    const hand = tiles([
      ['wan', 1, 2], ['wan', 2, 2], ['wan', 3, 2], ['wan', 4, 2],
      ['wan', 5, 2], ['wan', 6, 2], ['wan', 7, 2],
    ]);
    const r = calculateFan(hand, [], null, null, SELF);
    expect(hasFan(r.fans, '清一色')).toBe(true);
    expect(hasFan(r.fans, '七对')).toBe(true);
    expect(r.totalFan).toBe(9);
    expect(r.score).toBe(512);
  });

  it('清一色碰碰胡自摸 = 4+1+1 = 6 番 / 64 分', () => {
    const hand = tiles([
      ['wan', 1, 3], ['wan', 2, 3], ['wan', 3, 3], ['wan', 4, 3], ['wan', 5, 2],
    ]);
    const r = calculateFan(hand, [], null, null, SELF);
    expect(hasFan(r.fans, '清一色')).toBe(true);
    expect(hasFan(r.fans, '碰碰胡')).toBe(true);
    expect(hasFan(r.fans, '自摸')).toBe(true);
    expect(r.totalFan).toBe(6);
    expect(r.score).toBe(64);
  });

  it('杠上开花 +1（ctx 触发）', () => {
    const hand = tiles([
      ['wan', 1, 3], ['wan', 2, 1], ['wan', 3, 1], ['wan', 4, 1],
      ['tiao', 4, 1], ['tiao', 5, 1], ['tiao', 6, 1],
      ['tong', 7, 1], ['tong', 8, 1], ['tong', 9, 1],
      ['jian', 1, 2],
    ]);
    const r = calculateFan(hand, [], null, null, { isSelfDraw: true, isKongBlossom: true });
    expect(hasFan(r.fans, '杠上开花')).toBe(true);
    expect(hasFan(r.fans, '自摸')).toBe(true);
    expect(r.totalFan).toBe(2);
    expect(r.score).toBe(4);
  });

  it('鬼牌替代成清一色碰碰胡（两鬼充当将牌）= 6 番 / 64 分', () => {
    // 111万 222万 333万 444万 + 两张鬼牌(条1)；鬼牌应替代为万以成清一色
    const hand = tiles([
      ['wan', 1, 3], ['wan', 2, 3], ['wan', 3, 3], ['wan', 4, 3],
      ['tiao', 1, 2],
    ]);
    const r = calculateFan(hand, [], 'tiao', 1, SELF);
    expect(hasFan(r.fans, '清一色')).toBe(true);
    expect(hasFan(r.fans, '碰碰胡')).toBe(true);
    expect(r.totalFan).toBe(6);
    expect(r.score).toBe(64);
  });

  it('含碰副露的碰碰胡 → 加自摸 2 番 / 4 分', () => {
    const concealed = tiles([
      ['wan', 1, 3], ['wan', 2, 3], ['wan', 3, 3], ['jian', 1, 2],
    ]);
    const peng: Meld = { type: 'peng', tiles: [t('tiao', 5), t('tiao', 5), t('tiao', 5)] };
    const r = calculateFan(concealed, [peng], null, null, SELF);
    expect(hasFan(r.fans, '碰碰胡')).toBe(true);
    expect(r.totalFan).toBe(2);
    expect(r.score).toBe(4);
  });
});
