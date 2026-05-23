<template>
  <div class="other-player">
    <div class="other-name">{{ name }}</div>
    <div class="other-melds">
      <MeldArea :melds="melds" :ghost-type="ghostType" :ghost-value="ghostValue" />
    </div>
    <div class="other-hand">
      <TileComponent v-for="i in handCount" :key="i" :tile="null" :face-down="true" />
    </div>
    <div class="other-discards" v-if="discards.length > 0">
      <TileComponent v-for="(tile, i) in discards.slice(-6)" :key="i" :tile="tile" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Tile, Meld, TileType } from '../engine/types';
import TileComponent from './TileComponent.vue';
import MeldArea from './MeldArea.vue';

defineProps<{
  name: string;
  handCount: number;
  melds: Meld[];
  discards: Tile[];
  ghostType: TileType;
  ghostValue: number;
}>();
</script>

<style scoped>
.other-player {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.other-name { font-size: 13px; color: #ccc; }
.other-hand { display: flex; gap: 1px; }
.other-hand :deep(.tile) { width: 28px; height: 38px; font-size: 10px; }
.other-discards { display: flex; gap: 1px; }
.other-discards :deep(.tile) { width: 24px; height: 32px; font-size: 8px; }
.other-melds { opacity: 0.85; }
</style>
