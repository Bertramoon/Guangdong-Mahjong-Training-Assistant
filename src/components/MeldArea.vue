<template>
  <div class="meld-area" :class="{ column: direction === 'column' }" v-if="melds.length > 0">
    <div v-for="(meld, i) in melds" :key="i" class="meld-group">
      <TileComponent
        v-for="tile in meld.tiles"
        :key="tile.id"
        :tile="tile"
        :face-down="meld.type === 'an_gang' && tile === meld.tiles[0]"
        :highlighted="matchedTileIds.includes(tile.id)"
        :ghost-type="ghostType"
        :ghost-value="ghostValue"
      />
      <span class="meld-type-label">{{ typeLabel(meld.type) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Meld, TileType } from '../engine/types';
import TileComponent from './TileComponent.vue';

defineProps<{
  melds: Meld[];
  matchedTileIds: number[];
  ghostType: TileType;
  ghostValue: number;
  direction?: 'row' | 'column';
}>();

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    peng: '碰', ming_gang: '明杠', an_gang: '暗杠', jia_gang: '加杠',
  };
  return map[type] || type;
}
</script>

<style scoped>
.meld-area {
  display: flex;
  gap: 12px;
  padding: 4px 8px;
}
.meld-area.column {
  flex-direction: column;
  gap: 6px;
}
.meld-group {
  display: flex;
  gap: 2px;
  align-items: flex-end;
}
.meld-type-label {
  font-size: 11px;
  color: #999;
  margin-left: 4px;
}
</style>
