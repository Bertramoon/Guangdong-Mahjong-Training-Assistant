// 向听/出牌建议重计算的 RPC 客户端：优先用常驻 worker（非阻塞），
// worker 任何失败（创建/加载/执行/超时）都自动回退主线程计算，保证功能不丢失。
// 主线程兜底即原 getDiscardRecommendation/getReactionAnalysis（缓存命中即 O(1)）。

import type { DiscardRecommendation, ReactionAnalysis } from './advisor';
import type { Tile, TileType } from './types';
import { getDiscardRecommendation as mainDiscard, getReactionAnalysis as mainReaction } from './advisor';

interface ReactionOptions { peng: boolean; mingGang: boolean }

let worker: Worker | null = null;
let readyPromise: Promise<void> = Promise.resolve();
let failed = false;
let nextId = 0;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>();

/** 创建常驻 worker 并等待其加载向听缓存。幂等。worker 不可用时置 failed，调用方走主线程兜底。 */
export function initComputeWorker(): Promise<void> {
  if (worker || failed) return readyPromise;
  try {
    worker = new Worker(new URL('./compute-worker.ts', import.meta.url), { type: 'module' });
  } catch (err) {
    console.error('[向听worker] 创建失败，将使用主线程计算:', err);
    failed = true;
    return readyPromise;
  }
  readyPromise = new Promise<void>((resolve) => {
    let settled = false;
    const done = () => { if (!settled) { settled = true; resolve(); } };
    worker!.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === 'ready') {
        done();
      } else if (msg.type === 'result') {
        const p = pending.get(msg.id);
        if (p) {
          pending.delete(msg.id);
          if (msg.error) p.reject(new Error(msg.error));
          else p.resolve(msg.result);
        }
      }
    };
    worker!.onerror = (e: ErrorEvent) => {
      console.error('[向听worker] 加载/执行失败，将使用主线程计算:', e.message, e.filename, e.lineno);
      failed = true;
      for (const p of pending.values()) p.reject(new Error('compute worker error'));
      pending.clear();
      done();
    };
    worker!.postMessage({ type: 'init' });
    setTimeout(done, 10000);
  });
  return readyPromise;
}

async function rpc(type: string, payload: Record<string, unknown>): Promise<unknown> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (pending.delete(id)) reject(new Error(`rpc 超时 (${type})`));
    }, 5000);
    pending.set(id, {
      resolve: (v) => { clearTimeout(timer); resolve(v); },
      reject: (e) => { clearTimeout(timer); reject(e); },
    });
    worker!.postMessage({ type, id, ...payload });
  });
}

export async function discardRecommendation(
  hand: Tile[],
  ghostType: TileType,
  ghostValue: number,
  meldCount: number,
): Promise<DiscardRecommendation> {
  await readyPromise;
  if (failed) return mainDiscard(hand, ghostType, ghostValue, meldCount);
  try {
    return (await rpc('discardRecommendation', { hand, ghostType, ghostValue, meldCount })) as DiscardRecommendation;
  } catch (err) {
    failed = true;
    console.warn('[向听worker] 出牌建议计算失败，回退主线程:', err);
    return mainDiscard(hand, ghostType, ghostValue, meldCount);
  }
}

export async function reactionAnalysis(
  hand: Tile[],
  tile: Tile,
  ghostType: TileType,
  ghostValue: number,
  meldCount: number,
  options: ReactionOptions,
): Promise<ReactionAnalysis> {
  await readyPromise;
  if (failed) return mainReaction(hand, tile, ghostType, ghostValue, meldCount, options);
  try {
    return (await rpc('reactionAnalysis', { hand, tile, ghostType, ghostValue, meldCount, options })) as ReactionAnalysis;
  } catch (err) {
    failed = true;
    console.warn('[向听worker] 反应分析计算失败，回退主线程:', err);
    return mainReaction(hand, tile, ghostType, ghostValue, meldCount, options);
  }
}
