<template>
  <aside class="info-drawer glass-panel" :class="{ 'info-drawer--closed': !open }">
    <div v-show="open" class="drawer-inner">
      <div class="drawer-tabs" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="drawer-tab"
          :class="{ 'drawer-tab--active': active === tab.id }"
          role="tab"
          :aria-selected="active === tab.id"
          @click="active = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
      <div class="drawer-body">
        <template v-for="tab in tabs" :key="tab.id">
          <div v-show="active === tab.id" class="drawer-pane">
            <slot :name="tab.id" />
          </div>
        </template>
      </div>
    </div>
    <button
      class="drawer-handle"
      :aria-label="open ? '收起信息面板' : '展开信息面板'"
      @click="$emit('update:open', !open)"
    >
      {{ open ? '›' : '‹' }}
    </button>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  tabs: readonly { id: string; label: string }[];
}>();

const open = defineModel<boolean>('open', { default: true });
const active = ref<string>(props.tabs[0]?.id ?? '');
</script>

<style scoped>
.info-drawer {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: flex-basis var(--dur-fast) var(--ease-out);
}
.drawer-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 8px 0;
}
.drawer-tab {
  flex: 1;
  min-height: 44px;
  padding: 0 4px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  font-size: var(--font-sm);
  font-family: inherit;
  cursor: pointer;
  touch-action: manipulation;
}
.drawer-tab--active {
  background: var(--color-surface);
  border-color: var(--color-surface-border);
  color: var(--color-text-inverse);
}
.drawer-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.drawer-pane {
  height: 100%;
  overflow-y: auto;
  padding: var(--space-3);
}
.drawer-handle {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: 0;
  width: 20px;
  min-height: 64px;
  border: none;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 16px;
  cursor: pointer;
  touch-action: manipulation;
}
.drawer-handle::before {
  content: '';
  position: absolute;
  inset: 0 0 0 auto;
  width: 44px;
  transform: translateX(-24px);
}
</style>
