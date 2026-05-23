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
  gap: 10px;
  min-height: 44px;
  flex-wrap: wrap;
  justify-content: center;
}
.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  cursor: pointer;
  color: #fff;
  transition: background 0.2s;
}
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn--primary { background: #3388cc; }
.btn--primary:hover:not(:disabled) { background: #2277bb; }
.btn--peng { background: #cc8833; }
.btn--peng:hover { background: #b87722; }
.btn--gang { background: #9933cc; }
.btn--gang:hover { background: #8822bb; }
.btn--hu { background: #cc3333; font-size: 18px; font-weight: bold; }
.btn--hu:hover { background: #bb2222; }
.btn--pass { background: #666; }
.btn--pass:hover { background: #555; }
</style>
