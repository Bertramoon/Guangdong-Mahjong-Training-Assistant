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
}
.hand-label {
  font-size: var(--font-md);
  color: var(--color-text-muted);
}
.hand-tiles {
  display: flex;
  gap: 2px;
  padding: var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: var(--radius-md);
  min-height: 80px;
  align-items: center;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.25);
}
@media (max-width: 720px) {
  .hand-tiles {
    --tile-w: 40px;
    --tile-h: 54px;
  }
}
</style>
