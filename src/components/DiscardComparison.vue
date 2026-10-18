<template>
  <section class="discard-comparison" aria-label="本地出牌对比">
    <strong>本地出牌对比</strong>
    <p class="comparison-note">有效进张按牌种统计，未扣除可见牌</p>
    <div v-for="(entry, index) in [comparison.a, comparison.b]" :key="index" class="comparison-option">
      <strong>打{{ tileLabel(entry.discardTile) }}</strong>
      <p>{{ entry.shanten }} 向听 · 有效进张：{{ entry.acceptanceTiles.length }} 种</p>
      <p>进张：{{ names(entry.acceptanceTiles) }}</p>
    </div>
    <p>共有：{{ names(comparison.common) }}</p>
    <p>仅打{{ tileLabel(comparison.a.discardTile) }}有：{{ names(comparison.onlyA) }}</p>
    <p>仅打{{ tileLabel(comparison.b.discardTile) }}有：{{ names(comparison.onlyB) }}</p>
  </section>
</template>
<script setup lang="ts">
import { tileLabel, type DiscardComparison } from '../ai/followup';
import type { AcceptanceTile } from '../engine/advisor';
defineProps<{ comparison: DiscardComparison }>();
const names = (tiles: AcceptanceTile[]) => tiles.length ? tiles.map(tileLabel).join('、') : '无';
</script>
<style scoped>
.discard-comparison { border:1px solid var(--color-surface-border); border-radius:var(--radius-sm); padding:var(--space-2); display:flex; flex-direction:column; gap:var(--space-2); overflow-wrap:anywhere; }
p { margin:0; }
.comparison-note { color:var(--color-text-muted); font-size:var(--font-xs); }
.comparison-option { padding-bottom:var(--space-2); border-bottom:1px solid var(--color-surface-border); }
.comparison-option strong { color:var(--color-info); }
</style>
