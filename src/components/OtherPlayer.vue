<template>
  <div class="other-player">
    <div class="other-name">
      {{ name }}
      <span class="tenpai-badge" v-if="tenpai">听</span>
    </div>
    <div class="other-melds">
      <MeldArea :melds="melds" :matched-tile-ids="matchedTileIds" :ghost-type="ghostType" :ghost-value="ghostValue" :direction="meldDirection" />
    </div>
    <div class="other-hand">
      <template v-if="handTiles && handTiles.length > 0">
        <TileComponent v-for="tile in handTiles" :key="tile.id" :tile="tile" :ghost-type="ghostType" :ghost-value="ghostValue" />
      </template>
      <template v-else>
        <TileComponent v-for="i in handCount" :key="i" :tile="null" :face-down="true" />
      </template>
    </div>
    <div class="other-discards" v-if="discards.length > 0">
      <TileComponent v-for="(tile, i) in discards.slice(-6)" :key="i" :tile="tile" :highlighted="matchedTileIds.includes(tile.id)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Tile, Meld, TileType } from '../engine/types';
import TileComponent from './TileComponent.vue';
import MeldArea from './MeldArea.vue';

const props = defineProps<{
  name: string;
  position: 'left' | 'right' | 'top';
  handCount: number;
  handTiles?: Tile[];
  melds: Meld[];
  discards: Tile[];
  matchedTileIds: number[];
  ghostType: TileType;
  ghostValue: number;
  tenpai?: boolean;
}>();

const meldDirection = computed(() =>
  props.position === 'left' || props.position === 'right' ? 'column' : 'row'
);
</script>

<style scoped>
.other-player {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.other-name { font-size: var(--font-sm); color: var(--color-text-muted); display: flex; align-items: center; justify-content: center; gap: 4px; }
.tenpai-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 4px;
  font-size: var(--font-sm);
  font-weight: 400;
  line-height: 1.2;
  color: var(--color-danger);
  background: var(--color-info);
  border-radius: var(--radius-sm);
}
.other-hand { display: flex; gap: 1px; }
.other-hand :deep(.tile) { --tile-w: 28px; --tile-h: 38px; --tile-shadow: var(--shadow-tile-mini); font-size: 10px; }
.other-discards { display: flex; gap: 1px; }
.other-discards :deep(.tile) { --tile-w: 24px; --tile-h: 32px; --tile-shadow: var(--shadow-tile-mini); font-size: 8px; }
.other-melds { opacity: 0.85; }
</style>
