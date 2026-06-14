// 常驻 Web Worker：在独立线程执行向听数/出牌建议的重计算，避免阻塞 UI 主线程。
// 启动时从 IndexedDB 加载向听花色缓存到本 worker 的模块级 Map，
// 随后按「带 id 的请求-响应」协议处理 discardRecommendation / reactionAnalysis 请求。

import { loadFromIndexedDB, CURRENT_CACHE_VERSION } from './shanten-cache';
import { loadSuitCache } from './shanten';
import { getDiscardRecommendation, getReactionAnalysis } from './advisor';

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;

  if (msg.type === 'init') {
    try {
      const stored = await loadFromIndexedDB();
      if (stored && stored.version === CURRENT_CACHE_VERSION && stored.entries.length > 0) {
        loadSuitCache(stored.entries);
      }
    } catch {
      // 缓存加载失败时，后续计算在 worker 线程内回退到递归搜索（仍不阻塞 UI）
    }
    self.postMessage({ type: 'ready' });
    return;
  }

  if (msg.type === 'discardRecommendation') {
    try {
      const result = getDiscardRecommendation(msg.hand, msg.ghostType, msg.ghostValue, msg.meldCount);
      self.postMessage({ type: 'result', id: msg.id, result });
    } catch (err) {
      self.postMessage({ type: 'result', id: msg.id, error: String(err) });
    }
    return;
  }

  if (msg.type === 'reactionAnalysis') {
    try {
      const result = getReactionAnalysis(msg.hand, msg.tile, msg.ghostType, msg.ghostValue, msg.meldCount, msg.options);
      self.postMessage({ type: 'result', id: msg.id, result });
    } catch (err) {
      self.postMessage({ type: 'result', id: msg.id, error: String(err) });
    }
    return;
  }
};
