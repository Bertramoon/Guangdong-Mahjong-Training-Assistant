import { describe, it, expect } from 'vitest';
import { canHu } from '../../src/engine/hu';
import type { Tile, TileType } from '../../src/engine/types';

// Helper: create a tile with shorthand type
function h(type: string, value: number): Tile {
  const tMap: Record<string, string> = { w: 'wan', t: 'tiao', g: 'tong', f: 'feng', j: 'jian' };
  return { type: tMap[type] as TileType, value, id: 0 };
}

describe('canHu - 标准胡牌（无鬼牌）', () => {
  it('七对子', () => {
    const hand: Tile[] = [
      h('w',1),h('w',1), h('w',3),h('w',3), h('t',2),h('t',2),
      h('t',5),h('t',5), h('g',1),h('g',1), h('f',1),h('f',1),
      h('f',2),h('f',2),
    ];
    expect(canHu(hand, null, null)).toBe(true);
  });

  it('平和型：123万 456条 789筒 + 中中中 + 22万', () => {
    const hand: Tile[] = [
      h('w',1),h('w',2),h('w',3),
      h('t',4),h('t',5),h('t',6),
      h('g',7),h('g',8),h('g',9),
      h('j',1),h('j',1),h('j',1),
      h('w',2),h('w',2),
    ];
    expect(canHu(hand, null, null)).toBe(true);
  });

  it('碰碰胡：111万 333条 444筒 555万 + 22筒', () => {
    const hand: Tile[] = [
      h('w',1),h('w',1),h('w',1),
      h('t',3),h('t',3),h('t',3),
      h('g',4),h('g',4),h('g',4),
      h('w',5),h('w',5),h('w',5),
      h('g',2),h('g',2),
    ];
    expect(canHu(hand, null, null)).toBe(true);
  });

  it('13张不能胡', () => {
    const hand: Tile[] = [
      h('w',1),h('w',3),h('w',5),
      h('t',2),h('t',4),h('t',6),
      h('g',1),h('g',3),h('g',5),
      h('f',1),h('f',2),h('f',3),
      h('j',1),
    ];
    expect(canHu(hand, null, null)).toBe(false);
  });

  it('14张但不成胡', () => {
    const hand: Tile[] = [
      h('w',1),h('w',3),h('w',5),h('w',7),
      h('t',2),h('t',4),h('t',6),h('t',8),
      h('g',1),h('g',3),h('g',5),h('g',7),
      h('f',1),h('f',2),
    ];
    expect(canHu(hand, null, null)).toBe(false);
  });
});
