<template>
  <div class="discard-advisor" v-if="evaluations.length > 0">
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
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  padding: 12px 16px;
  width: 100%;
  max-width: 500px;
  color: #fff;
  font-size: 13px;
}

.advisor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.advisor-title {
  font-weight: bold;
  font-size: 15px;
}

.advisor-shanten {
  color: #ffd700;
}

.advisor-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.advisor-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  flex-wrap: wrap;
}

.advisor-item.best {
  background: rgba(255, 215, 0, 0.15);
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.advisor-rank {
  width: 20px;
  text-align: center;
  color: #999;
}

.advisor-item.best .advisor-rank {
  color: #ffd700;
}

.advisor-tile {
  font-weight: bold;
  min-width: 40px;
}

.advisor-shanten-val {
  color: #aaa;
}

.advisor-acceptance {
  color: #5f5;
}

.advisor-waiting {
  color: #9cf;
  font-size: 12px;
  width: 100%;
  padding-left: 28px;
}
</style>
