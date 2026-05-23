<template>
  <div
    class="tile"
    :class="{
      'tile--selected': selected,
      'tile--back': faceDown,
      'tile--ghost': isGhost,
      'tile--highlighted': highlighted,
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
  ghostType?: TileType;
  ghostValue?: number;
}>(), {
  selected: false,
  faceDown: false,
  highlighted: false,
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
  width: 48px;
  height: 64px;
  border-radius: 6px;
  border: 1px solid #999;
  background: #fffef5;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  transition: transform 0.15s, box-shadow 0.15s;
  flex-shrink: 0;
  overflow: hidden;
}
.tile:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}
.tile--selected {
  transform: translateY(-12px);
  box-shadow: 0 4px 12px rgba(0,100,200,0.4);
  border-color: #0066cc;
}
.tile--back {
  background: #1a5276;
  color: #fff;
  cursor: default;
  border-color: #0d3b5e;
}
.tile--ghost {
  background: #ffe8e8;
  border-color: #ff4444;
}
.tile--highlighted {
  border: 2px solid #ffd700;
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
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
