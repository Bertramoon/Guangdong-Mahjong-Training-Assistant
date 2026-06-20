import { describe, it, expect } from 'vitest';
import { computeSettlement } from '../../src/engine/settlement';
import type { FanResult } from '../../src/engine/scoring';
import type { Meld, Tile, TileType } from '../../src/engine/types';

let _id = 0;
function t(type: TileType, value: number): Tile {
  return { type, value, id: _id++ };
}
function fan(score: number): FanResult {
  return { fans: [], totalFan: Math.log2(score), score };
}
function params(overrides: Partial<Parameters<typeof computeSettlement>[0]> = {}) {
  return {
    winner: 0,
    melds: [[], [], [], []] as Meld[][],
    hands: [[t('wan', 1)], [], [], []] as Tile[][],
    huResult: fan(2),
    dealerIndex: 0,
    reserveTiles: [t('wan', 2), t('wan', 3), t('wan', 4), t('wan', 6), t('feng', 1), t('jian', 1)],
    ghostType: 'tiao' as TileType,
    ghostValue: 1,
    ...overrides,
  };
}

function sum(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0);
}

describe('computeSettlement', () => {
  it('无杠自摸：0 中马时按 baseScore 结算', () => {
    const r = computeSettlement(params({ reserveTiles: [t('wan', 2), t('wan', 3), t('wan', 4), t('wan', 6), t('feng', 2), t('jian', 2)] }));
    expect(r.horseCount).toBe(0);
    expect(r.finalHuScore).toBe(2);
    expect(r.balances).toEqual([6, -2, -2, -2]);
    expect(sum(r.balances)).toBe(0);
  });

  it('无杠自摸：赢家中马数参与胡牌分数', () => {
    const r = computeSettlement(params());
    expect(r.horseCount).toBe(2);
    expect(r.finalHuScore).toBe(6);
    expect(r.balances).toEqual([18, -6, -6, -6]);
    expect(sum(r.balances)).toBe(0);
  });

  it('赢家含鬼牌时只翻 4 张马', () => {
    const r = computeSettlement(params({
      hands: [[t('tiao', 1)], [], [], []],
      reserveTiles: [t('feng', 1), t('jian', 1), t('wan', 2), t('wan', 3), t('wan', 4), t('wan', 6)],
    }));
    expect(r.horseTiles).toHaveLength(4);
    expect(r.horseCount).toBe(0);
  });

  it('赢家无鬼牌时翻 6 张马，并标记中马牌', () => {
    const r = computeSettlement(params());
    expect(r.horseTiles).toHaveLength(6);
    expect(r.horseResults).toHaveLength(6);
    expect(r.horseResults.map(h => h.isHit)).toEqual([false, false, false, false, true, true]);
    expect(r.horseCount).toBe(2);
  });

  it('按庄家对家位置判断赢家中马', () => {
    const r = computeSettlement(params({
      winner: 2,
      dealerIndex: 0,
      reserveTiles: [t('wan', 3), t('wan', 7), t('feng', 3), t('jian', 3), t('wan', 1), t('wan', 2)],
    }));
    expect(r.horseCount).toBe(4);
    expect(r.finalHuScore).toBe(10);
    expect(r.balances).toEqual([-10, -10, 30, -10]);
    expect(sum(r.balances)).toBe(0);
  });

  it('按逆时针座位顺序判断庄家下家与上家中马', () => {
    const next = computeSettlement(params({
      winner: 3,
      dealerIndex: 0,
      reserveTiles: [t('wan', 2), t('wan', 6), t('feng', 2), t('jian', 2), t('wan', 1), t('wan', 3)],
    }));
    expect(next.horseCount).toBe(4);
    expect(next.balances).toEqual([-10, -10, -10, 30]);

    const prev = computeSettlement(params({
      winner: 1,
      dealerIndex: 0,
      reserveTiles: [t('wan', 4), t('wan', 8), t('feng', 4), t('wan', 1), t('wan', 2), t('wan', 3)],
    }));
    expect(prev.horseCount).toBe(3);
    expect(prev.balances).toEqual([-8, 24, -8, -8]);
  });

  it('明杠由放杠者付 3 分', () => {
    const mingGang: Meld = { type: 'ming_gang', source: 0, tiles: [t('wan', 5), t('wan', 5), t('wan', 5), t('wan', 5)] };
    const r = computeSettlement(params({
      melds: [[], [mingGang], [], []],
      reserveTiles: [t('wan', 2), t('wan', 3), t('wan', 4), t('wan', 6), t('feng', 2), t('jian', 2)],
    }));
    expect(r.balances).toEqual([3, 1, -2, -2]);
    expect(sum(r.balances)).toBe(0);
  });

  it('暗杠由其余三家各付 2 分', () => {
    const anGang: Meld = { type: 'an_gang', tiles: [t('wan', 5), t('wan', 5), t('wan', 5), t('wan', 5)] };
    const r = computeSettlement(params({
      melds: [[], [], [anGang], []],
      reserveTiles: [t('wan', 2), t('wan', 3), t('wan', 4), t('wan', 6), t('feng', 2), t('jian', 2)],
    }));
    expect(r.balances).toEqual([4, -4, 4, -4]);
    expect(sum(r.balances)).toBe(0);
  });

  it('加杠由其余三家各付 1 分', () => {
    const jiaGang: Meld = { type: 'jia_gang', tiles: [t('wan', 5), t('wan', 5), t('wan', 5), t('wan', 5)] };
    const r = computeSettlement(params({
      melds: [[], [], [], [jiaGang]],
      reserveTiles: [t('wan', 2), t('wan', 3), t('wan', 4), t('wan', 6), t('feng', 2), t('jian', 2)],
    }));
    expect(r.balances).toEqual([5, -3, -3, 1]);
    expect(sum(r.balances)).toBe(0);
  });

  it('流局时杠分作废', () => {
    const mingGang: Meld = { type: 'ming_gang', source: 0, tiles: [t('wan', 5), t('wan', 5), t('wan', 5), t('wan', 5)] };
    const r = computeSettlement(params({ winner: -1, melds: [[], [mingGang], [], []], huResult: null }));
    expect(r.isDraw).toBe(true);
    expect(r.lines).toHaveLength(0);
    expect(r.balances).toEqual([0, 0, 0, 0]);
  });
});
