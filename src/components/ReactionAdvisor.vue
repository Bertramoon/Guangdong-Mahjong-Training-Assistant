<template>
  <div class="reaction-advisor" v-if="analysis">
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

.advisor-discard {
  color: #ffa500;
}

.advisor-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 4px;
}

.option-row.best {
  background: rgba(255, 215, 0, 0.15);
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.option-action {
  font-weight: bold;
  min-width: 32px;
}

.option-shanten {
  color: #aaa;
}

.option-acceptance {
  color: #5f5;
}

.option-detail {
  color: #9cf;
  font-size: 12px;
}

.advisor-rec {
  color: #ffd700;
  font-size: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 6px;
}
</style>
