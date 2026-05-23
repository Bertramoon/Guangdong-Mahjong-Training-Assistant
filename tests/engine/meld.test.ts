import { describe, it, expect } from 'vitest';
import { createPeng, createMingGang, createAnGang, canPeng, canMingGang, canAnGang, getPengTiles, canJiaGang, createJiaGang } from '../../src/engine/meld';
import { createTile } from '../../src/engine/tile';
import type { Meld } from '../../src/engine/types';

describe('canPeng', () => {
  it('手牌有2张相同的牌时可以碰', () => {
    const hand = [
      createTile('wan', 1, 0),
      createTile('wan', 1, 1),
      createTile('wan', 2, 2),
    ];
    const discard = createTile('wan', 1, 3);
    expect(canPeng(hand, discard)).toBe(true);
  });

  it('手牌不足2张不能碰', () => {
    const hand = [createTile('wan', 1, 0)];
    const discard = createTile('wan', 1, 3);
    expect(canPeng(hand, discard)).toBe(false);
  });
});

describe('canMingGang', () => {
  it('手牌有3张相同牌时可以明杠', () => {
    const hand = [
      createTile('wan', 1, 0),
      createTile('wan', 1, 1),
      createTile('wan', 1, 2),
    ];
    const discard = createTile('wan', 1, 3);
    expect(canMingGang(hand, discard)).toBe(true);
  });
});

describe('canAnGang', () => {
  it('手牌有4张相同牌时可以暗杠', () => {
    const hand = [
      createTile('wan', 1, 0),
      createTile('wan', 1, 1),
      createTile('wan', 1, 2),
      createTile('wan', 1, 3),
    ];
    expect(canAnGang(hand)).toBe(true);
  });

  it('手牌不足4张不能暗杠', () => {
    const hand = [createTile('wan', 1, 0)];
    expect(canAnGang(hand)).toBe(false);
  });
});

describe('createPeng', () => {
  it('碰后手牌减少2张，副露增加1组', () => {
    const hand = [
      createTile('wan', 1, 0),
      createTile('wan', 1, 1),
      createTile('wan', 2, 2),
    ];
    const discard = createTile('wan', 1, 3);
    const result = createPeng(hand, discard);
    expect(result.hand.length).toBe(1);
    expect(result.meld.type).toBe('peng');
    expect(result.meld.tiles.length).toBe(3);
  });
});

describe('createMingGang', () => {
  it('明杠后手牌减少3张', () => {
    const hand = [
      createTile('wan', 1, 0),
      createTile('wan', 1, 1),
      createTile('wan', 1, 2),
    ];
    const discard = createTile('wan', 1, 3);
    const result = createMingGang(hand, discard);
    expect(result.hand.length).toBe(0);
    expect(result.meld.type).toBe('ming_gang');
    expect(result.meld.tiles.length).toBe(4);
  });
});

describe('createAnGang', () => {
  it('暗杠后手牌减少4张', () => {
    const hand = [
      createTile('wan', 1, 0),
      createTile('wan', 1, 1),
      createTile('wan', 1, 2),
      createTile('wan', 1, 3),
    ];
    const result = createAnGang(hand, 'wan', 1);
    expect(result!.hand.length).toBe(0);
    expect(result!.meld.type).toBe('an_gang');
  });
});

describe('getPengTiles', () => {
  it('返回手中可以碰的牌', () => {
    const hand = [
      createTile('wan', 1, 0),
      createTile('wan', 1, 1),
    ];
    const result = getPengTiles(hand);
    expect(result.length).toBe(1);
    expect(result[0].type).toBe('wan');
    expect(result[0].value).toBe(1);
    expect(result[0].count).toBe(2);
  });
});

describe('canJiaGang', () => {
  it('有 peng 且手中有第4张时可以加杠', () => {
    const hand = [createTile('wan', 1, 3)];
    const melds: Meld[] = [
      { type: 'peng', tiles: [
        createTile('wan', 1, 0),
        createTile('wan', 1, 1),
        createTile('wan', 1, 2),
      ]},
    ];
    expect(canJiaGang(hand, melds)).toBe(true);
  });

  it('没有对应 peng 不能加杠', () => {
    const hand = [createTile('wan', 1, 3)];
    const melds: Meld[] = [];
    expect(canJiaGang(hand, melds)).toBe(false);
  });

  it('手中有牌但 peng 不匹配不能加杠', () => {
    const hand = [createTile('wan', 2, 3)];
    const melds: Meld[] = [
      { type: 'peng', tiles: [
        createTile('wan', 1, 0),
        createTile('wan', 1, 1),
        createTile('wan', 1, 2),
      ]},
    ];
    expect(canJiaGang(hand, melds)).toBe(false);
  });
});

describe('createJiaGang', () => {
  it('加杠后 peng 变 jia_gang，手牌-1', () => {
    const hand = [createTile('wan', 1, 3), createTile('tiao', 2, 10)];
    const melds: Meld[] = [
      { type: 'peng', tiles: [
        createTile('wan', 1, 0),
        createTile('wan', 1, 1),
        createTile('wan', 1, 2),
      ]},
    ];
    const result = createJiaGang(hand, melds, 'wan', 1);
    expect(result).not.toBeNull();
    expect(result!.hand.length).toBe(1);
    expect(result!.melds.length).toBe(1);
    expect(result!.melds[0].type).toBe('jia_gang');
    expect(result!.melds[0].tiles.length).toBe(4);
  });
});
