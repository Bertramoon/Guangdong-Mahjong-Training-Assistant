<template>
  <div class="ai-analysis-panel">
    <div class="ai-header">
      <span class="ai-title">AI 分析</span>
      <button class="ai-btn" :disabled="loading" @click="$emit('analyze')">
        {{ loading ? '分析中...' : '分析当前牌面' }}
      </button>
    </div>

    <div v-if="loading" class="ai-loading">正在请求 AI 分析...</div>
    <div v-if="error" class="ai-error">{{ error }}</div>

    <div v-if="result" class="ai-result">
      <div class="ai-recommendation">建议: {{ result.recommendation }}</div>
      <div class="ai-reasoning">理由: {{ result.reasoning }}</div>
      <div v-if="result.alternative" class="ai-alternative">备选: {{ result.alternative }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnalysisResult } from '../ai/analyzer';

defineProps<{
  result: AnalysisResult | null;
  loading: boolean;
  error: string;
}>();

defineEmits<{
  analyze: [];
}>();
</script>

<style scoped>
.ai-analysis-panel {
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  padding: 12px 16px;
  width: 100%;
  max-width: 500px;
  color: #fff;
}

.ai-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ai-title {
  font-size: 15px;
  font-weight: bold;
}

.ai-btn {
  padding: 6px 16px;
  background: #3388cc;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.ai-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-loading {
  color: #ffd700;
  margin-top: 8px;
}

.ai-error {
  color: #ff6666;
  margin-top: 8px;
}

.ai-result {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.5;
}

.ai-recommendation {
  color: #5f5;
}

.ai-reasoning {
  color: #ccc;
}

.ai-alternative {
  color: #99c;
}
</style>
