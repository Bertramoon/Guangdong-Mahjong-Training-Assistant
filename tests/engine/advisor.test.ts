import { describe, it, expect } from 'vitest';
import { getDiscardRecommendation } from '../../src/engine/advisor';
import type { Tile, TileType } from '../../src/engine/types';

function h(type: string, value: number): Tile {
  const tMap: Record<string, string> = { w: 'wan', t: 'tiao', g: 'tong', f: 'feng', j: 'jian' };
  return { type: tMap[type] as TileType, value, id: 0 };
}

describe('getDiscardRecommendation', () => {
  it('tenpai hand: top suggestion has shanten 0', () => {
    const hand = [
      h('w',1),h('w',2),h('w',3),
      h('t',4),h('t',5),h('t',6),
      h('g',7),h('g',8),h('g',9),
      h('j',1),h('j',1),h('j',1),
      h('w',2), h('w',5),
    ];
    const result = getDiscardRecommendation(hand, null, null);
    expect(result.currentShanten).toBe(0);
    expect(result.evaluations.length).toBeGreaterThan(0);
    expect(result.evaluations[0].shanten).toBe(0);
  });

  it('tenpai hand: lists waiting tiles', () => {
    const hand = [
      h('w',1),h('w',2),h('w',3),
      h('t',4),h('t',5),h('t',6),
      h('g',7),h('g',8),h('g',9),
      h('j',1),h('j',1),h('j',1),
      h('w',2),
    ];
    const hand14 = [...hand, h('w',5)];
    const result = getDiscardRecommendation(hand14, null, null);
    const best = result.evaluations[0];
    expect(best.shanten).toBe(0);
    expect(best.waitingTiles.length).toBeGreaterThan(0);
  });

  it('returns at most 10 evaluations', () => {
    const hand = [
      h('w',1),h('w',2),h('w',3),h('w',4),h('w',5),
      h('t',1),h('t',2),h('t',3),h('t',4),
      h('g',1),h('g',2),h('g',3),h('g',4),h('g',5),
    ];
    const result = getDiscardRecommendation(hand, null, null);
    expect(result.evaluations.length).toBeLessThanOrEqual(10);
  });

  it('sorts by shanten asc, then acceptance desc', () => {
    const hand = [
      h('w',1),h('w',2),h('w',3),
      h('t',4),h('t',5),h('t',6),
      h('g',7),h('g',8),h('g',9),
      h('j',1),h('j',1),h('j',1),
      h('w',2), h('w',5),
    ];
    const result = getDiscardRecommendation(hand, null, null);
    for (let i = 1; i < result.evaluations.length; i++) {
      const prev = result.evaluations[i - 1];
      const curr = result.evaluations[i];
      if (prev.shanten === curr.shanten) {
        expect(prev.acceptanceCount).toBeGreaterThanOrEqual(curr.acceptanceCount);
      } else {
        expect(prev.shanten).toBeLessThan(curr.shanten);
      }
    }
  });

  it('each evaluation has discardTile and acceptanceCount', () => {
    const hand = [
      h('w',1),h('w',2),h('w',3),h('w',4),h('w',5),
      h('t',1),h('t',2),h('t',3),h('t',4),
      h('g',1),h('g',2),h('g',3),h('g',4),h('g',5),
    ];
    const result = getDiscardRecommendation(hand, null, null);
    for (const ev of result.evaluations) {
      expect(ev.discardTile).toBeDefined();
      expect(ev.shanten).toBeGreaterThanOrEqual(0);
      expect(ev.acceptanceCount).toBeGreaterThanOrEqual(0);
    }
  });

  it('deduplicates same-type discard candidates', () => {
    const hand = [
      h('w',1),h('w',1),h('w',2),h('w',3),
      h('t',1),h('t',2),h('t',3),
      h('g',1),h('g',2),h('g',3),
      h('f',1),h('f',1),h('f',2),
    ];
    const result = getDiscardRecommendation(hand, null, null);
    const keys = result.evaluations.map(
      e => `${e.discardTile.type}-${e.discardTile.value}`
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('with ghost tile: ghost is never a discard candidate', () => {
    const hand = [
      h('w',1),h('w',2),h('w',3),
      h('t',4),h('t',5),h('t',6),
      h('g',7),h('g',8),h('g',9),
      h('j',1),h('j',1),
      h('w',2), h('j',3),
    ];
    const result = getDiscardRecommendation(hand, 'jian', 3);
    for (const ev of result.evaluations) {
      expect(ev.discardTile.type === 'jian' && ev.discardTile.value === 3).toBe(false);
    }
  });
});
