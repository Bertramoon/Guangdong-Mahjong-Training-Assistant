<template>
  <div class="discard-pool">
    <div class="discard-title">弃牌池</div>
    <div ref="gridWrapRef" class="discard-grid-wrap">
      <TransitionGroup name="drop" tag="div" class="discard-grid" :style="gridStyle">
        <TileComponent
          v-for="entry in discardEntries"
          :key="'d' + entry.tile.id"
          :tile="entry.tile"
          :highlighted="matchedTileIds.includes(entry.tile.id) || isSameTileHovered(entry.tile)"
          :enlarged="matchedTileIds.includes(entry.tile.id) || isSameTileHovered(entry.tile)"
          :player-wind="entry.playerIndex"
          @mouseenter="hoveredTileKey = tileKey(entry.tile)"
          @mouseleave="hoveredTileKey = null"
        />
      </TransitionGroup>
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
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import type { Tile, TileType, DiscardEntry } from '../engine/types';
import TileComponent from './TileComponent.vue';
import { useMediaQuery } from '../composables/useMediaQuery';

const props = defineProps<{
  discardEntries: DiscardEntry[];
  matchedTileIds: number[];
  wallTiles?: Tile[];
  currentPlayer: number;
  ghostType?: TileType;
  ghostValue?: number;
}>();

const hoveredTileKey = ref<string | null>(null);

function tileKey(tile: Tile): string {
  return `${tile.type}-${tile.value}`;
}

function isSameTileHovered(tile: Tile): boolean {
  return hoveredTileKey.value !== null && tileKey(tile) === hoveredTileKey.value;
}

function wallTilePlayer(index: number): number {
  const offsets = [0, 3, 2, 1];
  return (props.currentPlayer + offsets[index % 4]) % 4;
}

const compact = useMediaQuery('(orientation: landscape) and (max-height: 560px)');

const gridWrapRef = ref<HTMLElement | null>(null);
const gridScale = ref(1);

const MIN_SCALE = 0.4;

function gridElement(): HTMLElement | null {
  return gridWrapRef.value?.querySelector<HTMLElement>(':scope > .discard-grid') ?? null;
}

function applyFit(): void {
  if (!compact.value) {
    gridScale.value = 1;
    return;
  }
  const wrap = gridWrapRef.value;
  const grid = gridElement();
  if (!wrap || !grid) return;
  const boxW = wrap.clientWidth;
  const boxH = wrap.clientHeight;
  const gridW = grid.offsetWidth;
  const gridH = grid.offsetHeight;
  if (!boxW || !boxH || !gridW || !gridH) return;
  const raw = Math.min(1, boxW / gridW, boxH / gridH);
  gridScale.value = Math.max(MIN_SCALE, raw);
}

const gridStyle = computed(() => {
  if (!compact.value || gridScale.value >= 1) return undefined;
  return { transform: `scale(${gridScale.value})` };
});

let wrapObserver: ResizeObserver | null = null;
let gridObserver: ResizeObserver | null = null;

function startFitObservers(): void {
  if (typeof ResizeObserver === 'undefined') return;
  wrapObserver = new ResizeObserver(() => applyFit());
  gridObserver = new ResizeObserver(() => applyFit());
  if (gridWrapRef.value) wrapObserver.observe(gridWrapRef.value);
  const grid = gridElement();
  if (grid) gridObserver.observe(grid);
}

function stopFitObservers(): void {
  wrapObserver?.disconnect();
  wrapObserver = null;
  gridObserver?.disconnect();
  gridObserver = null;
}

onMounted(() => {
  startFitObservers();
  nextTick(applyFit);
});

onUnmounted(stopFitObservers);

watch(compact, (active) => {
  if (!active) gridScale.value = 1;
  nextTick(applyFit);
});

watch(() => props.discardEntries, () => {
  nextTick(applyFit);
});
</script>

<style scoped>
.discard-pool {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.discard-title { font-size: var(--font-xs); color: var(--color-text-muted); }
.discard-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  min-width: 0;
  justify-content: center;
}
.discard-grid :deep(.tile) {
  --tile-w: 32px;
  --tile-h: 42px;
  --tile-shadow: var(--shadow-tile-mini);
  font-size: 10px;
}
.wall-title {
  color: var(--color-text-muted);
  margin-top: var(--space-1);
}
.wall-grid :deep(.tile) {
  --tile-w: 32px;
  --tile-h: 42px;
  --tile-shadow: var(--shadow-tile-mini);
  font-size: 10px;
}

@media (orientation: landscape) and (max-height: 560px) {
  .discard-pool { gap: 2px; min-height: 0; overflow: hidden; }
  .discard-title { font-size: 10px; }
  .discard-grid-wrap {
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .discard-grid { gap: 1px; transform-origin: center; }
  .discard-grid :deep(.tile) { --tile-w: 20px; --tile-h: 27px; font-size: 7px; border-radius: 3px; }
  .wall-title { margin-top: 2px; }
  .wall-grid { gap: 1px; min-height: 0; overflow: hidden; }
  .wall-grid :deep(.tile) { --tile-w: 20px; --tile-h: 27px; font-size: 7px; border-radius: 3px; }
}
</style>
