import type { SuitResult } from './shanten';
import {
  suitMaxTaatsu,
  getSuitCacheSize,
  getSuitCacheEntries,
  clearSuitCache,
  loadSuitCache,
} from './shanten';

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

// --- IndexedDB 操作 ---

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveToIndexedDB(entries: [string, SuitResult][]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.clear();
  store.put(CURRENT_CACHE_VERSION, '__version__');
  for (const [key, value] of entries) {
    store.put(value, key);
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function loadFromIndexedDB(): Promise<{
  entries: [string, SuitResult][];
  version: number | null;
} | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const getAll = store.getAll();
    const getAllKeys = store.getAllKeys();
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        const entries: [string, SuitResult][] = [];
        let version: number | null = null;
        for (let i = 0; i < getAllKeys.result.length; i++) {
          const key = getAllKeys.result[i] as string;
          if (key === '__version__') {
            version = getAll.result[i] as number;
          } else {
            entries.push([key, getAll.result[i] as SuitResult]);
          }
        }
        db.close();
        resolve({ entries, version });
      };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch {
    return null;
  }
}

// --- 预计算生成 ---

export async function generatePrecache(
  onProgress?: (count: number) => void,
): Promise<number> {
  const allConfigs = [
    ...enumerateCounts(9, 14).map(c => ({ counts: c, isNumber: true })),
    ...enumerateCounts(4, 14).map(c => ({ counts: c, isNumber: false })),
    ...enumerateCounts(3, 14).map(c => ({ counts: c, isNumber: false })),
  ];

  clearSuitCache();
  const BATCH_SIZE = 200;

  for (let i = 0; i < allConfigs.length; i += BATCH_SIZE) {
    const batch = allConfigs.slice(i, i + BATCH_SIZE);
    for (const { counts, isNumber } of batch) {
      suitMaxTaatsu(counts, isNumber);
    }
    onProgress?.(getSuitCacheSize());
    await new Promise(r => setTimeout(r, 0));
  }

  const entries = getSuitCacheEntries();
  await saveToIndexedDB(entries);
  return entries.length;
}

// --- 对外接口 ---

/** 确保缓存可用：从 IndexedDB 加载或触发预计算 */
export async function ensureCache(
  onProgress?: (count: number) => void,
): Promise<number> {
  const stored = await loadFromIndexedDB();
  if (stored && stored.version === CURRENT_CACHE_VERSION && stored.entries.length > 0) {
    loadSuitCache(stored.entries);
    return stored.entries.length;
  }
  return generatePrecache(onProgress);
}

/** 强制重新生成缓存 */
export async function refreshCache(
  onProgress?: (count: number) => void,
): Promise<number> {
  return generatePrecache(onProgress);
}
