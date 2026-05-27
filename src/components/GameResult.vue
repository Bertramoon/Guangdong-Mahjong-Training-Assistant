<template>
  <div class="result-overlay" v-if="show">
    <div class="result-card">
      <h2 class="result-title">{{ titleText }}</h2>
      <p class="result-detail">{{ detailText }}</p>
      <div class="seed-info">
        <span>种子号: {{ seed }}</span>
        <button class="btn-copy" @click="copySeed">{{ copied ? '已复制' : '复制' }}</button>
      </div>
      <div class="result-actions">
        <button class="btn btn-primary" @click="$emit('view-details')">查看对局情况</button>
        <button class="btn btn-secondary" @click="$emit('replay', seed)">重播本局</button>
        <button class="btn btn-secondary" @click="$emit('new-game')">再来一局</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
  show: boolean;
  winner: number | null;
  turnCount: number;
  seed: number;
}>();

defineEmits<{
  'new-game': [];
  'view-details': [];
  'replay': [seed: number];
}>();

const titleText = computed(() => {
  if (props.winner === 0) return '你赢了！';
  if (props.winner === -1 || props.winner === null) return '流局';
  return `机器人${props.winner} 胡了`;
});

const detailText = computed(() => `总局数: ${props.turnCount} 轮`);

const copied = ref(false);

function copySeed() {
  navigator.clipboard.writeText(String(props.seed));
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2000);
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
  background: #fff;
  border-radius: 12px;
  padding: 40px 60px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
.result-title {
  font-size: 28px;
  margin-bottom: 12px;
  color: #cc3333;
}
.result-detail {
  font-size: 16px;
  color: #666;
  margin-bottom: 24px;
}
.seed-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
  font-size: 14px;
  color: #888;
}
.btn-copy {
  padding: 3px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  color: #666;
  cursor: pointer;
  font-size: 12px;
}
.btn-copy:hover { background: #f0f0f0; }
.result-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.btn {
  padding: 10px 32px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
}
.btn-primary {
  background: #3388cc;
  color: #fff;
}
.btn-primary:hover { background: #2277bb; }
.btn-secondary {
  background: #666;
  color: #fff;
}
.btn-secondary:hover { background: #555; }
</style>
