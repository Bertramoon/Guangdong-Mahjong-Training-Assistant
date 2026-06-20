import type { SuitResult } from './shanten';
import {
  clearSuitCache,
  loadSuitCache,
} from './shanten';

export const CURRENT_CACHE_VERSION = 2;
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

interface StoredCache {
  version: number;
  entries: [string, SuitResult][];
}

/**
 * 读取整份缓存（单条 blob，key='__cache__'）。一次性结构化克隆，避免逐条 getAll 的开销。
 * 版本不匹配或不存在时返回 null，由 ensureCache 触发重建。
 */
export async function loadFromIndexedDB(): Promise<StoredCache | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get('__cache__');
      tx.oncomplete = () => { db.close(); resolve((req.result as StoredCache) ?? null); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch {
    return null;
  }
}

/**
 * 廉价探测：持久化缓存是否存在且版本匹配（仅读极小的 '__version__' key，毫秒级）。
 * 供 UI 在页面挂载时立即判断是否可亮起按钮，无需等待整份 blob 载入。
 */
export async function hasCachedVersion(): Promise<boolean> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get('__version__');
      tx.oncomplete = () => { db.close(); resolve(req.result === CURRENT_CACHE_VERSION); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch {
    return false;
  }
}

// --- 预计算生成（Web Worker） ---

export async function generatePrecache(
  onProgress?: (count: number) => void,
): Promise<number> {
  clearSuitCache();

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./shanten-worker.ts', import.meta.url),
      { type: 'module' },
    );

    let lastReportTime = 0;

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;

      if (msg.type === 'batch') {
        loadSuitCache(msg.entries);
        // 节流：每 500ms 最多触发一次 Vue 响应式更新
        const now = Date.now();
        if (onProgress && now - lastReportTime >= 500) {
          lastReportTime = now;
          onProgress(msg.progress);
        }
      }

      if (msg.type === 'done') {
        worker.terminate();
        if (onProgress) onProgress(msg.totalEntries);
        resolve(msg.totalEntries);
      }
    };

    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(`缓存计算失败: ${e.message}`));
    };

    worker.postMessage({ type: 'generate' });
  });
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
