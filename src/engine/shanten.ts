import type { Tile, TileType } from './types';

/** 模块级缓存 */
const suitCache = new Map<string, SuitResult>();

/** 将 count 数组编码为缓存 key */
export function encodeSuitKey(counts: number[], isNumber: boolean): string {
  return `${isNumber ? 'N' : 'H'}:${counts.join(',')}`;
}

/** 批量加载缓存条目 */
export function loadSuitCache(entries: [string, SuitResult][]): void {
  for (const [key, value] of entries) {
    suitCache.set(key, value);
  }
}

/** 获取所有缓存条目 */
export function getSuitCacheEntries(): [string, SuitResult][] {
  return Array.from(suitCache.entries());
}

/** 获取当前缓存条目数 */
export function getSuitCacheSize(): number {
  return suitCache.size;
}

/** 清空缓存 */
export function clearSuitCache(): void {
  suitCache.clear();
}

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

export interface SuitResult {
  any: number[];      // any[m] = max taatsu regardless of pair type
  withPair: number[]; // withPair[m] = max taatsu with at least one pair taatsu (-1 if impossible)
}

export function suitMaxTaatsu(counts: number[], isNumber: boolean): SuitResult {
  const key = encodeSuitKey(counts, isNumber);
  const cached = suitCache.get(key);
  if (cached) return cached;

  const totalTiles = counts.reduce((a, b) => a + b, 0);
  const maxM = Math.min(4, Math.floor(totalTiles / 3));
  const any = new Array(maxM + 1).fill(-1);
  const withPair = new Array(maxM + 1).fill(-1);
  const c = [...counts];

  function search(pos: number, m: number, t: number, hasPair: boolean): void {
    while (pos < c.length && c[pos] === 0) pos++;
    if (pos >= c.length) {
      if (m <= maxM) {
        any[m] = Math.max(any[m], t);
        if (hasPair) withPair[m] = Math.max(withPair[m], t);
      }
      return;
    }

    // Try triplet (mentsu)
    if (c[pos] >= 3) {
      c[pos] -= 3;
      search(pos, m + 1, t, hasPair);
      c[pos] += 3;
    }

    // Try sequence (mentsu, number suits only)
    if (isNumber && pos + 2 < c.length && c[pos] >= 1 && c[pos + 1] >= 1 && c[pos + 2] >= 1) {
      c[pos]--; c[pos + 1]--; c[pos + 2]--;
      search(pos, m + 1, t, hasPair);
      c[pos]++; c[pos + 1]++; c[pos + 2]++;
    }

    // Try pair (taatsu) — this IS a pair
    if (c[pos] >= 2) {
      c[pos] -= 2;
      search(pos, m, t + 1, true);
      c[pos] += 2;
    }

    // Try two-sided wait (taatsu, NOT a pair)
    if (isNumber && pos + 1 < c.length && c[pos] >= 1 && c[pos + 1] >= 1) {
      c[pos]--; c[pos + 1]--;
      search(pos, m, t + 1, hasPair);
      c[pos]++; c[pos + 1]++;
    }

    // Try gap wait (taatsu, NOT a pair)
    if (isNumber && pos + 2 < c.length && c[pos] >= 1 && c[pos + 2] >= 1) {
      c[pos]--; c[pos + 2]--;
      search(pos, m, t + 1, hasPair);
      c[pos]++; c[pos + 2]++;
    }

    // Skip this tile (isolated)
    c[pos]--;
    search(pos, m, t, hasPair);
    c[pos]++;
  }

  search(0, 0, 0, false);
  const result = { any, withPair };
  suitCache.set(key, result);
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

  const suitResults: { suit: TileType; data: SuitResult }[] = [];
  for (const suit of ALL_SUITS) {
    const counts = suitCounts[suit];
    const isNum = isNumberSuit(suit as TileType);
    suitResults.push({ suit: suit as TileType, data: suitMaxTaatsu(counts, isNum) });
  }

  // Two DP maps:
  // dpAny[totalM] = max total taatsu (any type)
  // dpPair[totalM] = max total taatsu (at least one pair taatsu from some suit)
  let dpAny = new Map<number, number>();
  let dpPair = new Map<number, number>();
  dpAny.set(meldCount, 0);

  for (const { any, withPair } of suitResults.map(r => r.data)) {
    const nextDpAny = new Map<number, number>();
    const nextDpPair = new Map<number, number>();

    // dpAny + any → nextDpAny
    for (const [totalM, totalT] of dpAny) {
      for (let m = 0; m < any.length; m++) {
        if (any[m] < 0) continue;
        const newM = totalM + m;
        if (newM > 4) continue;
        const newT = totalT + any[m];
        const existing = nextDpAny.get(newM);
        if (existing === undefined || newT > existing) {
          nextDpAny.set(newM, newT);
        }
      }
    }

    // dpAny + withPair → nextDpPair (this suit provides the pair)
    for (const [totalM, totalT] of dpAny) {
      for (let m = 0; m < withPair.length; m++) {
        if (withPair[m] < 0) continue;
        const newM = totalM + m;
        if (newM > 4) continue;
        const newT = totalT + withPair[m];
        const existing = nextDpPair.get(newM);
        if (existing === undefined || newT > existing) {
          nextDpPair.set(newM, newT);
        }
      }
    }

    // dpPair + any → nextDpPair (pair already found, any suit can contribute)
    for (const [totalM, totalT] of dpPair) {
      for (let m = 0; m < any.length; m++) {
        if (any[m] < 0) continue;
        const newM = totalM + m;
        if (newM > 4) continue;
        const newT = totalT + any[m];
        const existing = nextDpPair.get(newM);
        if (existing === undefined || newT > existing) {
          nextDpPair.set(newM, newT);
        }
      }
    }

    dpAny = nextDpAny;
    dpPair = nextDpPair;
  }

  // Calculate minimum shanten from both maps
  let minShanten = 8;

  // No pair available: can't use a slot for head, max useful taatsu = 4-M
  for (const [m, t] of dpAny) {
    const effectiveT = Math.min(t, 4 - m);
    const shanten = 8 - 2 * m - effectiveT;
    minShanten = Math.min(minShanten, shanten);
  }

  // Pair available: one taatsu serves as head, max useful taatsu = 5-M
  for (const [m, t] of dpPair) {
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
