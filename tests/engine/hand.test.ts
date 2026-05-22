import { describe, it, expect } from 'vitest';
import { sortHand, addTile, removeTile, removeTileByIndex, hasPair, groupByType } from '../../src/engine/hand';
import { createTile } from '../../src/engine/tile';

function makeHand(): ReturnType<typeof createTile>[] {
  return [
    createTile('wan', 3, 10),
    createTile('wan', 1, 0),
    createTile('tiao', 5, 20),
    createTile('feng', 1, 30),
    createTile('wan', 1, 1),
  ];
}

describe('sortHand', () => {
  it('按花色和数值排序', () => {
    const hand = makeHand();
    const sorted = sortHand(hand);
    expect(sorted[0].type).toBe('wan');
    expect(sorted[0].value).toBe(1);
    expect(sorted[1].type).toBe('wan');
    expect(sorted[1].value).toBe(1);
    expect(sorted[2].type).toBe('wan');
    expect(sorted[2].value).toBe(3);
    expect(sorted[3].type).toBe('tiao');
    expect(sorted[4].type).toBe('feng');
  });
});

describe('addTile', () => {
  it('添加牌并自动排序', () => {
    const hand = makeHand();
    const newTile = createTile('wan', 2, 99);
    const result = addTile(hand, newTile);
    expect(result.length).toBe(6);
    expect(result[0].type).toBe('wan');
    expect(result[0].value).toBe(1);
    expect(result[2].value).toBe(2);
  });

  it('不修改原始数组', () => {
    const hand = makeHand();
    const copy = [...hand];
    addTile(hand, createTile('wan', 5, 99));
    expect(hand).toEqual(copy);
  });
});

describe('removeTile', () => {
  it('按类型和值移除一张牌', () => {
    const hand = makeHand();
    const result = removeTile(hand, 'wan', 1);
    expect(result!.hand.length).toBe(4);
    expect(result!.hand.filter(t => t.type === 'wan' && t.value === 1).length).toBe(1);
  });

  it('牌不存在时返回null', () => {
    const hand = makeHand();
    const result = removeTile(hand, 'wan', 9);
    expect(result).toBeNull();
  });
});

describe('removeTileByIndex', () => {
  it('按索引移除牌', () => {
    const hand = sortHand(makeHand());
    const result = removeTileByIndex(hand, 2);
    expect(result!.length).toBe(4);
  });

  it('无效索引返回null', () => {
    expect(removeTileByIndex([], 0)).toBeNull();
  });
});

describe('hasPair', () => {
  it('有对子返回true', () => {
    const hand = makeHand();
    expect(hasPair(hand)).toBe(true);
  });

  it('无对子返回false', () => {
    const hand = [
      createTile('wan', 1, 0),
      createTile('wan', 2, 1),
      createTile('tiao', 3, 2),
    ];
    expect(hasPair(hand)).toBe(false);
  });
});

describe('groupByType', () => {
  it('按花色分组', () => {
    const hand = makeHand();
    const groups = groupByType(hand);
    expect(groups.wan.length).toBe(3);
    expect(groups.tiao.length).toBe(1);
    expect(groups.feng.length).toBe(1);
    expect(groups.tong.length).toBe(0);
  });
});
