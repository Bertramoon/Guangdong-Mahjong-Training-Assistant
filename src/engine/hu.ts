import type { Tile, TileType } from './types';

/**
 * 胡牌判定 Haupt-eintrag
 * hand: 手牌数组
 * ghostType: 鬼牌花色 (null = 无鬼牌)
 * ghostValue: 鬼牌数值 (null = 无鬼牌)
 */
export function canHu(hand: Tile[], ghostType: TileType | null, ghostValue: number | null): boolean {
  if (hand.length % 3 !== 2) return false;

  const ghostCount = ghostType !== null && ghostValue !== null
    ? hand.filter(t => t.type === ghostType && t.value === ghostValue).length
    : 0;

  const normalHand = ghostCount > 0
    ? hand.filter(t => !(t.type === ghostType && t.value === ghostValue))
    : [...hand];

  if (ghostCount === 0) {
    return canHuStandard(normalHand);
  }

  return canHuWithGhost(normalHand, ghostCount);
}

/** 标准胡牌判定（无鬼牌） */
function canHuStandard(hand: Tile[]): boolean {
  if (hand.length === 0) return true;
  if (hand.length % 3 !== 2) return false;

  // Check seven pairs (七对子) first
  if (canHuSevenPairs(hand)) return true;

  return tryWithHead(hand);
}

/** 七对子判定：14张牌，恰好7对 */
function canHuSevenPairs(hand: Tile[]): boolean {
  if (hand.length !== 14) return false;

  const sorted = [...hand].sort((a, b) => {
    const typeOrder = ['wan', 'tiao', 'tong', 'feng', 'jian'] as const;
    const td = typeOrder.indexOf(a.type as typeof typeOrder[number]) - typeOrder.indexOf(b.type as typeof typeOrder[number]);
    if (td !== 0) return td;
    return a.value - b.value;
  });

  for (let i = 0; i < 14; i += 2) {
    if (sorted[i].type !== sorted[i + 1].type || sorted[i].value !== sorted[i + 1].value) {
      return false;
    }
  }
  return true;
}

function tryWithHead(hand: Tile[]): boolean {
  const n = hand.length;
  // Try each possible pair as the head
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      if (hand[i].type === hand[j].type && hand[i].value === hand[j].value) {
        const remaining = hand.filter((_, idx) => idx !== i && idx !== j);
        if (canFormMelds(remaining)) {
          return true;
        }
      }
    }
  }
  return false;
}

function canFormMelds(hand: Tile[]): boolean {
  if (hand.length === 0) return true;
  if (hand.length % 3 !== 0) return false;

  // Sort by type then value
  const typeOrder = ['wan', 'tiao', 'tong', 'feng', 'jian'] as const;
  const sorted = [...hand].sort((a, b) => {
    const td = typeOrder.indexOf(a.type as typeof typeOrder[number]) - typeOrder.indexOf(b.type as typeof typeOrder[number]);
    if (td !== 0) return td;
    return a.value - b.value;
  });

  const first = sorted[0];
  const { type, value } = first;

  // Try triplet (刻子)
  const sameCount = sorted.filter(t => t.type === type && t.value === value).length;
  if (sameCount >= 3) {
    let remain = [...sorted];
    let removed = 0;
    remain = remain.filter(t => {
      if (removed < 3 && t.type === type && t.value === value) {
        removed++;
        return false;
      }
      return true;
    });
    if (canFormMelds(remain)) return true;
  }

  // Try sequence (顺子) — only wan/tiao/tong
  if (type === 'wan' || type === 'tiao' || type === 'tong') {
    const v = value;
    if (v <= 7) {
      const hasV1 = sorted.some(t => t.type === type && t.value === v + 1);
      const hasV2 = sorted.some(t => t.type === type && t.value === v + 2);
      if (hasV1 && hasV2) {
        let remain = [...sorted];
        // Remove the three sequence tiles
        const toRemove: number[] = [];
        for (let k = 0; k < remain.length; k++) {
          if (remain[k].type === type && remain[k].value === v && toRemove.length < 1) {
            toRemove.push(k);
          }
        }
        for (let k = 0; k < remain.length; k++) {
          if (remain[k].type === type && remain[k].value === v + 1 && toRemove.length < 2) {
            toRemove.push(k);
          }
        }
        for (let k = 0; k < remain.length; k++) {
          if (remain[k].type === type && remain[k].value === v + 2 && toRemove.length < 3) {
            toRemove.push(k);
          }
        }
        if (toRemove.length === 3) {
          toRemove.sort((a, b) => b - a);
          for (const idx of toRemove) {
            remain.splice(idx, 1);
          }
          if (canFormMelds(remain)) return true;
        }
      }
    }
  }

  return false;
}

/** 含鬼牌的胡牌判定 */
function canHuWithGhost(normalHand: Tile[], ghostCount: number): boolean {
  return tryGhostSubstitution(normalHand, ghostCount);
}

function tryGhostSubstitution(hand: Tile[], ghosts: number): boolean {
  if (ghosts === 0) return canHuStandard(hand);

  // Try all possible tile values that hand already has or is adjacent to
  const candidateValues = new Set<number>();
  for (const t of hand) {
    candidateValues.add(t.value);
    if (t.value > 1) candidateValues.add(t.value - 1);
    if (t.value < 9) candidateValues.add(t.value + 1);
  }
  if (candidateValues.size === 0) {
    for (let v = 1; v <= 9; v++) candidateValues.add(v);
  }

  const candidateTypes: TileType[] = [];
  for (const t of hand) {
    if (!candidateTypes.includes(t.type)) candidateTypes.push(t.type);
  }
  if (candidateTypes.length === 0) {
    candidateTypes.push('wan');
  }

  for (const type of candidateTypes) {
    const maxVal = type === 'feng' ? 4 : type === 'jian' ? 3 : 9;
    for (const v of candidateValues) {
      if (v > maxVal) continue;
      const newTile: Tile = { type, value: v, id: -1 };
      if (tryGhostSubstitution([...hand, newTile], ghosts - 1)) {
        return true;
      }
    }
  }

  return false;
}

/** 检查当前手牌是否可以自摸胡 */
export function isSelfHu(
  hand: Tile[],
  ghostType: TileType,
  ghostValue: number,
): boolean {
  return canHu(hand, ghostType, ghostValue);
}

/** 获取自摸信息 */
export function getHuInfo(
  hand: Tile[],
  ghostType: TileType,
  ghostValue: number,
): { canHu: boolean } {
  return { canHu: isSelfHu(hand, ghostType, ghostValue) };
}
