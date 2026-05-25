import type { Tile, TileType } from './types';
import { calculateShanten } from './shanten';

const SUIT_RANGES: Record<TileType, number> = {
  wan: 9, tiao: 9, tong: 9, feng: 4, jian: 3,
};
const SUIT_ORDER: TileType[] = ['wan', 'tiao', 'tong', 'feng', 'jian'];

const ALL_TILE_TYPES: { type: TileType; value: number }[] = [];
for (const suit of SUIT_ORDER) {
  for (let v = 1; v <= SUIT_RANGES[suit]; v++) {
    ALL_TILE_TYPES.push({ type: suit, value: v });
  }
}

export interface AcceptanceTile {
  type: TileType;
  value: number;
  maxCount: number;
}

export interface WaitingTile {
  type: TileType;
  value: number;
  maxCount: number;
}

export interface DiscardEvaluation {
  discardTile: Tile;
  shanten: number;
  acceptanceCount: number;
  acceptanceTiles: AcceptanceTile[];
  waitingTiles: WaitingTile[];
}

export interface DiscardRecommendation {
  evaluations: DiscardEvaluation[];
  currentShanten: number;
}

export function getDiscardRecommendation(
  hand: Tile[],
  ghostType: TileType | null,
  ghostValue: number | null,
  meldCount: number = 0,
): DiscardRecommendation {
  const isGhost = (t: Tile) =>
    ghostType !== null && t.type === ghostType && t.value === ghostValue;

  const seen = new Set<string>();
  const candidates: Tile[] = [];
  for (const t of hand) {
    if (isGhost(t)) continue;
    const key = `${t.type}-${t.value}`;
    if (!seen.has(key)) {
      seen.add(key);
      candidates.push(t);
    }
  }

  const evaluations: DiscardEvaluation[] = [];

  for (const candidate of candidates) {
    let removed = false;
    const remaining = hand.filter(t => {
      if (!removed && t.type === candidate.type && t.value === candidate.value) {
        removed = true;
        return false;
      }
      return true;
    });
    evaluateDiscard(remaining, candidate, ghostType, ghostValue, meldCount, evaluations);
  }

  evaluations.sort((a, b) => {
    if (a.shanten !== b.shanten) return a.shanten - b.shanten;
    return b.acceptanceCount - a.acceptanceCount;
  });

  const top10 = evaluations.slice(0, 10);
  const currentShanten = top10.length > 0 ? top10[0].shanten : 8;

  return { evaluations: top10, currentShanten };
}

function evaluateDiscard(
  hand13: Tile[],
  discardTile: Tile,
  ghostType: TileType | null,
  ghostValue: number | null,
  meldCount: number,
  results: DiscardEvaluation[],
): void {
  const shanten = calculateShanten(hand13, ghostType, ghostValue, meldCount);

  const acceptanceTiles: AcceptanceTile[] = [];
  const waitingTiles: WaitingTile[] = [];

  for (const { type, value } of ALL_TILE_TYPES) {
    const testHand = [...hand13, { type, value, id: -1 }];
    const newShanten = calculateShanten(testHand, ghostType, ghostValue, meldCount);
    if (newShanten < shanten) {
      acceptanceTiles.push({ type, value, maxCount: 4 });
    }
  }

  if (shanten === 0) {
    for (const at of acceptanceTiles) {
      waitingTiles.push(at);
    }
  }

  results.push({
    discardTile,
    shanten,
    acceptanceCount: acceptanceTiles.length,
    acceptanceTiles,
    waitingTiles,
  });
}
