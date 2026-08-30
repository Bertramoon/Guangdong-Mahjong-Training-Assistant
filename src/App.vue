<template>
  <div class="stage" :class="{ 'stage--scaled': active }" :style="stageStyle">
    <GameView />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import GameView from './components/GameView.vue';
import { useStageScale } from './composables/useStageScale';

const COMPACT_QUERY = '(orientation: landscape) and (max-height: 520px)';
const { scale, active } = useStageScale(COMPACT_QUERY);
const stageStyle = computed(() => (active.value ? { '--stage-scale': String(scale.value) } : {}));
</script>
