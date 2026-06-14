// Web Worker: 在独立线程中执行向听数缓存预计算 + IndexedDB 写入
// 包含 suitMaxTaatsu 核心计算逻辑的独立副本，避免主线程阻塞

interface SuitResult {
  any: number[];
  withPair: number[];
}

const DB_NAME = 'mahjong_shanten_cache';
const STORE_NAME = 'suit_cache';
const CURRENT_CACHE_VERSION = 1;

function encodeSuitKey(counts: number[], isNumber: boolean): string {
  return `${isNumber ? 'N' : 'H'}:${counts.join(',')}`;
}

function enumerateCounts(length: number, maxTotal: number): number[][] {
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

function suitMaxTaatsuCore(counts: number[], isNumber: boolean): SuitResult {
  const totalTiles = counts.reduce((a, b) => a + b, 0);
  const maxM = Math.min(4, Math.floor(totalTiles / 3));
  const any = new Array(maxM + 1).fill(-1);
  const withPair = new Array(maxM + 1).fill(-1);
  const c = [...counts];

  function search(pos: number, m: number, t: number, hasPair: boolean): void {
    while (pos < c.length && c[pos] === 0) pos++;
    if (pos >= c.length) {
      if (m <= maxM) {
        any[m] = Math.max(any[m], t);
        if (hasPair) withPair[m] = Math.max(withPair[m], t);
      }
      return;
    }

    if (c[pos] >= 3) {
      c[pos] -= 3;
      search(pos, m + 1, t, hasPair);
      c[pos] += 3;
    }

    if (isNumber && pos + 2 < c.length && c[pos] >= 1 && c[pos + 1] >= 1 && c[pos + 2] >= 1) {
      c[pos]--; c[pos + 1]--; c[pos + 2]--;
      search(pos, m + 1, t, hasPair);
      c[pos]++; c[pos + 1]++; c[pos + 2]++;
    }

    if (c[pos] >= 2) {
      c[pos] -= 2;
      search(pos, m, t + 1, true);
      c[pos] += 2;
    }

    if (isNumber && pos + 1 < c.length && c[pos] >= 1 && c[pos + 1] >= 1) {
      c[pos]--; c[pos + 1]--;
      search(pos, m, t + 1, hasPair);
      c[pos]++; c[pos + 1]++;
    }

    if (isNumber && pos + 2 < c.length && c[pos] >= 1 && c[pos + 2] >= 1) {
      c[pos]--; c[pos + 2]--;
      search(pos, m, t + 1, hasPair);
      c[pos]++; c[pos + 2]++;
    }

    c[pos]--;
    search(pos, m, t, hasPair);
    c[pos]++;
  }

  search(0, 0, 0, false);
  return { any, withPair };
}

function openDB(): Promise<IDBDatabase> {
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

async function writeEntriesToDB(entries: [string, SuitResult][]): Promise<void> {
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

self.onmessage = async (e: MessageEvent) => {
  if (e.data.type === 'generate') {
    await generateAll();
  }
};

async function generateAll(): Promise<void> {
  const allConfigs = [
    ...enumerateCounts(9, 14).map(c => ({ counts: c, isNumber: true })),
    ...enumerateCounts(4, 14).map(c => ({ counts: c, isNumber: false })),
    ...enumerateCounts(3, 14).map(c => ({ counts: c, isNumber: false })),
  ];

  const BATCH_SIZE = 500;
  const allEntries: [string, SuitResult][] = [];

  for (let i = 0; i < allConfigs.length; i += BATCH_SIZE) {
    const batch = allConfigs.slice(i, i + BATCH_SIZE);
    const batchEntries: [string, SuitResult][] = [];
    for (const { counts, isNumber } of batch) {
      const key = encodeSuitKey(counts, isNumber);
      const result = suitMaxTaatsuCore(counts, isNumber);
      batchEntries.push([key, result]);
    }
    allEntries.push(...batchEntries);
    self.postMessage({
      type: 'batch',
      entries: batchEntries,
      progress: Math.min(i + BATCH_SIZE, allConfigs.length),
      total: allConfigs.length,
    });
  }

  // 在 Worker 线程写入 IndexedDB，不阻塞主线程
  await writeEntriesToDB(allEntries);

  self.postMessage({ type: 'done', totalEntries: allEntries.length });
}
