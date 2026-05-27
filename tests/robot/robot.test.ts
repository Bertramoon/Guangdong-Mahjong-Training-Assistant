// tests/robot/robot.test.ts
import { describe, it, expect } from 'vitest';
import {
  robotDiscard,
  robotShouldPeng,
  robotShouldMingGang,
  robotShouldJiaGang,
  robotShouldAnGang,
  findSingles,
} from '../../src/robot/robot';
import type { Tile, Meld } from '../../src/engine/types';
import { createRNG } from '../../src/engine/rng';

function h(type: Tile['type'], value: number, id: number): Tile {
  return { type, value, id };
}

describe('robotDiscard', () => {
  it('优先丢单张字牌', () => {
    const hand: Tile[] = [
      h('wan', 1, 0), h('wan', 1, 1),        // 对子一万
      h('wan', 2, 2), h('wan', 3, 3), h('wan', 4, 4), // 顺子搭
      h('feng', 1, 5),                        // 单张东风
      h('tiao', 7, 6),                        // 单张七条
    ];
    const discard = robotDiscard(hand, 'wan', 1);
    expect(discard.type).toBe('feng');
  });

  it('不丢弃鬼牌', () => {
    const hand: Tile[] = [
      h('wan', 1, 0), h('wan', 1, 1),
      h('wan', 1, 2), h('wan', 1, 3),        // 鬼牌！一万=鬼
      h('feng', 1, 5),                        // 单张东风
    ];
    const discard = robotDiscard(hand, 'wan', 1);
    // 应该丢弃非鬼牌（东风），而非鬼牌一万
    expect(discard).not.toEqual(expect.objectContaining({ type: 'wan', value: 1 }));
  });

  it('无单张时丢双张中一张', () => {
    const hand: Tile[] = [
      h('wan', 1, 0), h('wan', 1, 1),
      h('tiao', 2, 2), h('tiao', 2, 3),
      h('tong', 5, 4), h('tong', 5, 5),
      h('feng', 1, 6), h('feng', 1, 7),
      h('jian', 3, 8), h('jian', 3, 9),
      h('wan', 7, 10), h('wan', 7, 11),
      h('tong', 9, 12),
    ];
    const discard = robotDiscard(hand, 'wan', 1);
    expect(discard).toBeDefined();
    // Should not be a ghost tile (wan value 1)
    expect(discard.type === 'wan' && discard.value === 1).toBe(false);
  });

  it('全是搭子时丢孤张', () => {
    const hand: Tile[] = [
      h('wan', 1, 0), h('wan', 2, 1), h('wan', 3, 2),  // 顺子
      h('tiao', 4, 3), h('tiao', 5, 4), h('tiao', 6, 5), // 顺子
      h('tong', 7, 6), h('tong', 8, 7),                   // 搭子
      h('feng', 1, 8), h('feng', 1, 9),                   // 对子
      h('jian', 3, 10), h('jian', 3, 11),                 // 对子
      h('wan', 9, 12),                                     // 单张
    ];
    const discard = robotDiscard(hand, 'wan', 1);
    expect(discard.type).toBe('wan');
    expect(discard.value).toBe(9);
  });

  it('极端情况使用 rng 而非 Math.random', () => {
    // 构造全是鬼牌的手牌（触发 fallback 分支）
    const ghostType = 'wan';
    const ghostValue = 1;
    const hand: Tile[] = [
      { type: ghostType, value: ghostValue, id: 0 },
      { type: ghostType, value: ghostValue, id: 1 },
      { type: ghostType, value: ghostValue, id: 2 },
    ];
    const rng = createRNG(42);
    const result = robotDiscard(hand, ghostType, ghostValue, rng);
    expect(result).toBeDefined();
    // 相同 rng 种子应返回相同结果
    const result2 = robotDiscard(hand, ghostType, ghostValue, createRNG(42));
    expect(result.id).toBe(result2.id);
  });
});

describe('robotShouldPeng', () => {
  it('有2张可碰时返回true', () => {
    const hand = [h('wan', 1, 0), h('wan', 1, 1)];
    const discard = h('wan', 1, 2);
    expect(robotShouldPeng(hand, discard)).toBe(true);
  });

  it('不足2张返回false', () => {
    const hand = [h('wan', 1, 0)];
    const discard = h('wan', 1, 2);
    expect(robotShouldPeng(hand, discard)).toBe(false);
  });
});

describe('robotShouldMingGang', () => {
  it('有3张可明杠时返回true', () => {
    const hand = [h('wan', 1, 0), h('wan', 1, 1), h('wan', 1, 2)];
    const discard = h('wan', 1, 3);
    expect(robotShouldMingGang(hand, discard)).toBe(true);
  });
});

describe('robotShouldJiaGang', () => {
  it('有 peng 且手中有第4张时返回true', () => {
    const hand = [h('wan', 1, 3)];
    const melds: Meld[] = [{
      type: 'peng',
      tiles: [h('wan', 1, 0), h('wan', 1, 1), h('wan', 1, 2)],
    }];
    expect(robotShouldJiaGang(hand, melds)).toBe(true);
  });
});

describe('robotShouldAnGang', () => {
  it('有4张可暗杠时返回true', () => {
    const hand = [h('wan', 1, 0), h('wan', 1, 1), h('wan', 1, 2), h('wan', 1, 3)];
    expect(robotShouldAnGang(hand)).toBe(true);
  });

  it('不足4张返回false', () => {
    const hand = [h('wan', 1, 0), h('wan', 1, 1), h('wan', 1, 2)];
    expect(robotShouldAnGang(hand)).toBe(false);
  });
});
