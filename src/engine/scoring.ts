import type { Tile, TileType, Meld } from './types';
import { decomposeHand, type Decomposition } from './hu';

/** 番型计分上下文（由对局流程给出） */
export interface FanContext {
  isSelfDraw: boolean;
  isKongBlossom: boolean;
}

/** 单个番型条目 */
export interface FanEntry {
  name: string;
  value: number;
}

/** 计分结果 */
export interface FanResult {
  fans: FanEntry[];
  totalFan: number;
  score: number;
}

function isNumberSuitType(type: TileType): boolean {
  return type === 'wan' || type === 'tiao' || type === 'tong';
}

/**
 * 花色类番型（与分解无关，依据全部非鬼牌组成判定）。
 * 鬼牌可任意充当，故只看非鬼牌：清一色/混一色/字一色 三者互斥。
 */
function computeSuitFans(nonGhost: Tile[]): FanEntry[] {
  const fans: FanEntry[] = [];
  const numberSuits = new Set<TileType>();
  let hasHonor = false;
  for (const t of nonGhost) {
    if (isNumberSuitType(t.type)) numberSuits.add(t.type);
    else hasHonor = true;
  }
  if (nonGhost.length === 0) return fans;
  if (numberSuits.size === 0) {
    fans.push({ name: '字一色', value: 8 });
  } else if (numberSuits.size === 1) {
    fans.push({ name: hasHonor ? '混一色' : '清一色', value: hasHonor ? 1 : 4 });
  }
  return fans;
}

function buildFans(
  decomp: Decomposition,
  meldCount: number,
  suitFans: FanEntry[],
  ctx: FanContext,
): FanEntry[] {
  const fans: FanEntry[] = [...suitFans];

  if (decomp.isSevenPairs) {
    fans.push({ name: '七对', value: 4 });
  } else {
    const allTriplets = decomp.melds.every(m => m.kind === 'triplet');
    const allSequences = decomp.melds.every(m => m.kind === 'sequence');
    // 副露（碰/杠）恒为刻子，故 concealed 全刻子即碰碰胡（含 4 副露空 concealed 情形）
    if (allTriplets) {
      fans.push({ name: '碰碰胡', value: 1 });
    }
    // 平和：门清、全顺子、将牌非字牌
    if (meldCount === 0 && allSequences && !decomp.pairIsHonor) {
      fans.push({ name: '平和', value: 1 });
    }
  }

  if (ctx.isSelfDraw) fans.push({ name: '自摸', value: 1 });
  if (ctx.isKongBlossom) fans.push({ name: '杠上开花', value: 1 });

  return fans;
}

function sumFans(fans: FanEntry[]): number {
  return fans.reduce((s, f) => s + f.value, 0);
}

/**
 * 计算胡牌番型与分数。鸡胡 = 0 番（底）；分数 = 2^总番数。
 * 枚举所有合法分解（含鬼牌替代），取使总番最大者。
 */
export function calculateFan(
  concealedHand: Tile[],
  melds: Meld[],
  ghostType: TileType | null,
  ghostValue: number | null,
  ctx: FanContext,
): FanResult {
  const isGhost = (t: Tile) =>
    ghostType !== null && ghostValue !== null && t.type === ghostType && t.value === ghostValue;

  const allTiles = [...concealedHand, ...melds.flatMap(m => m.tiles)];
  const nonGhost = allTiles.filter(t => !isGhost(t));
  const suitFans = computeSuitFans(nonGhost);

  const decompositions = decomposeHand(concealedHand, ghostType, ghostValue, melds.length);

  // 兜底：分解为空时退化为纯鸡胡（不应发生，因能胡必有分解）
  if (decompositions.length === 0) {
    const fans = buildFans(
      { isSevenPairs: false, pairSuit: 'wan', pairIsHonor: false, melds: [] },
      melds.length,
      suitFans,
      ctx,
    );
    const totalFan = sumFans(fans);
    return { fans, totalFan, score: Math.pow(2, totalFan) };
  }

  let best: FanResult = { fans: [], totalFan: -1, score: 1 };
  for (const decomp of decompositions) {
    const fans = buildFans(decomp, melds.length, suitFans, ctx);
    const totalFan = sumFans(fans);
    if (totalFan > best.totalFan) {
      best = { fans, totalFan, score: Math.pow(2, totalFan) };
    }
  }
  return best;
}
