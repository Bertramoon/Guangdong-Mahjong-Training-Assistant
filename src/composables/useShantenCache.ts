// src/composables/useShantenCache.ts
import { ref } from 'vue';
import { ensureCache, refreshCache } from '../engine/shanten-cache';
import { getSuitCacheSize } from '../engine/shanten';

export type CacheStatus = 'idle' | 'loading' | 'ready' | 'none';

const cacheStatus = ref<CacheStatus>('idle');
const cacheCount = ref(0);

export function useShantenCache() {
  async function loadCache(): Promise<void> {
    if (cacheStatus.value === 'loading') return;
    cacheStatus.value = 'loading';
    try {
      const count = await ensureCache((n) => { cacheCount.value = n; });
      cacheCount.value = count;
      cacheStatus.value = count > 0 ? 'ready' : 'none';
    } catch {
      cacheStatus.value = 'none';
    }
  }

  async function refresh(): Promise<void> {
    cacheStatus.value = 'loading';
    cacheCount.value = 0;
    try {
      const count = await refreshCache((n) => { cacheCount.value = n; });
      cacheCount.value = count;
      cacheStatus.value = count > 0 ? 'ready' : 'none';
    } catch {
      cacheStatus.value = 'none';
    }
  }

  return { cacheStatus, cacheCount, loadCache, refresh };
}
