import type { Tile, TileType, Meld } from './types';
import { decomposeHand, isThirteenOrphans } from './hu';

/** 番型计分上下文（由对局流程给出） */
export interface FanContext {
  /** 本次胡牌是否为杠后补牌（杠上开花） */
  isKongBlossom: boolean;
  /** 天胡：庄家起手即胡（由对局流程判定） */
  isHeavenlyHu?: boolean;
  /** 地胡：闲家第一巡摸牌即胡（由对局流程判定） */
  isEarthlyHu?: boolean;
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

/** 满鬼固定番数 */
const FULL_GHOST_FAN = 6;

/**
 * 各番种说明（结算面板展示用）。
 * 纯推倒胡：平胡基础 1 番，大胡牌型 ×2（不累计），无鬼硬胡 ×2，杠上开花 ×2，满鬼固定 6 番。
 */
export const FAN_DESCRIPTIONS: Record<string, string> = {
  平胡: '任意牌型组合的自摸胡，基础 1 番',
  清一色: '整副牌由同一门数牌组成，属大胡（×2）',
  字一色: '整副牌全部由风牌、箭牌组成，属大胡（×2）',
  七对: '门清 7 组对子成胡，属大胡（×2）',
  四暗刻: '门清 4 组暗刻成胡（暗杠可计），属大胡（×2）',
  十八罗汉: '开杠四手（任意杠）后成胡，属大胡（×2）',
  大三元: '中、发、白三组刻子齐全，属大胡（×2）',
  小四喜: '东、南、西、北三组刻子加一组风将，属大胡（×2）',
  大四喜: '东、南、西、北四组刻子齐全，属大胡（×2）',
  十三幺: '东南西北中发白加三门一九牌，其中一张成对，属大胡（×2）',
  天胡: '庄家起手即成胡型，属大胡（×2）',
  地胡: '闲家第一巡摸牌即成胡型，属大胡（×2）',
  无鬼硬胡: '胡牌时手牌与副露完全不含鬼牌，分数 ×2',
  杠上开花: '开杠后补摸的牌恰好成胡，分数 ×2',
  满鬼: '手牌集齐全部 4 张鬼牌，可直接成胡，固定 6 番',
};

function isGhostTile(t: Tile, ghostType: TileType | null, ghostValue: number | null): boolean {
  return ghostType !== null && ghostValue !== null && t.type === ghostType && t.value === ghostValue;
}

function isNumberSuitType(type: TileType): boolean {
  return type === 'wan' || type === 'tiao' || type === 'tong';
}

function isKongMeld(m: Meld): boolean {
  return m.type === 'ming_gang' || m.type === 'an_gang' || m.type === 'jia_gang';
}

/**
 * 大胡判定（纯推倒胡：命中即 ×2，多个大胡不累计，按优先级只取一个）。
 * 优先级：天胡 > 地胡 > 字一色 > 十三幺 > 清一色 > 大三元 > 大四喜 > 小四喜 > 十八罗汉 > 四暗刻 > 七对
 */
function detectBigHand(
  concealedHand: Tile[],
  melds: Meld[],
  ghostType: TileType | null,
  ghostValue: number | null,
  ctx: FanContext,
): string | null {
  if (ctx.isHeavenlyHu) return '天胡';
  if (ctx.isEarthlyHu) return '地胡';

  const allTiles = [...concealedHand, ...melds.flatMap(m => m.tiles)];
  const nonGhost = allTiles.filter(t => !isGhostTile(t, ghostType, ghostValue));

  // 字一色：非鬼牌全部为字牌
  if (nonGhost.length > 0 && nonGhost.every(t => !isNumberSuitType(t.type))) return '字一色';

  // 十三幺（必须门清）
  if (melds.length === 0 && isThirteenOrphans(concealedHand, ghostType, ghostValue)) return '十三幺';

  // 清一色：非鬼牌只含一门数牌（鬼牌视为该门）
  const numberTypes = new Set(nonGhost.filter(t => isNumberSuitType(t.type)).map(t => t.type));
  const hasHonor = nonGhost.some(t => !isNumberSuitType(t.type));
  if (numberTypes.size === 1 && !hasHonor) return '清一色';

  const countOf = (type: TileType, value: number): number =>
    allTiles.reduce((n, t) => n + (t.type === type && t.value === value ? 1 : 0), 0);

  // 大三元
  if (countOf('jian', 1) >= 3 && countOf('jian', 2) >= 3 && countOf('jian', 3) >= 3) return '大三元';

  // 大四喜 / 小四喜
  const windCounts = [1, 2, 3, 4].map(v => countOf('feng', v));
  if (windCounts.every(c => c >= 3)) return '大四喜';
  if (windCounts.filter(c => c >= 3).length === 3 && windCounts.some(c => c === 2)) return '小四喜';

  // 十八罗汉：4 手杠（任意杠）+ 将
  if (melds.length === 4 && melds.every(isKongMeld) && concealedHand.length === 2) {
    const [a, b] = concealedHand;
    const isPair =
      (a.type === b.type && a.value === b.value) ||
      isGhostTile(a, ghostType, ghostValue) ||
      isGhostTile(b, ghostType, ghostValue);
    if (isPair) return '十八罗汉';
  }

  const decomps = decomposeHand(concealedHand, ghostType, ghostValue, melds.length);

  // 四暗刻：无碰/明杠/加杠（暗杠计暗刻），暗刻总数为 4
  if (melds.every(m => m.type === 'an_gang')) {
    const anGangCount = melds.length;
    const ok = decomps.some(
      d =>
        !d.isSevenPairs &&
        d.melds.every(mm => mm.kind === 'triplet') &&
        d.melds.length + anGangCount === 4,
    );
    if (ok) return '四暗刻';
  }

  // 七对
  if (decomps.some(d => d.isSevenPairs)) return '七对';

  return null;
}

/**
 * 计算胡牌番型与分数（纯推倒胡）：
 * - 平胡基础 1 番（2 分）
 * - 大胡牌型 +1 番（×2，不累计）
 * - 无鬼硬胡 +1 番（×2）
 * - 杠上开花 +1 番（×2）
 * - 满鬼（4 张鬼牌）固定 6 番（替代平胡与大胡；杠上开花仍可叠加）
 * 分数 = 2^总番。
 */
export function calculateFan(
  concealedHand: Tile[],
  melds: Meld[],
  ghostType: TileType | null,
  ghostValue: number | null,
  ctx: FanContext,
): FanResult {
  const ghostCount = concealedHand.filter(t => isGhostTile(t, ghostType, ghostValue)).length;
  const meldsHaveGhost = melds.some(m => m.tiles.some(t => isGhostTile(t, ghostType, ghostValue)));

  const fans: FanEntry[] = [];
  if (ghostCount === 4) {
    fans.push({ name: '满鬼', value: FULL_GHOST_FAN });
  } else {
    fans.push({ name: '平胡', value: 1 });
    const bigHand = detectBigHand(concealedHand, melds, ghostType, ghostValue, ctx);
    if (bigHand) fans.push({ name: bigHand, value: 1 });
    if (ghostCount === 0 && !meldsHaveGhost) {
      fans.push({ name: '无鬼硬胡', value: 1 });
    }
  }

  if (ctx.isKongBlossom) fans.push({ name: '杠上开花', value: 1 });

  const totalFan = fans.reduce((s, f) => s + f.value, 0);
  return { fans, totalFan, score: Math.pow(2, totalFan) };
}
