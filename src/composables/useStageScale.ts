import { onMounted, onUnmounted, ref, type Ref } from 'vue';

export const STAGE_DESIGN_W = 904;
export const STAGE_DESIGN_H = 407;
const MAX_SCALE = 1.15;

/** 纯函数：给定视口与舞台开关，计算舞台缩放系数（非紧凑档恒为 1） */
export function computeStageScale(innerW: number, innerH: number, active: boolean): number {
  if (!active) return 1;
  return Math.min(innerW / STAGE_DESIGN_W, innerH / STAGE_DESIGN_H, MAX_SCALE);
}

/** 紧凑档舞台缩放：返回缩放系数 ref 与是否启用 */
export function useStageScale(query: string): { scale: Ref<number>; active: Ref<boolean> } {
  const scale = ref(1);
  const active = ref(false);
  let mql: MediaQueryList | null = null;

  const update = () => {
    active.value = mql?.matches ?? false;
    scale.value = computeStageScale(window.innerWidth, window.innerHeight, active.value);
  };

  onMounted(() => {
    mql = window.matchMedia(query);
    mql.addEventListener('change', update);
    window.addEventListener('resize', update);
    update();
  });
  onUnmounted(() => {
    mql?.removeEventListener('change', update);
    window.removeEventListener('resize', update);
    mql = null;
  });

  return { scale, active };
}
