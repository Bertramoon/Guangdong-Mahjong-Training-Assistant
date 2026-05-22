import { describe, it, expect } from 'vitest';
import { createPeng, createMingGang, createAnGang, canPeng, canMingGang, canAnGang, getPengTiles } from '../../src/engine/meld';
import { createTile } from '../../src/engine/tile';

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
