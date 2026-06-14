<template>
  <div
    class="tile"
    :class="{
      'tile--selected': selected,
      'tile--back': faceDown,
      'tile--ghost': isGhost,
      'tile--highlighted': highlighted,
      'tile--enlarged': enlarged,
      'tile--transparent': semiTransparent,
      'tile--wind-south': playerWind === 0,
      'tile--wind-west': playerWind === 1,
      'tile--wind-north': playerWind === 2,
      'tile--wind-east': playerWind === 3,
    }"
    @click="tile && $emit('click', tile)"
  >
    <div v-if="!faceDown && tile" class="tile__face" v-html="tileSvg"></div>
    <span v-else class="tile__back">&#x1F02B;</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Tile, TileType } from '../engine/types';
import { getTileSVG } from '../utils/tileGraphics';

const props = withDefaults(defineProps<{
  tile: Tile | null;
  selected?: boolean;
  faceDown?: boolean;
  highlighted?: boolean;
  enlarged?: boolean;
  semiTransparent?: boolean;
  playerWind?: number;
  ghostType?: TileType;
  ghostValue?: number;
}>(), {
  selected: false,
  faceDown: false,
  highlighted: false,
  enlarged: false,
  semiTransparent: false,
});

defineEmits<{
  click: [tile: Tile];
}>();

const tileSvg = computed(() => {
  if (!props.tile) return '';
  return getTileSVG(props.tile);
});

const isGhost = computed(() => {
  if (!props.tile || !props.ghostType) return false;
  return props.tile.type === props.ghostType && props.tile.value === props.ghostValue;
});
</script>

<style scoped>
.tile {
  position: relative;
  width: var(--tile-w, 48px);
  height: var(--tile-h, 64px);
  border-radius: var(--radius-tile);
  border: 1px solid var(--color-tile-edge);
  background: var(--color-tile-face);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
  overflow: hidden;
  /* 纵深 = 彩色环（风位/高亮，默认无） + 深度阴影（默认静止态） */
  box-shadow: var(--tile-ring, none), var(--tile-shadow, var(--shadow-tile-rest));
  transition:
    transform var(--dur-fast) var(--ease-spring),
    box-shadow var(--dur-fast) var(--ease-out);
}
.tile:hover {
  transform: translateY(-6px);
  --tile-shadow: var(--shadow-tile-hover);
  z-index: var(--z-tile-raised);
}
.tile--selected {
  transform: translateY(-14px);
  --tile-shadow: var(--shadow-tile-selected);
  z-index: var(--z-tile-raised);
}
.tile--back {
  background: linear-gradient(160deg, var(--color-tile-back) 0%, var(--color-tile-back-edge) 100%);
  color: #fff;
  cursor: default;
  border-color: var(--color-tile-back-edge);
}
.tile--ghost {
  background: var(--color-ghost-face);
  border-color: var(--color-ghost-edge);
}
.tile--transparent {
  opacity: 0.45;
}
/* 风位：用 ring 变量叠加彩色环，不占布局、不与纵深阴影冲突 */
.tile--wind-south { --tile-ring: 0 0 0 2px var(--color-wind-south); }
.tile--wind-west  { --tile-ring: 0 0 0 2px var(--color-wind-west); }
.tile--wind-north { --tile-ring: 0 0 0 2px var(--color-wind-north); }
.tile--wind-east  { --tile-ring: 0 0 0 2px var(--color-wind-east); }
.tile--highlighted {
  --tile-ring: 0 0 12px rgba(255, 215, 0, 0.45);
  outline: 2px solid rgba(255, 215, 0, 0.55);
  outline-offset: 1px;
  animation: highlightPulse 1.4s ease-in-out infinite;
}
.tile--enlarged {
  transform: scale(1.2);
  z-index: var(--z-tile-raised);
}
.tile__face {
  width: 100%;
  height: 100%;
  padding: 2px;
}
.tile__back {
  font-size: 20px;
}
</style>
