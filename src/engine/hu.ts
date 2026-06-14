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

// ============ 副露分解（番型计分用） ============

/** 顺子或刻子（已解析花色） */
export interface ResolvedMeld {
  kind: 'sequence' | 'triplet';
  suit: TileType;
  isHonor: boolean;
}

/** 一组完整分解：将 + 副露；isSevenPairs=true 时为七对子结构 */
export interface Decomposition {
  isSevenPairs: boolean;
  pairSuit: TileType;
  pairIsHonor: boolean;
  melds: ResolvedMeld[];
}

const DECOMP_TYPE_ORDER: TileType[] = ['wan', 'tiao', 'tong', 'feng', 'jian'];

function isHonorType(type: TileType): boolean {
  return type === 'feng' || type === 'jian';
}

function isNumberSuitType(type: TileType): boolean {
  return type === 'wan' || type === 'tiao' || type === 'tong';
}

function sortTiles(hand: Tile[]): Tile[] {
  return [...hand].sort((a, b) => {
    const d = DECOMP_TYPE_ORDER.indexOf(a.type) - DECOMP_TYPE_ORDER.indexOf(b.type);
    return d !== 0 ? d : a.value - b.value;
  });
}

function removeN(hand: Tile[], type: TileType, value: number, n: number): Tile[] {
  let removed = 0;
  return hand.filter(t => {
    if (removed < n && t.type === type && t.value === value) {
      removed++;
      return false;
    }
    return true;
  });
}

function removeSequence(hand: Tile[], type: TileType, value: number): Tile[] | null {
  const result = [...hand];
  for (const v of [value, value + 1, value + 2]) {
    const idx = result.findIndex(t => t.type === type && t.value === v);
    if (idx === -1) return null;
    result.splice(idx, 1);
  }
  return result;
}

/** 把无鬼牌的具体手牌拆成所有"刻子/顺子"组合 */
function formMeldsAll(hand: Tile[]): ResolvedMeld[][] {
  const results: ResolvedMeld[][] = [];
  if (hand.length === 0) {
    results.push([]);
    return results;
  }
  const sorted = sortTiles(hand);
  const { type, value } = sorted[0];

  const sameCount = sorted.filter(t => t.type === type && t.value === value).length;
  if (sameCount >= 3) {
    const remain = removeN(sorted, type, value, 3);
    for (const rest of formMeldsAll(remain)) {
      results.push([{ kind: 'triplet', suit: type, isHonor: isHonorType(type) }, ...rest]);
    }
  }
  if (isNumberSuitType(type) && value <= 7) {
    const remain = removeSequence(sorted, type, value);
    if (remain) {
      for (const rest of formMeldsAll(remain)) {
        results.push([{ kind: 'sequence', suit: type, isHonor: false }, ...rest]);
      }
    }
  }
  return results;
}

function meldsKey(melds: ResolvedMeld[]): string {
  return melds.map(m => `${m.kind === 'triplet' ? 'T' : 'S'}${m.suit}`).sort().join(',');
}

/** 把无鬼牌具体手牌拆成所有"将 + 副露"组合 */
function decomposeConcrete(hand: Tile[]): Decomposition[] {
  const results: Decomposition[] = [];
  const sorted = sortTiles(hand);
  const n = sorted.length;
  if (n < 2 || n % 3 !== 2) return results;

  const seen = new Set<string>();
  const triedPairs = new Set<string>();
  for (let i = 0; i < n; i++) {
    const t = sorted[i];
    const key = `${t.type}-${t.value}`;
    if (triedPairs.has(key)) continue;
    if (sorted.filter(x => x.type === t.type && x.value === t.value).length < 2) continue;
    triedPairs.add(key);

    const remain = removeN(sorted, t.type, t.value, 2);
    for (const meldSet of formMeldsAll(remain)) {
      const decomp: Decomposition = {
        isSevenPairs: false,
        pairSuit: t.type,
        pairIsHonor: isHonorType(t.type),
        melds: meldSet,
      };
      const dk = `${decomp.pairSuit}${decomp.pairIsHonor ? 'h' : ''}|${meldsKey(decomp.melds)}`;
      if (!seen.has(dk)) {
        seen.add(dk);
        results.push(decomp);
      }
    }
  }
  return results;
}

