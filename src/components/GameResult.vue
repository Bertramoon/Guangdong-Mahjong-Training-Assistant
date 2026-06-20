<template>
  <Transition name="modal">
  <div class="result-overlay" v-if="show">
    <div class="result-card glass-panel glass-panel--strong">
      <h2 class="result-title" :class="{
        'result-title--win': winner === 0,
        'result-title--draw': winner === -1 || winner === null,
        'result-title--lose': winner !== 0 && winner !== -1 && winner !== null
      }">{{ titleText }}</h2>
      <p class="result-detail">{{ detailText }}</p>
      <div v-if="fanDisplay" class="fan-info">
        <div class="fan-list">
          <span
            v-for="(fan, i) in fanDisplay.items"
            :key="fan.name"
            class="fan-chip"
            :style="{ '--i': i }"
          >{{ fan.name }}<em v-if="fan.value > 0"> +{{ fan.value }}</em></span>
        </div>
        <div class="fan-total">{{ fanDisplay.totalFan }} 番 / {{ fanDisplay.score }} 分</div>
      </div>
      <div v-if="settlement" class="settlement-info">
        <div v-if="!settlement.isDraw" class="horse-info">
          <div>基础分 {{ settlement.baseScore }} × (中马 {{ settlement.horseCount }} + 1) = {{ settlement.finalHuScore }} 分</div>
          <div v-if="settlement.horseResults.length" class="horse-list">
            <span>马牌：</span>
            <span
              v-for="horse in settlement.horseResults"
              :key="horse.tile.id"
              class="horse-tile"
              :class="{ 'horse-tile--hit': horse.isHit }"
            >{{ tileName(horse.tile) }}</span>
          </div>
        </div>
        <div v-else class="horse-info">流局，杠分作废</div>
        <div class="balance-grid">
          <div
            v-for="(score, i) in settlement.balances"
            :key="i"
            class="balance-item"
            :class="{ 'balance-item--win': score > 0, 'balance-item--lose': score < 0 }"
          >
            <span>{{ playerName(i) }}</span>
            <strong>{{ score > 0 ? '+' : '' }}{{ score }}</strong>
          </div>
        </div>
        <div v-if="settlement.lines.length" class="settlement-lines">
          <div v-for="(line, i) in settlement.lines" :key="i" class="settlement-line">
            <span>{{ line.label }}</span>
            <span>{{ formatDeltas(line.deltas) }}</span>
          </div>
        </div>
      </div>
      <div class="seed-info">
        <span>种子号: {{ seed }}</span>
        <button class="btn btn--secondary btn--sm" @click="copySeed">{{ copied ? '已复制' : '复制' }}</button>
      </div>
      <div class="result-actions">
        <button class="btn btn--primary btn--lg" @click="$emit('view-details')">查看对局情况</button>
        <button class="btn btn--secondary btn--lg" @click="$emit('replay', seed)">重播本局</button>
        <button class="btn btn--secondary btn--lg" @click="$emit('new-game')">再来一局</button>
      </div>
    </div>
  </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { FanResult } from '../engine/scoring';
import type { Settlement } from '../engine/settlement';
import type { Tile } from '../engine/types';
import { getTileName } from '../engine/tile';

const props = defineProps<{
  show: boolean;
  winner: number | null;
  turnCount: number;
  seed: number;
  huResult?: FanResult | null;
  settlement?: Settlement | null;
}>();

defineEmits<{
  'new-game': [];
  'view-details': [];
  'replay': [seed: number];
}>();

const PATTERN_FANS = ['清一色', '混一色', '字一色', '碰碰胡', '平和', '七对'];

const titleText = computed(() => {
  if (props.winner === 0) return '你赢了！';
  if (props.winner === -1 || props.winner === null) return '流局';
  return `机器人${props.winner} 胡了`;
});

const detailText = computed(() => `总局数: ${props.turnCount} 轮`);

const fanDisplay = computed(() => {
  if (!props.huResult || props.winner === null || props.winner < 0) return null;
  const ctxFans = props.huResult.fans.filter(f => !PATTERN_FANS.includes(f.name));
  const hasPattern = props.huResult.fans.some(f => PATTERN_FANS.includes(f.name));
  const items = hasPattern ? props.huResult.fans : [{ name: '鸡胡', value: 0 }, ...ctxFans];
  return { items, totalFan: props.huResult.totalFan, score: props.huResult.score };
});

const copied = ref(false);

function copySeed() {
  navigator.clipboard.writeText(String(props.seed));
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2000);
}

function playerName(index: number): string {
  return index === 0 ? '你' : `机器人${index}`;
}

function tileName(tile: Tile): string {
  return getTileName(tile);
}

function formatDeltas(deltas: number[]): string {
  return deltas
    .map((d, i) => `${playerName(i)} ${d > 0 ? '+' : ''}${d}`)
    .join(' / ');
}
</script>

<style scoped>
.result-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.result-card {
  padding: var(--space-12) 60px;
  text-align: center;
}
.result-title {
  font-size: var(--font-2xl);
  margin-bottom: var(--space-3);
}
.result-title--win {
  color: var(--color-gold);
  animation: winPop var(--dur-slower) var(--ease-spring) both;
}
.result-title--draw {
  color: var(--color-text-muted);
}
.result-title--lose {
  color: var(--color-danger);
}
.result-detail {
  font-size: var(--font-lg);
  color: var(--color-text-muted);
  margin-bottom: var(--space-6);
}
.fan-info {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-6);
  margin-bottom: var(--space-6);
}
.fan-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  margin-bottom: var(--space-2);
}
.fan-chip {
  display: inline-block;
  padding: 3px 12px;
  border-radius: var(--radius-pill);
  background: rgba(51, 136, 204, 0.12);
  border: 1px solid rgba(51, 136, 204, 0.28);
  font-size: var(--font-sm);
  color: var(--color-text-inverse);
  opacity: 0;
  animation: fanChipIn var(--dur-slow) var(--ease-out) forwards;
  animation-delay: calc(var(--i) * 80ms);
}
.fan-chip em {
  font-style: normal;
  font-weight: 700;
  color: var(--color-accent);
}
.fan-total {
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--color-danger);
}
.settlement-info {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-6);
  margin-bottom: var(--space-6);
}
.horse-info {
  color: var(--color-text-muted);
  font-size: var(--font-sm);
  margin-bottom: var(--space-3);
}
.horse-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 4px;
}
.horse-tile {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-surface-border);
  background: rgba(255,255,255,0.05);
  color: var(--color-text-muted);
}
.horse-tile--hit {
  border-color: rgba(255, 204, 102, 0.85);
  background: rgba(255, 204, 102, 0.18);
  color: var(--color-gold);
  font-weight: 700;
}
.balance-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(72px, 1fr));
  gap: 8px;
  margin-bottom: var(--space-3);
}
.balance-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  background: rgba(255,255,255,0.05);
  color: var(--color-text-muted);
}
.balance-item strong {
  font-size: var(--font-lg);
  color: inherit;
}
.balance-item--win {
  color: var(--color-success);
}
.balance-item--lose {
  color: var(--color-danger);
}
.settlement-lines {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}
.settlement-line {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}
.seed-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  margin-bottom: var(--space-6);
  font-size: var(--font-md);
  color: var(--color-text-muted);
}
.result-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
</style>
