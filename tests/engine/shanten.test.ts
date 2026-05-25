import { describe, it, expect } from 'vitest';
import {
  tilesToCounts,
  suitMaxTaatsu,
  isNumberSuit,
  calculateShanten,
} from '../../src/engine/shanten';
import type { Tile, TileType } from '../../src/engine/types';

function h(type: string, value: number): Tile {
  const tMap: Record<string, string> = { w: 'wan', t: 'tiao', g: 'tong', f: 'feng', j: 'jian' };
  return { type: tMap[type] as TileType, value, id: 0 };
}

describe('tilesToCounts', () => {
  it('converts wan tiles to count array', () => {
    const tiles = [h('w',1), h('w',1), h('w',5), h('w',5)];
    expect(tilesToCounts(tiles, 'wan')).toEqual([2,0,0,0,2,0,0,0,0]);
  });
  it('returns zeros for empty suit', () => {
    expect(tilesToCounts([], 'wan')).toEqual([0,0,0,0,0,0,0,0,0]);
  });
  it('converts feng tiles', () => {
    const tiles = [h('f',1), h('f',1), h('f',3)];
    expect(tilesToCounts(tiles, 'feng')).toEqual([2,0,1,0]);
  });
  it('ignores tiles of other suits', () => {
    const tiles = [h('w',1), h('t',2), h('w',3)];
    expect(tilesToCounts(tiles, 'wan')).toEqual([1,0,1,0,0,0,0,0,0]);
  });
});

describe('isNumberSuit', () => {
  it('wan/tiao/tong are number suits', () => {
    expect(isNumberSuit('wan')).toBe(true);
    expect(isNumberSuit('tiao')).toBe(true);
    expect(isNumberSuit('tong')).toBe(true);
  });
  it('feng/jian are not number suits', () => {
    expect(isNumberSuit('feng')).toBe(false);
    expect(isNumberSuit('jian')).toBe(false);
  });
});

describe('suitMaxTaatsu', () => {
  it('empty suit: m=0 only, t=0', () => {
    const result = suitMaxTaatsu([0,0,0,0,0,0,0,0,0], true);
    expect(result.any.length).toBe(1);
    expect(result.any[0]).toBe(0);
  });
  it('single isolated tile: m=0, t=0', () => {
    const result = suitMaxTaatsu([1,0,0,0,0,0,0,0,0], true);
    expect(result.any[0]).toBe(0);
  });
  it('one pair: m=0, t=1', () => {
    const result = suitMaxTaatsu([2,0,0,0,0,0,0,0,0], true);
    expect(result.any[0]).toBe(1);
  });
  it('one triplet: m=1, t=0', () => {
    const result = suitMaxTaatsu([3,0,0,0,0,0,0,0,0], true);
    expect(result.any.length).toBeGreaterThanOrEqual(2);
    expect(result.any[1]).toBe(0);
  });
  it('sequence 123: m=1, t=0', () => {
    const result = suitMaxTaatsu([1,1,1,0,0,0,0,0,0], true);
    expect(result.any.length).toBeGreaterThanOrEqual(2);
    expect(result.any[1]).toBe(0);
  });
  it('two-sided wait 23: m=0, t=1', () => {
    const result = suitMaxTaatsu([0,1,1,0,0,0,0,0,0], true);
    expect(result.any[0]).toBe(1);
  });
  it('112233: best is 2 sequences (m=2)', () => {
    const result = suitMaxTaatsu([2,2,2,0,0,0,0,0,0], true);
    expect(result.any.length).toBeGreaterThanOrEqual(3);
    expect(result.any[2]).toBe(0);
  });
  it('12345: sequence(123) + taatsu(45) = m=1, t=1', () => {
    const result = suitMaxTaatsu([1,1,1,1,1,0,0,0,0], true);
    expect(result.any[1]).toBe(1);
  });
  it('honor tiles: no sequences', () => {
    const result = suitMaxTaatsu([3,1], false);
    expect(result.any[1]).toBe(0);
  });
  it('four of a kind: triplet + isolated or 2 pairs', () => {
    const result = suitMaxTaatsu([4,0,0,0,0,0,0,0,0], true);
    expect(result.any.length).toBeGreaterThanOrEqual(2);
    expect(result.any[1]).toBe(0);
    expect(result.any[0]).toBe(2);
  });
});

