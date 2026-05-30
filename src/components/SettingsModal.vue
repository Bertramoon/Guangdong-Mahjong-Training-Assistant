<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
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

      <div class="modal-buttons">
        <button class="btn-save" @click="onSave">保存</button>
        <button class="btn-cancel" @click="$emit('close')">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { AIProviderConfig } from '../ai/provider';
import type { AppSettings } from '../storage/store';

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
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
}

.modal-card {
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  max-width: 420px;
  width: 90%;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-card h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
  color: #555;
}

.field input {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
}

.field input:focus {
  border-color: #3388cc;
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #555;
  cursor: pointer;
}

.checkbox-field input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.modal-buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
}

.btn-save {
  padding: 8px 24px;
  border: none;
  border-radius: 4px;
  background: #3388cc;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.btn-save:hover {
  background: #2277bb;
}

.btn-cancel {
  padding: 8px 24px;
  border: none;
  border-radius: 4px;
  background: #eee;
  color: #333;
  font-size: 14px;
  cursor: pointer;
}

.btn-cancel:hover {
  background: #ddd;
}
</style>
