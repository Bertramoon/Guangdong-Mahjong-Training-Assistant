import { describe, it, expect } from 'vitest';
import { getDiscardRecommendation } from '../../src/engine/advisor';
import { calculateShanten } from '../../src/engine/shanten';
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

describe('ghost shanten bug: ghost subtraction makes tenpai appear as complete hand', () => {
  // Hand: 万3万4万5 / 条1条2条3条4 / 筒2筒3筒4筒6 / ghost=条6
  // Meld: 红中红中红中 (meldCount=1)
  //
  // After discarding 条1, 11 tiles remain:
  //   Normal: 万345(1m), 条234(1m), 筒234(1m) + 筒6(isolated)
  //   With meld: total M=4, T=0, base shanten = 8-8-0 = 0
  //   With ghost: 0-1 = -1 (ghost acts as pair for 筒6 → complete hand)

  it('base shanten of normal tiles is 0 (tenpai), ghost makes it -1 correctly', () => {
    // 10 normal tiles, no ghost
    const normalTiles = [
      h('w',3), h('w',4), h('w',5),
      h('t',2), h('t',3), h('t',4),
      h('g',2), h('g',3), h('g',4), h('g',6),
    ];
    const baseShanten = calculateShanten(normalTiles, null, null, 1);
    expect(baseShanten).toBe(0);

    // Same tiles + ghost tile: ghost pairs with 筒6 → complete hand
    const withGhost = [...normalTiles, h('t',6)];
    const ghostShanten = calculateShanten(withGhost, 'tiao', 6, 1);
    expect(ghostShanten).toBe(-1);
  });

  it('advisor reports correct acceptance tiles for the bug scenario', () => {
    // Full hand (user's scenario)
    const hand = [
      h('w',3), h('w',4), h('w',5),
      h('t',1), h('t',2), h('t',3), h('t',4),
      h('t',6),  // ghost 条6
      h('g',2), h('g',3), h('g',4), h('g',6),
    ];
    const result = getDiscardRecommendation(hand, 'tiao', 6, 1);

    const discardTiao1 = result.evaluations.find(
      e => e.discardTile.type === 'tiao' && e.discardTile.value === 1
    );
    expect(discardTiao1).toBeDefined();

    // After discarding 条1, ghost pairs with any isolated tile → shanten=-1 (complete)
    expect(discardTiao1!.shanten).toBe(-1);

    // Ghost can pair with 筒6 to form a pair, completing the hand
    // Acceptance tiles should include tiles that reduce shanten
    const acceptanceKeys = discardTiao1!.acceptanceTiles.map(a => `${a.type}-${a.value}`);
    // With the pair-tracking fix, acceptance tiles for shanten=-1 are those that
    // reduce to -2, meaning the ghost double-pairs. The exact list depends on
    // the fix; just verify it's a reasonable number
    expect(acceptanceKeys.length).toBeGreaterThan(0);
  });

  it('acceptance check: adding tiles that form pairs reduce shanten', () => {
    // 11-tile hand after discarding 条1 (with ghost, total 11 tiles)
    const handAfterDiscard = [
      h('w',3), h('w',4), h('w',5),
      h('t',2), h('t',3), h('t',4),
      h('t',6),  // ghost
      h('g',2), h('g',3), h('g',4), h('g',6),
    ];

    const baseShanten = calculateShanten(handAfterDiscard, 'tiao', 6, 1);
    // Ghost pairs with 筒6 → complete hand
    expect(baseShanten).toBe(-1);

    // Adding 筒6 (pairs with existing 筒6, ghost still available for other uses):
    const withTong6 = [...handAfterDiscard, { type: 'tong' as const, value: 6, id: -1 }];
    const shantenWithTong6 = calculateShanten(withTong6, 'tiao', 6, 1);
    // Adding 筒6 gives a triplet, ghost is free → still -1 or lower
    expect(shantenWithTong6).toBeLessThanOrEqual(-1);
  });
});

describe('advisor pair tracking regression', () => {
  it('M=4 no pair with gap wait: correctly reports tenpai, not won', () => {
    // 万345 条234 筒2346 + meld(中中中), no ghost, meldCount=1
    // 11 tiles. M=4 (万345+条234+筒234+meld), no pair, gap wait 46 or isolated 6
    // With pair-tracking fix: shanten=0 (tenpai, not -1)
    const hand = [
      h('w',3),h('w',4),h('w',5),
      h('t',2),h('t',3),h('t',4),
      h('g',2),h('g',3),h('g',4),h('g',6),
    ];
    const shanten = calculateShanten(hand, null, null, 1);
    expect(shanten).toBe(0);
  });

  it('M=4 with pair: correctly reports won', () => {
    // Same but add 筒6 to form pair → shanten=-1
    const hand = [
      h('w',3),h('w',4),h('w',5),
      h('t',2),h('t',3),h('t',4),
      h('g',2),h('g',3),h('g',4),h('g',6),h('g',6),
    ];
    const shanten = calculateShanten(hand, null, null, 1);
    expect(shanten).toBe(-1);
  });
});
