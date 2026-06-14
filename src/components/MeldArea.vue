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
  gap: var(--space-3);
  padding: var(--space-1) var(--space-2);
}
.meld-area.column {
  flex-direction: column;
  gap: var(--space-2);
}
.meld-group {
  display: flex;
  gap: 2px;
  align-items: flex-end;
  padding: var(--space-1) var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: var(--radius-sm);
}
.meld-type-label {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  margin-left: var(--space-1);
  align-self: center;
}
</style>
