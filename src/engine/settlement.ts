import type { FanResult } from './scoring';
import type { Meld, Tile, TileType } from './types';
import { getTileName } from './tile';

export type SettlementKind = 'hu' | 'ming_gang' | 'an_gang' | 'jia_gang';

export interface SettlementLine {
  kind: SettlementKind;
  label: string;
  deltas: number[];
}

export interface HorseResult {
  tile: Tile;
  owner: number | null;
  isHit: boolean;
}

export interface Settlement {
  balances: number[];
  lines: SettlementLine[];
  isDraw: boolean;
  baseScore: number;
  finalHuScore: number;
  horseCount: number;
  horseTiles: Tile[];
  horseResults: HorseResult[];
}

export interface SettlementParams {
  winner: number | null;
  melds: Meld[][];
  hands: Tile[][];
  huResult: FanResult | null;
  dealerIndex: number;
  reserveTiles: Tile[];
  ghostType: TileType;
  ghostValue: number;
}

const PLAYER_COUNT = 4;
const HORSE_SETS = [
  new Set(['1', '5', '9', '东', '中']),
  new Set(['2', '6', '南', '发']),
  new Set(['3', '7', '西', '白']),
  new Set(['4', '8', '北']),
];

function emptySettlement(isDraw: boolean): Settlement {
  return {
    balances: [0, 0, 0, 0],
    lines: [],
    isDraw,
    baseScore: 0,
    finalHuScore: 0,
    horseCount: 0,
    horseTiles: [],
    horseResults: [],
  };
}

function tileHorseKey(tile: Tile): string | null {
  if (tile.type === 'feng') return getTileName(tile);
  if (tile.type === 'jian') return getTileName(tile);
  if (tile.type === 'wan' || tile.type === 'tiao' || tile.type === 'tong') return String(tile.value);
  return null;
}

function horseOwner(tile: Tile, dealerIndex: number): number | null {
  const key = tileHorseKey(tile);
  if (!key) return null;
  const relative = HORSE_SETS.findIndex(set => set.has(key));
  if (relative === -1) return null;
  return (dealerIndex - relative + PLAYER_COUNT) % PLAYER_COUNT;
}

function hasGhost(tiles: Tile[], ghostType: TileType, ghostValue: number): boolean {
  return tiles.some(t => t.type === ghostType && t.value === ghostValue);
}

function winnerUsesGhost(
  hand: Tile[],
  melds: Meld[],
  ghostType: TileType,
  ghostValue: number,
): boolean {
  return hasGhost(hand, ghostType, ghostValue) || melds.some(m => hasGhost(m.tiles, ghostType, ghostValue));
}

function addLine(balances: number[], lines: SettlementLine[], line: SettlementLine) {
  for (let i = 0; i < PLAYER_COUNT; i++) balances[i] += line.deltas[i] ?? 0;
  lines.push(line);
}

function kongTileName(meld: Meld): string {
  return meld.tiles[0] ? getTileName(meld.tiles[0]) : '未知牌';
}

export function computeSettlement(params: SettlementParams): Settlement {
  const { winner, melds, hands, huResult, dealerIndex, reserveTiles, ghostType, ghostValue } = params;
  if (winner === null || winner < 0 || !huResult) return emptySettlement(true);

  const balances = [0, 0, 0, 0];
  const lines: SettlementLine[] = [];
  const winnerMelds = melds[winner] ?? [];
  const horseTileCount = winnerUsesGhost(hands[winner] ?? [], winnerMelds, ghostType, ghostValue) ? 4 : 6;
  const horseTiles = reserveTiles.slice(-horseTileCount);
  const horseResults = horseTiles.map(tile => {
    const owner = horseOwner(tile, dealerIndex);
    return { tile, owner, isHit: owner === winner };
  });
  const horseCount = horseResults.filter(h => h.isHit).length;
  const baseScore = huResult.score;
  const finalHuScore = baseScore * (horseCount + 1);

  const huDeltas = Array(PLAYER_COUNT).fill(-finalHuScore);
  huDeltas[winner] = finalHuScore * (PLAYER_COUNT - 1);
  addLine(balances, lines, {
    kind: 'hu',
    label: `自摸胡：${baseScore} × (${horseCount} + 1) = ${finalHuScore}`,
    deltas: huDeltas,
  });

  for (let player = 0; player < PLAYER_COUNT; player++) {
    for (const meld of melds[player] ?? []) {
      if (meld.type === 'ming_gang') {
        if (typeof meld.source !== 'number' || meld.source < 0 || meld.source >= PLAYER_COUNT) continue;
        const deltas = Array(PLAYER_COUNT).fill(0);
        deltas[player] += 3;
        deltas[meld.source] -= 3;
        addLine(balances, lines, {
          kind: 'ming_gang',
          label: `明杠 ${kongTileName(meld)}`,
          deltas,
        });
      } else if (meld.type === 'jia_gang') {
        const deltas = Array(PLAYER_COUNT).fill(-1);
        deltas[player] = 3;
        addLine(balances, lines, {
          kind: 'jia_gang',
          label: `加杠 ${kongTileName(meld)}`,
          deltas,
        });
      } else if (meld.type === 'an_gang') {
        const deltas = Array(PLAYER_COUNT).fill(-2);
        deltas[player] = 6;
        addLine(balances, lines, {
          kind: 'an_gang',
          label: `暗杠 ${kongTileName(meld)}`,
          deltas,
        });
      }
    }
  }

  return { balances, lines, isDraw: false, baseScore, finalHuScore, horseCount, horseTiles, horseResults };
}
