<template>
  <div class="ai-analysis-panel glass-panel">
    <div class="ai-header">
      <span class="ai-title">AI 分析</span>
      <button class="btn btn--primary btn--sm" :disabled="loading" @click="$emit('analyze')">
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
  padding: var(--space-3) var(--space-4);
  width: 100%;
  max-width: 500px;
  color: var(--color-text-inverse);
}

.ai-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ai-title {
  font-size: var(--font-md);
  font-weight: 700;
}

.ai-loading {
  color: var(--color-gold);
  margin-top: var(--space-2);
}

.ai-error {
  color: var(--color-danger);
  margin-top: var(--space-2);
}

.ai-result {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-2);
  font-size: var(--font-sm);
  line-height: 1.5;
}

.ai-recommendation {
  color: var(--color-success);
}

.ai-reasoning {
  color: var(--color-text-muted);
}

.ai-alternative {
  color: var(--color-info);
}
</style>
