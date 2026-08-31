<template>
  <div class="player-hand">
    <div class="hand-label">{{ label }}</div>
    <TransitionGroup name="deal" tag="div" class="hand-tiles">
      <TileComponent
        v-for="tile in tiles"
        :key="tile.id"
        :tile="tile"
        :selected="selectedId === tile.id"
        :highlighted="highlightedTileIds.includes(tile.id)"
        :ghost-type="ghostType"
        :ghost-value="ghostValue"
        @click="$emit('select', $event)"
      />
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import type { Tile, TileType } from '../engine/types';
import TileComponent from './TileComponent.vue';

defineProps<{
  tiles: Tile[];
  label: string;
  selectedId: number | null;
  highlightedTileIds: number[];
  ghostType: TileType;
  ghostValue: number;
}>();

defineEmits<{
  select: [tile: Tile];
}>();
</script>

<style scoped>
.player-hand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  max-width: 100%;
}
.hand-label {
  font-size: var(--font-md);
  color: var(--color-text-muted);
}
.hand-tiles {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2px;
  padding: var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: var(--radius-md);
  min-height: 80px;
  align-items: center;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.25);
  max-width: 100%;
}
/* 抽屉布局吃掉右侧 280px 后，窄宽度逐级缩小手牌保证单行放下（紧凑块在其后覆盖） */
@media (max-width: 1080px) {
  .hand-tiles {
    --tile-w: 40px;
    --tile-h: 54px;
  }
}
@media (max-width: 960px) {
  .hand-tiles {
    --tile-w: 34px;
    --tile-h: 46px;
  }
}
@media (max-width: 876px) {
  .hand-tiles {
    --tile-w: 28px;
    --tile-h: 38px;
  }
}

@media (orientation: landscape) and (max-height: 520px) {
  .hand-tiles {
    --tile-w: 36px;
    --tile-h: 50px;
    min-height: 0;
    gap: 2px;
    padding: 3px;
  }
  .hand-label {
    display: none;
  }
}
</style>
