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
    <template v-if="!faceDown && tile">
      <!-- Honor tiles: single character -->
      <template v-if="tile.type === 'feng' || tile.type === 'jian'">
        <span class="tile__honor" :class="`tile--${tile.type}-${tile.value}`">{{ honorChar }}</span>
      </template>
      <!-- Number tiles: two-line display -->
      <template v-else>
        <span class="tile__num" :class="`tile--${tile.type}`">{{ numChar }}</span>
        <span class="tile__suit" :class="`tile--${tile.type}`">{{ suitChar }}</span>
      </template>
    </template>
    <span v-else class="tile__back">&#x1F02B;</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Tile, TileType } from '../engine/types';

const NUM_CHARS: Record<number, string> = {
  1: '一', 2: '二', 3: '三', 4: '四', 5: '五',
  6: '六', 7: '七', 8: '八', 9: '九',
};

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

const numChar = computed(() => {
  if (!props.tile) return '';
  return NUM_CHARS[props.tile.value] ?? '';
});

const suitChar = computed(() => {
  if (!props.tile) return '';
  switch (props.tile.type) {
    case 'wan': return '万';
    case 'tiao': return '条';
    case 'tong': return '筒';
    default: return '';
  }
});

const honorChar = computed(() => {
  if (!props.tile) return '';
  switch (props.tile.type) {
    case 'feng':
      return ['东', '南', '西', '北'][props.tile.value - 1];
    case 'jian':
      return ['中', '发', '白'][props.tile.value - 1];
    default: return '';
  }
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  cursor: pointer;
  user-select: none;
  transition: transform 0.15s, box-shadow 0.15s;
  flex-shrink: 0;
  padding: 4px 2px;
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

/* Number tiles */
.tile__num {
  font-size: 18px;
  font-weight: bold;
  line-height: 1;
}
.tile__suit {
  font-size: 10px;
  font-weight: bold;
  line-height: 1;
}
.tile--wan { color: #cc0000; }
.tile--tiao { color: #008800; }
.tile--tong { color: #0044cc; }

/* Honor tiles */
.tile__honor {
  font-size: 20px;
  font-weight: bold;
  line-height: 1;
}
/* Wind tiles */
.tile--feng-1, .tile--feng-2, .tile--feng-3, .tile--feng-4 { color: #333; }
/* Dragon tiles */
.tile--jian-1 { color: #cc0000; }  /* 中 red */
.tile--jian-2 { color: #008800; }  /* 发 green */
.tile--jian-3 {                    /* 白 outlined */
  color: transparent;
  -webkit-text-stroke: 1px #666;
  text-stroke: 1px #666;
}

.tile__back {
  font-size: 20px;
}
</style>
