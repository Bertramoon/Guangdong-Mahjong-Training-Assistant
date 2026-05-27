// src/robot/robot.ts
import type { Tile, TileType, Meld } from '../engine/types';
import { canPeng, canMingGang, canAnGang, canJiaGang } from '../engine/meld';

/**
 * 机器人选择一张手牌丢弃
 *
 * 策略（由优到劣）：
 * 1. 保留鬼牌（绝不丢弃）
 * 2. 优先丢弃字牌孤张（不成对不成搭的风/箭）
 * 3. 丢弃非字牌孤张
 * 4. 无孤张时，丢弃双张中一张（优先丢价值低的）
 * 5. 极端情况：随机丢一张非鬼牌
 */
export function robotDiscard(
  hand: Tile[],
  ghostType: TileType,
  ghostValue: number,
  rng: () => number = Math.random,
): Tile {
  const singles = findSingles(hand);

  // 过滤掉鬼牌（绝不丢弃）
  const nonGhostSingles = singles.filter(
    t => !(t.type === ghostType && t.value === ghostValue),
  );

  if (nonGhostSingles.length > 0) {
    // 优先丢弃字牌孤张
    const honorSingles = nonGhostSingles.filter(
      t => t.type === 'feng' || t.type === 'jian',
    );
    if (honorSingles.length > 0) {
      return honorSingles[0];
    }
    // 丢弃孤张（选择偏大的数牌）
    nonGhostSingles.sort((a, b) => b.value - a.value);
    return nonGhostSingles[0];
  }

  // 无孤张：找双张（count=2），优先丢价值低的
  const pairs = findPairs(hand);
  const nonGhostPairs = pairs.filter(
    t => !(t.type === ghostType && t.value === ghostValue),
  );
  if (nonGhostPairs.length > 0) {
    // 优先丢字牌对子
    const honorPair = nonGhostPairs.find(
      t => t.type === 'feng' || t.type === 'jian',
    );
    if (honorPair) return honorPair;
    return nonGhostPairs[0];
  }

  // 极端情况：丢任意一张非鬼牌
  const nonGhost = hand.filter(
    t => !(t.type === ghostType && t.value === ghostValue),
  );
  if (nonGhost.length > 0) {
    return nonGhost[Math.floor(rng() * nonGhost.length)];
  }

  // 手牌只剩鬼牌，无奈只能丢鬼牌
  return hand[0];
}

/**
 * 找出所有单张（不成对、不成搭）
 */
export function findSingles(hand: Tile[]): Tile[] {
  const countMap = new Map<string, number>();
  for (const t of hand) {
    const key = `${t.type}-${t.value}`;
    countMap.set(key, (countMap.get(key) || 0) + 1);
  }

  // 成对或成刻的牌
  const safeKeys = new Set<string>();
  for (const [key, count] of countMap) {
    if (count >= 2) safeKeys.add(key);
  }

  // 成顺子搭的牌
  for (const t of hand) {
    if (t.type === 'feng' || t.type === 'jian') continue;
    const k0 = `${t.type}-${t.value}`;
    const k1 = `${t.type}-${t.value + 1}`;
    const k2 = `${t.type}-${t.value + 2}`;
    if (countMap.has(k1) && countMap.has(k2)) {
      safeKeys.add(k0);
      safeKeys.add(k1);
      safeKeys.add(k2);
    }
    // 检查中间牌
    if (t.value >= 2 && t.value <= 8) {
      const km1 = `${t.type}-${t.value - 1}`;
      const kp1 = `${t.type}-${t.value + 1}`;
      if (countMap.has(km1) && countMap.has(kp1)) {
        safeKeys.add(`${t.type}-${t.value}`);
        safeKeys.add(km1);
        safeKeys.add(kp1);
      }
    }
  }

  const singles: Tile[] = [];
  const seen = new Set<string>();
  for (const t of hand) {
    const key = `${t.type}-${t.value}`;
    if (!safeKeys.has(key) && !seen.has(key)) {
      seen.add(key);
      singles.push(t);
    }
  }
  return singles;
}

/** 找出所有双张（count=2）中的一张代表 */
function findPairs(hand: Tile[]): Tile[] {
  const countMap = new Map<string, { count: number; tile: Tile }>();
  for (const t of hand) {
    const key = `${t.type}-${t.value}`;
    if (!countMap.has(key)) countMap.set(key, { count: 0, tile: t });
    countMap.get(key)!.count++;
  }

  const pairs: Tile[] = [];
  for (const [key, info] of countMap) {
    if (info.count === 2) pairs.push(info.tile);
  }
  return pairs;
}

/** 机器人是否应该碰 */
export function robotShouldPeng(hand: Tile[], discard: Tile): boolean {
  return canPeng(hand, discard);
}

/** 机器人是否应该明杠 */
export function robotShouldMingGang(hand: Tile[], discard: Tile): boolean {
  return canMingGang(hand, discard);
}

/** 机器人是否应该暗杠 */
export function robotShouldAnGang(hand: Tile[]): boolean {
  return canAnGang(hand);
}

/** 机器人是否应该加杠 */
export function robotShouldJiaGang(hand: Tile[], melds: Meld[]): boolean {
  return canJiaGang(hand, melds);
}
