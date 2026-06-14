<template>
  <div class="discard-advisor glass-panel" v-if="evaluations.length > 0">
    <div class="advisor-header">
      <span class="advisor-title">出牌建议</span>
      <span class="advisor-shanten">向听数: {{ currentShanten }}</span>
    </div>
    <div class="advisor-list">
      <div
        v-for="(ev, i) in evaluations"
        :key="i"
        class="advisor-item"
        :class="{ best: i === 0 }"
      >
        <span class="advisor-rank">{{ i + 1 }}</span>
        <span class="advisor-tile">{{ tileName(ev.discardTile) }}</span>
        <span class="advisor-shanten-val">{{ ev.shanten }}向听</span>
        <span class="advisor-acceptance">{{ ev.acceptanceCount }}进账</span>
        <div v-if="ev.waitingTiles.length > 0" class="advisor-waiting">
          听: {{ ev.waitingTiles.map(w => tileName({ type: w.type, value: w.value, id: -1 })).join(' ') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DiscardEvaluation } from '../engine/advisor';
import { getTileName } from '../engine/tile';
import type { Tile } from '../engine/types';

defineProps<{
  evaluations: DiscardEvaluation[];
  currentShanten: number;
}>();

function tileName(t: Tile): string {
  return getTileName(t);
}
</script>

<style scoped>
.discard-advisor {
  padding: var(--space-3) var(--space-4);
  width: 100%;
  max-width: 500px;
  color: var(--color-text-inverse);
  font-size: var(--font-sm);
}

.advisor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.advisor-title {
  font-weight: 700;
  font-size: var(--font-md);
}

.advisor-shanten {
  color: var(--color-gold);
}

.advisor-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.advisor-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  flex-wrap: wrap;
}

.advisor-item.best {
  background: rgba(255, 215, 0, 0.14);
  border: 1px solid rgba(255, 215, 0, 0.35);
}

.advisor-rank {
  width: 20px;
  text-align: center;
  color: var(--color-text-muted);
}

.advisor-item.best .advisor-rank {
  color: var(--color-gold);
}

.advisor-tile {
  font-weight: 700;
  min-width: 40px;
}

.advisor-shanten-val {
  color: var(--color-text-muted);
}

.advisor-acceptance {
  color: var(--color-success);
}

.advisor-waiting {
  color: var(--color-info);
  font-size: var(--font-xs);
  width: 100%;
  padding-left: 28px;
}
</style>