describe('calculateShanten - standard form (no ghost)', () => {
  it('complete hand: shanten = -1', () => {
    const hand = [
      h('w',1),h('w',2),h('w',3),
      h('t',4),h('t',5),h('t',6),
      h('g',7),h('g',8),h('g',9),
      h('j',1),h('j',1),h('j',1),
      h('w',2),h('w',2),
    ];
    expect(calculateShanten(hand, null, null)).toBe(-1);
  });

  it('tenpai (3 mentsu + triplet + isolated): shanten = 0', () => {
    const hand = [
      h('w',1),h('w',2),h('w',3),
      h('t',4),h('t',5),h('t',6),
      h('g',7),h('g',8),h('g',9),
      h('j',1),h('j',1),h('j',1),
      h('w',2),
    ];
    expect(calculateShanten(hand, null, null)).toBe(0);
  });

  it('1-shanten: shanten = 1', () => {
    const hand = [
      h('w',1),h('w',2),h('w',3),
      h('t',4),h('t',5),h('t',6),
      h('g',7),h('g',8),h('g',9),
      h('j',1),h('j',1),
      h('w',2), h('w',5),
    ];
    expect(calculateShanten(hand, null, null)).toBe(1);
  });

  it('worst case (13 isolated): shanten >= 6', () => {
    const hand = [
      h('w',1),h('w',5),h('w',9),
      h('t',2),h('t',6),
      h('g',3),h('g',7),
      h('f',1),h('f',2),h('f',3),h('f',4),
      h('j',1),
    ];
    expect(calculateShanten(hand, null, null)).toBeGreaterThanOrEqual(6);
  });

  it('seven pairs tenpai: shanten = 0', () => {
    const hand = [
      h('w',1),h('w',1), h('w',3),h('w',3), h('t',2),h('t',2),
      h('t',5),h('t',5), h('g',1),h('g',1), h('f',1),h('f',1),
      h('f',2),
    ];
    expect(calculateShanten(hand, null, null)).toBe(0);
  });

  it('pung-pung tenpai: shanten = 0', () => {
    const hand = [
      h('w',1),h('w',1),h('w',1),
      h('t',3),h('t',3),h('t',3),
      h('g',4),h('g',4),h('g',4),
      h('j',1),h('j',1),h('j',1),
      h('w',2),
    ];
    expect(calculateShanten(hand, null, null)).toBe(0);
  });
});

describe('calculateShanten - with ghost tiles', () => {
  it('1 ghost reduces shanten by 1', () => {
    const hand = [
      h('w',1),h('w',2),h('w',3),
      h('t',4),h('t',5),h('t',6),
      h('g',7),h('g',8),h('g',9),
      h('j',1),h('j',1),
      h('w',2), h('w',5),
      h('j',3),
    ];
    expect(calculateShanten(hand, 'jian', 3)).toBe(0);
  });

  it('2 ghosts on near-complete hand: shanten = -1 (won)', () => {
    const hand = [
      h('w',1),h('w',2),h('w',3),
      h('t',4),h('t',5),h('t',6),
      h('g',7),h('g',8),h('g',9),
      h('j',1),h('j',1),
      h('w',2),
      h('j',3),h('j',3),
    ];
    expect(calculateShanten(hand, 'jian', 3)).toBe(-1);
  });
});

describe('calculateShanten - with melds', () => {
  it('hand with melds adjusts formula', () => {
    const hand = [
      h('w',1),h('w',2),h('w',3),
      h('t',4),h('t',5),h('t',6),
      h('w',2),
    ];
    expect(calculateShanten(hand, null, null, 1)).toBe(2);
  });
});

describe('shanten pair tracking regression', () => {
  it('M=4 with gap wait (no pair) gives shanten=0, not -1', () => {
    // 万345 条234 筒2346 + meld(中中中) = 10 tiles, meldCount=1
    // M=4 (万345+条234+筒234+meld), T=0, isolated(筒6). No pair → shanten=0.
    const hand = [
      h('w',3),h('w',4),h('w',5),
      h('t',2),h('t',3),h('t',4),
      h('g',2),h('g',3),h('g',4),h('g',6),
    ];
    expect(calculateShanten(hand, 'tiao', 6, 1)).toBe(0);
  });

  it('M=4 with pair taatsu gives shanten=-1', () => {
    // Same hand but add 筒6 to form pair(筒66) with existing 筒6
    const hand = [
      h('w',3),h('w',4),h('w',5),
      h('t',2),h('t',3),h('t',4),
      h('g',2),h('g',3),h('g',4),h('g',6),h('g',6),
    ];
    expect(calculateShanten(hand, 'tiao', 6, 1)).toBe(-1);
  });

  it('M=4 adding non-pair tile keeps shanten=0', () => {
    // 万345 条234 筒2346 + 筒1 (gap wait 4-6 still no pair)
    const hand = [
      h('w',3),h('w',4),h('w',5),
      h('t',2),h('t',3),h('t',4),
      h('g',1),h('g',2),h('g',3),h('g',4),h('g',6),
    ];
    expect(calculateShanten(hand, 'tiao', 6, 1)).toBe(0);
  });
});
