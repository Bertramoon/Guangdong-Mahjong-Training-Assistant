import { describe, it, expect } from 'vitest';
import {
  tilesToCounts,
  suitMaxTaatsu,
  isNumberSuit,
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
    expect(result.length).toBe(1);
    expect(result[0]).toBe(0);
  });
  it('single isolated tile: m=0, t=0', () => {
    const result = suitMaxTaatsu([1,0,0,0,0,0,0,0,0], true);
    expect(result[0]).toBe(0);
  });
  it('one pair: m=0, t=1', () => {
    const result = suitMaxTaatsu([2,0,0,0,0,0,0,0,0], true);
    expect(result[0]).toBe(1);
  });
  it('one triplet: m=1, t=0', () => {
    const result = suitMaxTaatsu([3,0,0,0,0,0,0,0,0], true);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[1]).toBe(0);
  });
  it('sequence 123: m=1, t=0', () => {
    const result = suitMaxTaatsu([1,1,1,0,0,0,0,0,0], true);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[1]).toBe(0);
  });
  it('two-sided wait 23: m=0, t=1', () => {
    const result = suitMaxTaatsu([0,1,1,0,0,0,0,0,0], true);
    expect(result[0]).toBe(1);
  });
  it('112233: best is 2 sequences (m=2)', () => {
    const result = suitMaxTaatsu([2,2,2,0,0,0,0,0,0], true);
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result[2]).toBe(0);
  });
  it('12345: sequence(123) + taatsu(45) = m=1, t=1', () => {
    const result = suitMaxTaatsu([1,1,1,1,1,0,0,0,0], true);
    expect(result[1]).toBe(1);
  });
  it('honor tiles: no sequences', () => {
    const result = suitMaxTaatsu([3,1], false);
    expect(result[1]).toBe(0);
  });
  it('four of a kind: triplet + isolated or 2 pairs', () => {
    const result = suitMaxTaatsu([4,0,0,0,0,0,0,0,0], true);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[1]).toBe(0);
    expect(result[0]).toBe(2);
  });
});
