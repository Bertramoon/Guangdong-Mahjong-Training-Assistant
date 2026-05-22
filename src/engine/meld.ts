import type { Tile, TileType, Meld } from './types';
import { removeTile, sortHand } from './hand';

export function canPeng(hand: Tile[], discard: Tile): boolean {
  const count = hand.filter(
    t => t.type === discard.type && t.value === discard.value,
  ).length;
  return count >= 2;
}

export function canMingGang(hand: Tile[], discard: Tile): boolean {
  const count = hand.filter(
    t => t.type === discard.type && t.value === discard.value,
  ).length;
  return count >= 3;
}

export function canAnGang(hand: Tile[]): boolean {
  return getAnGangTiles(hand).length > 0;
}

export function createPeng(
  hand: Tile[],
  discard: Tile,
): { hand: Tile[]; meld: Meld } {
  let h = [...hand];
  const r1 = removeTile(h, discard.type, discard.value)!;
  h = r1.hand;
  const r2 = removeTile(h, discard.type, discard.value)!;
  h = r2.hand;

  const meld: Meld = {
    type: 'peng',
    tiles: [r1.removed, r2.removed, discard],
  };
  return { hand: sortHand(h), meld };
}

export function createMingGang(
  hand: Tile[],
  discard: Tile,
): { hand: Tile[]; meld: Meld } {
  let h = [...hand];
  const r1 = removeTile(h, discard.type, discard.value)!;
  h = r1.hand;
  const r2 = removeTile(h, discard.type, discard.value)!;
  h = r2.hand;
  const r3 = removeTile(h, discard.type, discard.value)!;
  h = r3.hand;

  const meld: Meld = {
    type: 'ming_gang',
    tiles: [r1.removed, r2.removed, r3.removed, discard],
  };
  return { hand: sortHand(h), meld };
}

export function createAnGang(
  hand: Tile[],
  type: TileType,
  value: number,
): { hand: Tile[]; meld: Meld } | null {
  const tiles = hand.filter(t => t.type === type && t.value === value);
  if (tiles.length < 4) return null;

  let h = [...hand];
  for (let i = 0; i < 4; i++) {
    h = removeTile(h, type, value)!.hand;
  }

  const meld: Meld = {
    type: 'an_gang',
    tiles: tiles.slice(0, 4),
  };
  return { hand: sortHand(h), meld };
}

export function getPengTiles(hand: Tile[]): { type: TileType; value: number; count: number }[] {
  const result: { type: TileType; value: number; count: number }[] = [];
  const counted = new Set<string>();
  for (const t of hand) {
    const key = `${t.type}-${t.value}`;
    if (counted.has(key)) continue;
    counted.add(key);
    const count = hand.filter(h => h.type === t.type && h.value === t.value).length;
    if (count >= 2) {
      result.push({ type: t.type, value: t.value, count });
    }
  }
  return result;
}

function getAnGangTiles(hand: Tile[]): TileType[] {
  const counted = new Map<string, number>();
  for (const t of hand) {
    const key = `${t.type}-${t.value}`;
    counted.set(key, (counted.get(key) || 0) + 1);
  }
  const result: TileType[] = [];
  for (const [key, count] of counted) {
    if (count >= 4) {
      result.push(key.split('-')[0] as TileType);
    }
  }
  return result;
}
