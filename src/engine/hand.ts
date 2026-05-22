import type { Tile, TileType } from './types';

const TYPE_ORDER: Record<TileType, number> = {
  wan: 0, tiao: 1, tong: 2, feng: 3, jian: 4,
};

export function sortHand(hand: Tile[]): Tile[] {
  return [...hand].sort((a, b) => {
    const typeDiff = TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
    if (typeDiff !== 0) return typeDiff;
    return a.value - b.value;
  });
}

export function addTile(hand: Tile[], tile: Tile): Tile[] {
  return sortHand([...hand, tile]);
}

export function removeTile(
  hand: Tile[],
  type: TileType,
  value: number,
): { hand: Tile[]; removed: Tile } | null {
  const idx = hand.findIndex(t => t.type === type && t.value === value);
  if (idx === -1) return null;
  const removed = hand[idx];
  const newHand = [...hand];
  newHand.splice(idx, 1);
  return { hand: newHand, removed };
}

export function removeTileByIndex(hand: Tile[], index: number): Tile[] | null {
  if (index < 0 || index >= hand.length) return null;
  const newHand = [...hand];
  newHand.splice(index, 1);
  return newHand;
}

export function hasPair(hand: Tile[]): boolean {
  const sorted = sortHand(hand);
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].type === sorted[i + 1].type && sorted[i].value === sorted[i + 1].value) {
      return true;
    }
  }
  return false;
}

export function groupByType(hand: Tile[]): Record<TileType, Tile[]> {
  const groups: Record<TileType, Tile[]> = {
    wan: [], tiao: [], tong: [], feng: [], jian: [],
  };
  for (const t of hand) {
    groups[t.type].push(t);
  }
  return groups;
}
