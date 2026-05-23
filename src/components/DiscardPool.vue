<template>
  <div class="discard-pool">
    <div class="discard-title">弃牌池</div>
    <div class="discard-grid">
      <TileComponent v-for="(tile, i) in tiles" :key="i" :tile="tile" :highlighted="matchedTileIds.includes(tile.id)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Tile } from '../engine/types';
import TileComponent from './TileComponent.vue';

defineProps<{ tiles: Tile[]; matchedTileIds: number[] }>();
</script>

<style scoped>
.discard-pool {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.discard-title { font-size: 12px; color: #999; }
.discard-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  max-width: 320px;
  justify-content: center;
}
.discard-grid :deep(.tile) {
  width: 32px;
  height: 42px;
  font-size: 10px;
}
</style>
