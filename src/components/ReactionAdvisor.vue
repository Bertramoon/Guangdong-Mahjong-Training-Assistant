<template>
  <div class="reaction-advisor glass-panel" v-if="analysis">
    <div class="advisor-header">
      <span class="advisor-title">碰杠建议</span>
      <span class="advisor-discard">对方打出: {{ discardedTileName }}</span>
    </div>
    <div class="advisor-options">
      <div class="option-row" :class="{ best: bestAction === 'pass' }">
        <span class="option-action">过牌</span>
        <span class="option-shanten">{{ analysis.currentShanten }}向听</span>
      </div>
      <div v-if="analysis.pengResult" class="option-row" :class="{ best: bestAction === 'peng' }">
        <span class="option-action">碰</span>
        <span class="option-shanten">{{ analysis.pengResult.bestShanten }}向听</span>
        <span class="option-acceptance">{{ analysis.pengResult.acceptanceCount }}进张</span>
        <span class="option-detail">出{{ tileName(analysis.pengResult.bestDiscard) }}最优</span>
      </div>
      <div v-if="analysis.mingGangResult" class="option-row" :class="{ best: bestAction === 'mingGang' }">
        <span class="option-action">明杠</span>
        <span class="option-shanten">{{ analysis.mingGangResult.shanten }}向听</span>
        <span class="option-acceptance">{{ analysis.mingGangResult.acceptanceCount }}进张</span>
        <span class="option-detail">摸牌后</span>
      </div>
    </div>
    <div class="advisor-rec" v-if="recommendationText">
      建议: {{ recommendationText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ReactionAnalysis } from '../engine/advisor';
import { getTileName } from '../engine/tile';
import type { Tile } from '../engine/types';

const props = defineProps<{
  analysis: ReactionAnalysis;
}>();

function tileName(t: Tile): string {
  return getTileName(t);
}

const discardedTileName = computed(() =>
  getTileName({ type: props.analysis.discardedTile.type, value: props.analysis.discardedTile.value, id: -1 }),
);

type ActionType = 'pass' | 'peng' | 'mingGang';

const bestAction = computed<ActionType>(() => {
  let best: ActionType = 'pass';
  let bestShanten = props.analysis.currentShanten;
  if (props.analysis.pengResult && props.analysis.pengResult.bestShanten < bestShanten) {
    best = 'peng';
    bestShanten = props.analysis.pengResult.bestShanten;
  }
  if (props.analysis.mingGangResult && props.analysis.mingGangResult.shanten <= bestShanten) {
    best = 'mingGang';
    bestShanten = props.analysis.mingGangResult.shanten;
  }
  return best;
});

const recommendationText = computed(() => {
  const action = bestAction.value;
  const labels: Record<ActionType, string> = {
    pass: '过牌（碰杠不改善牌型）',
    peng: `碰（改善${props.analysis.currentShanten - (props.analysis.pengResult?.bestShanten ?? 0)}向听）`,
    mingGang: `明杠（改善${props.analysis.currentShanten - (props.analysis.mingGangResult?.shanten ?? 0)}向听）`,
  };
  return labels[action];
});
</script>

<style scoped>
.reaction-advisor {
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

.advisor-discard {
  color: var(--color-warning);
}

.advisor-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: var(--space-2);
}

.option-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
}

.option-row.best {
  background: rgba(255, 215, 0, 0.14);
  border: 1px solid rgba(255, 215, 0, 0.35);
}

.option-action {
  font-weight: 700;
  min-width: 32px;
}

.option-shanten {
  color: var(--color-text-muted);
}

.option-acceptance {
  color: var(--color-success);
}

.option-detail {
  color: var(--color-info);
  font-size: var(--font-xs);
}

.advisor-rec {
  color: var(--color-gold);
  font-size: var(--font-xs);
  border-top: 1px solid var(--color-surface-border);
  padding-top: var(--space-2);
}
</style>
