import { describe, it, expect } from 'vitest';
import { canHu, isSelfHu } from '../../src/engine/hu';
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

describe('canHu - 含鬼牌', () => {
  it('1张鬼牌替代成雀头', () => {
    // 123万 456条 789筒 + 中中中 + 单二万 + 鬼牌=1万
    // The 1万 in 123万 is also a ghost, so total 2 ghosts.
    // Ghosts fill as 1万(complete 123万) + 2万(complete 22万 pair)
    const hand: Tile[] = [
      h('w',1),h('w',2),h('w',3),
      h('t',4),h('t',5),h('t',6),
      h('g',7),h('g',8),h('g',9),
      h('j',1),h('j',1),h('j',1),
      h('w',2),
      h('w',1),
    ];
    expect(canHu(hand, 'wan', 1)).toBe(true);
  });

  it('鬼牌替代顺子中的一张', () => {
    // 222万 456条 + 78筒 + 单2万 + 2 ghosts(1万)
    // One ghost as 9筒 completes 789筒, one ghost as 2万 completes 22万 pair
    const hand: Tile[] = [
      h('w',2),h('w',2),h('w',2),
      h('t',4),h('t',5),h('t',6),
      h('g',7),h('g',8),
      h('w',2),
      h('w',1),h('w',1),
    ];
    expect(canHu(hand, 'wan', 1)).toBe(true);
  });

  it('鬼牌不能形成字牌顺子', () => {
    // 14 tiles: scattered feng/jian + wan sequences + 1 ghost(1万)
    // Feng/jian are all singletons — can only form triplets, not sequences.
    // Even with ghost substitution, the scattered feng/jian cannot form valid melds.
    const hand: Tile[] = [
      h('f',1),h('f',2),h('f',3),h('f',4),
      h('j',1),h('j',2),h('j',3),
      h('w',2),h('w',3),h('w',4),
      h('w',5),h('w',6),h('w',7),
      h('w',1),
    ];
    expect(canHu(hand, 'wan', 1)).toBe(false);
  });

  it('空手牌+2张鬼牌可胡（鬼自成雀头）', () => {
    const hand: Tile[] = [
      h('w',1), h('w',1),
    ];
    expect(canHu(hand, 'wan', 1)).toBe(true);
  });
});

describe('isSelfHu', () => {
  it('成牌时返回true', () => {
    const hand: Tile[] = [
      h('w',1),h('w',2),h('w',3),
      h('t',4),h('t',5),h('t',6),
      h('g',7),h('g',8),h('g',9),
      h('j',1),h('j',1),h('j',1),
      h('w',2),h('w',2),
    ];
    expect(isSelfHu(hand, 'wan', 1)).toBe(true);
  });

  it('不成牌时返回false', () => {
    const hand: Tile[] = [
      h('w',1),h('w',3),h('w',5),
      h('t',2),h('t',4),
    ];
    expect(isSelfHu(hand, 'wan', 1)).toBe(false);
  });
});
