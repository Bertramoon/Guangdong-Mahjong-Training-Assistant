import { onMounted, onUnmounted, ref, type Ref } from 'vue';

/** 响应式媒体查询：返回随视口变化更新的布尔 ref */
export function useMediaQuery(query: string): Ref<boolean> {
  const matches = ref(false);
  let mql: MediaQueryList | null = null;

  const update = (event: MediaQueryList | MediaQueryListEvent) => {
    matches.value = event.matches;
  };

  onMounted(() => {
    mql = window.matchMedia(query);
    update(mql);
    mql.addEventListener('change', update);
  });

  onUnmounted(() => {
    mql?.removeEventListener('change', update);
    mql = null;
  });

  return matches;
}
