<template>
  <div class="player-hand">
    <div class="hand-label">{{ label }}</div>
    <div class="hand-tiles">
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
    </div>
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
  gap: 8px;
}
.hand-label {
  font-size: 14px;
  color: #ccc;
}
.hand-tiles {
  display: flex;
  gap: 2px;
  padding: 8px;
  background: rgba(0,0,0,0.15);
  border-radius: 8px;
  min-height: 80px;
  align-items: center;
}
</style>
