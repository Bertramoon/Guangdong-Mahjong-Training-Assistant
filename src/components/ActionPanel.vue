<template>
  <div class="action-panel" v-if="hasActions">
    <!-- Discard button (when it's player's turn in discard phase) -->
    <button v-if="showDiscard" class="btn btn--primary" :disabled="!selectedTile" @click="$emit('discard')">
      {{ selectedTile ? `出牌: ${getTileName(selectedTile)}` : '请选择手牌' }}
    </button>

    <!-- Reaction buttons (when someone discarded and player can react) -->
    <button v-if="showPeng" class="btn btn--peng" @click="$emit('peng')">碰</button>
    <button v-if="showMingGang" class="btn btn--gang" @click="$emit('ming-gang')">明杠</button>

    <!-- Jia gang options -->
    <button v-for="opt in jiaGangOptions" :key="`jg-${opt.type}-${opt.value}`"
      class="btn btn--gang" @click="$emit('jia-gang', opt.type, opt.value)">
      加杠: {{ getTileName({ type: opt.type, value: opt.value, id: -1 }) }}
    </button>

    <!-- An gang options -->
    <button v-for="opt in anGangOptions" :key="`ag-${opt.type}-${opt.value}`"
      class="btn btn--gang" @click="$emit('an-gang', opt.type, opt.value)">
      暗杠: {{ getTileName({ type: opt.type, value: opt.value, id: -1 }) }}
    </button>

    <!-- Hu button -->
    <button v-if="canHu" class="btn btn--hu" @click="$emit('hu')">自摸胡！</button>

    <!-- Pass button -->
    <button v-if="showPass" class="btn btn--pass" @click="$emit('pass')">过</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Tile, TileType } from '../engine/types';
import { getTileName } from '../engine/tile';

const props = defineProps<{
  phase: string;
  currentPlayer: number;
  lastDiscardPlayer: number;
  canHu: boolean;
  showPeng: boolean;
  showMingGang: boolean;
  showPass: boolean;
  showDiscard: boolean;
  jiaGangOptions: { type: TileType; value: number }[];
  anGangOptions: { type: TileType; value: number }[];
  selectedTile: Tile | null;
}>();

const emit = defineEmits<{
  discard: [];
  peng: [];
  'ming-gang': [];
  'jia-gang': [type: TileType, value: number];
  'an-gang': [type: TileType, value: number];
  hu: [];
  pass: [];
}>();

const hasActions = computed(() => {
  return props.canHu || props.showPeng || props.showMingGang || props.showPass ||
         props.showDiscard || props.jiaGangOptions.length > 0 || props.anGangOptions.length > 0;
});
</script>

<style scoped>
.action-panel {
  display: flex;
  gap: var(--space-3);
  min-height: 44px;
  flex-wrap: wrap;
  justify-content: center;
}
/* 颜色变体；基底 .btn 由全局 base.css 提供（统一形状/阴影/按压） */
.btn--peng {
  background: linear-gradient(180deg, var(--color-peng) 0%, var(--color-peng-600) 100%);
}
.btn--peng:hover { filter: brightness(1.06); }
.btn--gang {
  background: linear-gradient(180deg, var(--color-purple-500) 0%, var(--color-purple-600) 100%);
}
.btn--gang:hover { filter: brightness(1.06); }
.btn--hu {
  background: linear-gradient(180deg, #e05a5a 0%, var(--color-danger) 100%);
  font-size: var(--font-lg);
  font-weight: 700;
  animation: huBreathe 1.6s ease-in-out infinite;
}
.btn--hu:hover { filter: brightness(1.06); }
.btn--pass {
  background: var(--color-slate-500);
}
.btn--pass:hover { background: var(--color-slate-600); }
</style>
