<template>
  <Transition name="modal">
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card glass-panel glass-panel--strong">
      <h2>设置</h2>

      <label class="field">
        <span>API Endpoint</span>
        <input v-model="localConfig.endpoint" type="text" placeholder="https://api.openai.com" />
      </label>

      <label class="field">
        <span>API Key</span>
        <input v-model="localConfig.apiKey" type="password" placeholder="sk-..." />
      </label>

      <label class="field">
        <span>Model Name</span>
        <input v-model="localConfig.model" type="text" placeholder="gpt-4o-mini" />
      </label>

      <label class="checkbox-field">
        <input v-model="localSettings.autoAnalysis" type="checkbox" />
        <span>自动 AI 分析（每次轮到你时自动触发）</span>
      </label>

      <label class="checkbox-field">
        <input v-model="localSettings.robotSmartDiscard" type="checkbox" />
        <span>机器人智能弃牌（基于向听数推荐算法）</span>
      </label>

      <label class="checkbox-field">
        <input v-model="localSettings.robotCanHu" type="checkbox" />
        <span>机器人自摸胡（机器人摸牌后可自动胡牌）</span>
      </label>

      <label class="checkbox-field">
        <input v-model="localSettings.robotOpenHand" type="checkbox" />
        <span>机器人明牌（显示机器人手牌）</span>
      </label>

      <div class="cache-field">
        <span>出牌建议缓存：{{ cacheStatusText }}</span>
        <button
          class="btn btn--primary btn--sm"
          :disabled="cacheStatus === 'loading'"
          @click="refresh"
        >
          {{ cacheStatus === 'loading' ? '缓存中...' : '刷新缓存' }}
        </button>
      </div>

      <div class="modal-buttons">
        <button class="btn btn--primary" @click="onSave">保存</button>
        <button class="btn btn--secondary" @click="$emit('close')">取消</button>
      </div>
    </div>
  </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { AIProviderConfig } from '../ai/provider';
import type { AppSettings } from '../storage/store';
import { useShantenCache } from '../composables/useShantenCache';

const props = defineProps<{
  show: boolean;
  config: AIProviderConfig;
  settings: AppSettings;
}>();

const emit = defineEmits<{
  close: [];
  save: [config: AIProviderConfig, settings: AppSettings];
}>();

const localConfig = ref<AIProviderConfig>({ ...props.config });
const localSettings = ref<AppSettings>({ ...props.settings });

const { cacheStatus, cacheCount, refresh } = useShantenCache();

const cacheStatusText = computed(() => {
  if (cacheStatus.value === 'loading') return '缓存中...';
  if (cacheStatus.value === 'ready') return `已缓存 ${cacheCount.value} 条`;
  if (cacheStatus.value === 'none') return '未缓存';
  return '未加载';
});

watch(() => props.show, (val) => {
  if (val) {
    localConfig.value = { ...props.config };
    localSettings.value = { ...props.settings };
  }
});

function onSave() {
  emit('save', { ...localConfig.value }, { ...localSettings.value });
  emit('close');
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: var(--z-modal);
}

.modal-card {
  padding: var(--space-8);
  max-width: 420px;
  width: 90%;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.modal-card h2 {
  margin: 0;
  font-size: var(--font-xl);
  color: var(--color-text-inverse);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-size: var(--font-md);
  color: var(--color-text-inverse);
}

.field input {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-surface-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-inverse);
  font-size: var(--font-md);
  outline: none;
  transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}

.field input::placeholder {
  color: var(--color-text-muted);
}

.field input:focus {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-focus);
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-md);
  color: var(--color-text-inverse);
  cursor: pointer;
}

.checkbox-field input {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--color-accent);
}

.modal-buttons {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  margin-top: var(--space-2);
}

.cache-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--font-md);
  color: var(--color-text-inverse);
}
</style>