function concreteKey(hand: Tile[]): string {
  return sortTiles(hand).map(t => `${t.type}${t.value}`).join(',');
}

/** 枚举鬼牌的所有替代，返回去重后的具体手牌（normalHand + 已替代的鬼牌） */
function enumerateGhostSubstitutions(normalHand: Tile[], ghosts: number): Tile[][] {
  if (ghosts === 0) return [normalHand];

  const candidateValues = new Set<number>();
  for (const t of normalHand) {
    candidateValues.add(t.value);
    if (t.value > 1) candidateValues.add(t.value - 1);
    if (t.value < 9) candidateValues.add(t.value + 1);
  }
  if (candidateValues.size === 0) {
    for (let v = 1; v <= 9; v++) candidateValues.add(v);
  }

  const candidateTypes: TileType[] = [];
  for (const t of normalHand) {
    if (!candidateTypes.includes(t.type)) candidateTypes.push(t.type);
  }
  if (candidateTypes.length === 0) candidateTypes.push('wan');

  const results: Tile[][] = [];
  const seen = new Set<string>();
  function recurse(current: Tile[], remaining: number): void {
    if (remaining === 0) {
      const key = concreteKey(current);
      if (!seen.has(key)) {
        seen.add(key);
        results.push([...current]);
      }
      return;
    }
    for (const type of candidateTypes) {
      const maxVal = type === 'feng' ? 4 : type === 'jian' ? 3 : 9;
      for (const v of candidateValues) {
        if (v > maxVal) continue;
        current.push({ type, value: v, id: -1 });
        recurse(current, remaining - 1);
        current.pop();
      }
    }
  }
  recurse([...normalHand], ghosts);
  return results;
}

/** 是否可成七对（含鬼牌替代） */
function canFormSevenPairs(normalHand: Tile[], ghostCount: number): boolean {
  for (const concrete of enumerateGhostSubstitutions(normalHand, ghostCount)) {
    if (canHuSevenPairs(concrete)) return true;
  }
  return false;
}

/**
 * 把可胡手牌拆成所有合法分解（含七对、含鬼牌替代），用于番型计分。
 * concealed 长度由调用方保证为 3*(4-meldCount)+2；meldCount 仅作语义记录。
 */
export function decomposeHand(
  hand: Tile[],
  ghostType: TileType | null,
  ghostValue: number | null,
  _meldCount: number,
): Decomposition[] {
  const ghostCount = ghostType !== null && ghostValue !== null
    ? hand.filter(t => t.type === ghostType && t.value === ghostValue).length
    : 0;
  const normalHand = ghostCount > 0
    ? hand.filter(t => !(t.type === ghostType && t.value === ghostValue))
    : [...hand];

  const results: Decomposition[] = [];
  const seen = new Set<string>();

  for (const concrete of enumerateGhostSubstitutions(normalHand, ghostCount)) {
    for (const decomp of decomposeConcrete(concrete)) {
      const dk = `${decomp.pairSuit}${decomp.pairIsHonor ? 'h' : ''}|${meldsKey(decomp.melds)}`;
      if (!seen.has(dk)) {
        seen.add(dk);
        results.push(decomp);
      }
    }
  }

  if (hand.length === 14 && canFormSevenPairs(normalHand, ghostCount)) {
    if (!seen.has('__sevenpairs__')) {
      seen.add('__sevenpairs__');
      results.push({ isSevenPairs: true, pairSuit: 'wan', pairIsHonor: false, melds: [] });
    }
  }

  return results;
}
