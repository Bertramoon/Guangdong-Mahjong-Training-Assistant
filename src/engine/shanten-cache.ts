import type { SuitResult } from './shanten';

export const CURRENT_CACHE_VERSION = 1;
const DB_NAME = 'mahjong_shanten_cache';
const STORE_NAME = 'suit_cache';

/**
 * 递归生成所有满足条件的 count 数组：
 * - 每个位置 0-4
 * - 所有位置总和 ≤ maxTotal
 */
export function enumerateCounts(length: number, maxTotal: number): number[][] {
  const results: number[][] = [];

  function generate(pos: number, total: number, current: number[]): void {
    if (pos === length) {
      results.push([...current]);
      return;
    }
    for (let v = 0; v <= 4 && total + v <= maxTotal; v++) {
      current.push(v);
      generate(pos + 1, total + v, current);
      current.pop();
    }
  }

  generate(0, 0, []);
  return results;
}

/** 将 count 数组编码为缓存 key */
export function encodeSuitKey(counts: number[], isNumber: boolean): string {
  return `${isNumber ? 'N' : 'H'}:${counts.join(',')}`;
}
