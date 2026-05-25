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

const ALL_SUITS: TileType[] = ['wan', 'tiao', 'tong', 'feng', 'jian'];

export function calculateShanten(
  hand: Tile[],
  ghostType: TileType | null,
  ghostValue: number | null,
  meldCount: number = 0,
): number {
  let ghostCount = 0;
  const normalTiles: Tile[] = [];
  for (const t of hand) {
    if (ghostType !== null && t.type === ghostType && t.value === ghostValue) {
      ghostCount++;
    } else {
      normalTiles.push(t);
    }
  }

  const standardShanten = calcStandardShanten(normalTiles, meldCount);
  let sevenPairsShanten = 99;
  if (meldCount === 0) {
    sevenPairsShanten = calcSevenPairsShanten(normalTiles);
  }

  const baseShanten = Math.min(standardShanten, sevenPairsShanten);
  return baseShanten - ghostCount;
}

function calcStandardShanten(normalTiles: Tile[], meldCount: number): number {
  const suitCounts: Record<string, number[]> = {};
  for (const suit of ALL_SUITS) {
    suitCounts[suit] = tilesToCounts(normalTiles, suit);
  }

  const suitResults: { suit: TileType; data: number[] }[] = [];
  for (const suit of ALL_SUITS) {
    const counts = suitCounts[suit];
    const isNum = isNumberSuit(suit as TileType);
    suitResults.push({ suit: suit as TileType, data: suitMaxTaatsu(counts, isNum) });
  }

  let dp = new Map<number, number>();
  dp.set(meldCount, 0);

  for (const { data } of suitResults) {
    const nextDp = new Map<number, number>();
    for (const [totalM, totalT] of dp) {
      for (let m = 0; m < data.length; m++) {
        if (data[m] < 0) continue;
        const newM = totalM + m;
        if (newM > 4) continue;
        const newT = totalT + data[m];
        const existing = nextDp.get(newM);
        if (existing === undefined || newT > existing) {
          nextDp.set(newM, newT);
        }
      }
    }
    dp = nextDp;
  }

  let minShanten = 8;
  for (const [m, t] of dp) {
    const effectiveT = Math.min(t, 4 - m + 1);
    const shanten = 8 - 2 * m - effectiveT;
    minShanten = Math.min(minShanten, shanten);
  }

  return minShanten;
}

function calcSevenPairsShanten(normalTiles: Tile[]): number {
  const pairCounts: Record<string, number> = {};
  for (const t of normalTiles) {
    const key = `${t.type}-${t.value}`;
    pairCounts[key] = (pairCounts[key] || 0) + 1;
  }

  let pairCount = 0;
  for (const count of Object.values(pairCounts)) {
    pairCount += Math.floor(count / 2);
  }

  return 6 - pairCount;
}
