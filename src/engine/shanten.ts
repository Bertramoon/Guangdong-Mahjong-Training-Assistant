import type { Tile, TileType } from './types';

const SUIT_LENGTHS: Record<TileType, number> = {
  wan: 9, tiao: 9, tong: 9, feng: 4, jian: 3,
};

/** Check if suit supports sequences (wan/tiao/tong) */
export function isNumberSuit(suit: TileType): boolean {
  return suit === 'wan' || suit === 'tiao' || suit === 'tong';
}

/** Convert tiles of one suit to a count array (0-indexed: index=value-1) */
export function tilesToCounts(tiles: Tile[], suit: TileType): number[] {
  const len = SUIT_LENGTHS[suit];
  const counts = new Array(len).fill(0);
  for (const t of tiles) {
    if (t.type === suit) counts[t.value - 1]++;
  }
  return counts;
}

/**
 * For a single suit's count array, find the maximum taatsu count
 * for each possible mentsu count.
 *
 * Returns result[m] = max taatsu when exactly m mentsu are extracted.
 * Unreachable m values have result[m] = -1.
 */
export function suitMaxTaatsu(counts: number[], isNumber: boolean): number[] {
  const totalTiles = counts.reduce((a, b) => a + b, 0);
  const maxM = Math.min(4, Math.floor(totalTiles / 3));
  const result = new Array(maxM + 1).fill(-1);
  const c = [...counts];

  function search(pos: number, m: number, t: number): void {
    while (pos < c.length && c[pos] === 0) pos++;
    if (pos >= c.length) {
      if (m <= maxM) result[m] = Math.max(result[m], t);
      return;
    }

    // Try triplet (mentsu)
    if (c[pos] >= 3) {
      c[pos] -= 3;
      search(pos, m + 1, t);
      c[pos] += 3;
    }

    // Try sequence (mentsu, number suits only)
    if (isNumber && pos + 2 < c.length && c[pos] >= 1 && c[pos + 1] >= 1 && c[pos + 2] >= 1) {
      c[pos]--; c[pos + 1]--; c[pos + 2]--;
      search(pos, m + 1, t);
      c[pos]++; c[pos + 1]++; c[pos + 2]++;
    }

    // Try pair (taatsu)
    if (c[pos] >= 2) {
      c[pos] -= 2;
      search(pos, m, t + 1);
      c[pos] += 2;
    }

    // Try two-sided wait (taatsu, number suits only)
    if (isNumber && pos + 1 < c.length && c[pos] >= 1 && c[pos + 1] >= 1) {
      c[pos]--; c[pos + 1]--;
      search(pos, m, t + 1);
      c[pos]++; c[pos + 1]++;
    }

    // Try gap wait (taatsu, number suits only)
    if (isNumber && pos + 2 < c.length && c[pos] >= 1 && c[pos + 2] >= 1) {
      c[pos]--; c[pos + 2]--;
      search(pos, m, t + 1);
      c[pos]++; c[pos + 2]++;
    }

    // Skip this tile (isolated)
    c[pos]--;
    search(pos, m, t);
    c[pos]++;
  }

  search(0, 0, 0);
  return result;
}
