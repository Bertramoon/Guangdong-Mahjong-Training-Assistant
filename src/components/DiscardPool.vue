<template>
  <div class="discard-pool">
    <div class="discard-title">弃牌池</div>
    <div class="discard-grid">
      <TileComponent
        v-for="entry in discardEntries"
        :key="'d' + entry.tile.id"
        :tile="entry.tile"
        :highlighted="matchedTileIds.includes(entry.tile.id)"
        :enlarged="matchedTileIds.includes(entry.tile.id)"
        :player-wind="entry.playerIndex"
      />
    </div>
    <template v-if="wallTiles && wallTiles.length > 0">
      <div class="discard-title wall-title">剩余牌墙</div>
      <div class="discard-grid wall-grid">
        <TileComponent
          v-for="(tile, i) in wallTiles"
          :key="'w' + i"
          :tile="tile"
          :semi-transparent="true"
          :ghost-type="ghostType"
          :ghost-value="ghostValue"
          :player-wind="wallTilePlayer(i)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Tile, TileType, DiscardEntry } from '../engine/types';
import TileComponent from './TileComponent.vue';

const props = defineProps<{
  discardEntries: DiscardEntry[];
  matchedTileIds: number[];
  wallTiles?: Tile[];
  currentPlayer: number;
  ghostType?: TileType;
  ghostValue?: number;
}>();

function wallTilePlayer(index: number): number {
  const offsets = [0, 3, 2, 1];
  return (props.currentPlayer + offsets[index % 4]) % 4;
}
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
  min-width: 280px;
  justify-content: center;
}
.discard-grid :deep(.tile) {
  width: 32px;
  height: 42px;
  font-size: 10px;
}
.wall-title {
  color: #aaa;
  margin-top: 4px;
}
.wall-grid :deep(.tile) {
  width: 32px;
  height: 42px;
  font-size: 10px;
}
</style>
