<template>
  <section class="ai-analysis-panel glass-panel" aria-label="AI 分析与追问">
    <div class="ai-header">
      <span class="ai-title">AI 分析</span>
      <button class="btn btn--primary btn--sm" @click="$emit('analyze')">分析当前牌面</button>
    </div>
    <p class="ai-hint">分析当前牌面会开启新讨论</p>
    <div v-if="snapshot" class="ai-snapshot" :class="{ 'ai-snapshot--old': stale }">
      <details><summary aria-label="查看讨论手牌"><strong>{{ stale ? '正在讨论此前局面' : '正在讨论当前局面' }} · 第 {{ snapshot.game.turnCount }} 轮</strong></summary><p>{{ snapshot.game.hands[0].map(tileLabel).join('、') }}</p></details>
    </div>
    <div class="ai-content" ref="contentArea" @scroll="rememberScroll">
      <div v-if="result" class="ai-result">
        <p class="ai-recommendation">建议：{{ result.recommendation }}</p>
        <p>理由：{{ result.reasoning }}</p>
        <p v-if="result.alternative">备选：{{ result.alternative }}</p>
      </div>
      <DiscardComparisonView v-if="comparison" :comparison="comparison" />
      <p v-if="!result && !messages.length && !loading" class="ai-empty">想知道为什么这样打？直接提问，或先分析当前牌面。</p>
      <div class="ai-messages" role="log" aria-label="本局面问答记录" aria-live="polite">
        <article v-for="(message, index) in messages" :key="index" class="ai-message" :class="`ai-message--${message.role}`">
          <strong>{{ message.role === 'user' ? '你' : 'AI' }}</strong>
          <p>{{ message.content }}</p>
        </article>
      </div>
      <p v-if="loading" class="ai-loading" role="status">{{ status || '正在请求 AI 回答…' }}</p>
      <div v-if="error" class="ai-error" role="alert">
        <p>{{ error }}</p>
        <button class="btn btn--ghost btn--sm" data-action="settings" @click="$emit('settings')">打开设置</button>
        <button v-if="draft.trim()" class="btn btn--ghost btn--sm" :disabled="loading || atLimit" @click="submit">重试提问</button>
        <button v-else class="btn btn--ghost btn--sm" :disabled="loading" @click="$emit('analyze')">重试分析</button>
      </div>
    </div>
    <form class="ai-composer" novalidate @submit.prevent="submit">
      <div class="ai-quick">
        <button v-if="result" type="button" class="btn btn--ghost btn--sm" :disabled="loading || !canAsk" @click="draft = '为什么推荐这张？'">为什么推荐这张？</button>
        <button v-if="result" type="button" class="btn btn--ghost btn--sm" :disabled="loading || !canAsk" @click="draft = '和另一张相比呢？'">和另一张相比呢？</button>
        <button type="button" class="btn btn--ghost btn--sm" data-question="acceptance" :disabled="loading || !canAsk" @click="draft = '有哪些有效进张？'">有哪些有效进张？</button>
      </div>
      <label for="ai-question">追问这个局面</label>
      <textarea id="ai-question" class="resize-none" v-model="draft" rows="2" maxlength="1000" :readonly="loading" :disabled="!canAsk" aria-describedby="ai-question-help" placeholder="例如：打七条和四筒有什么区别？" @keydown.stop="onKeyDown" />
      <p id="ai-question-help" class="ai-hint">
        <template v-if="!canAsk">轮到你出牌时，可以开始追问。</template>
        <template v-else-if="atLimit">已达到 20 轮，请重新讨论此局面。</template>
        <template v-else><span class="ai-key-hint">Enter 发送 · Shift+Enter 换行 · </span>最多 1000 字符</template>
      </p>
      <div class="ai-actions">
        <button v-if="snapshot" type="button" class="btn btn--ghost btn--sm" data-action="restart" :disabled="loading" @click="$emit('restart')">重新讨论此局面</button>
        <span class="ai-rounds">{{ Math.floor(messages.length / 2) }}/20 轮</span>
        <button v-if="loading" type="button" class="btn btn--ghost btn--sm" data-action="cancel" @click="$emit('cancel')">取消</button>
        <button type="submit" class="btn btn--primary btn--sm" data-action="send" :disabled="loading || !canAsk || atLimit || !draft.trim()">发送</button>
      </div>
      <button v-if="atLimit && !snapshot" type="button" class="btn btn--ghost btn--sm" data-action="restart" @click="$emit('restart')">重新讨论此局面</button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import type { AnalysisResult } from '../ai/analyzer';
import type { AIMessage } from '../ai/provider';
import { tileLabel, type AnalysisSnapshot, type DiscardComparison } from '../ai/followup';
import DiscardComparisonView from './DiscardComparison.vue';
const props = withDefaults(defineProps<{
  result: AnalysisResult | null; loading: boolean; error: string;
  snapshot?: AnalysisSnapshot | null; comparison?: DiscardComparison | null;
  messages?: AIMessage[]; stale?: boolean; canAsk?: boolean; atLimit?: boolean; status?: string;
}>(), { snapshot:null, comparison:null, messages:()=>[], stale:false, canAsk:false, atLimit:false, status:'' });
const draft = defineModel<string>('draft', { default:'' });
const emit = defineEmits<{ analyze:[]; send:[]; cancel:[]; restart:[]; settings:[] }>();
const contentArea = ref<HTMLElement | null>(null);
let followBottom = true;
function rememberScroll() {
  const el = contentArea.value;
  if (el) followBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
}
function submit() {
  if (!props.loading && props.canAsk && !props.atLimit && draft.value.trim()) emit('send');
}
function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); submit(); }
}
watch(() => [props.messages.length, props.loading, props.error], async () => {
  if (!followBottom) return;
  await nextTick();
  if (contentArea.value) contentArea.value.scrollTop = contentArea.value.scrollHeight;
});
</script>

<style scoped>
.ai-analysis-panel { padding:var(--space-3); width:100%; height:100%; min-height:0; display:flex; flex-direction:column; gap:var(--space-2); color:var(--color-text-inverse); font-size:var(--font-sm); line-height:1.5; }
.ai-header { display:flex; align-items:center; justify-content:space-between; gap:var(--space-2); flex-wrap:wrap; }
.ai-title { font-weight:700; font-size:var(--font-md); }
p { margin:0; white-space:pre-wrap; overflow-wrap:anywhere; }
.ai-hint, .ai-rounds { font-size:var(--font-xs); color:var(--color-text-muted); }
.ai-snapshot { border-left:3px solid var(--color-info); padding-left:var(--space-2); font-size:var(--font-xs); }
.ai-snapshot--old { border-color:var(--color-warning); }
.ai-snapshot--old strong { color:var(--color-warning); }
summary { cursor:pointer; }
summary:hover { color:var(--color-info); }
summary:focus-visible { outline:2px solid var(--color-info); }
.ai-content { flex:1; min-height:64px; overflow-y:auto; scrollbar-gutter:stable; display:flex; flex-direction:column; gap:var(--space-3); }
.ai-result, .ai-message { display:flex; flex-direction:column; gap:var(--space-1); }
.ai-recommendation { color:var(--color-success); }
.ai-messages { display:flex; flex-direction:column; gap:var(--space-3); }
.ai-message { padding:var(--space-2); border-radius:var(--radius-sm); background:var(--color-surface); }
.ai-message--user { border-left:2px solid var(--color-info); }
.ai-message--assistant strong { color:var(--color-gold); }
.ai-empty { color:var(--color-text-muted); }
.ai-loading { color:var(--color-gold); }
.ai-error { color:var(--color-danger); padding:var(--space-2); border:1px solid var(--color-danger); border-radius:var(--radius-sm); }
.ai-composer { flex-shrink:0; display:flex; flex-direction:column; gap:var(--space-1); border-top:1px solid var(--color-surface-border); padding-top:var(--space-2); }
.ai-quick, .ai-actions { display:flex; flex-wrap:wrap; align-items:center; gap:var(--space-1); }
.ai-quick .btn { padding:var(--space-1); font-size:var(--font-xs); white-space:normal; }
.ai-rounds { margin-left:auto; }
textarea { width:100%; min-height:52px; max-height:100px; resize:none; padding:var(--space-2); border:1px solid var(--color-surface-border); border-radius:var(--radius-sm); background:var(--color-glass-bg-strong); color:var(--color-text-inverse); font:inherit; }
textarea:focus-visible { outline:2px solid var(--color-info); outline-offset:1px; }
@media (max-height:560px) { .ai-analysis-panel { gap:var(--space-1); padding:var(--space-2); } .ai-quick, .ai-key-hint { display:none; } .ai-header .btn { min-height:32px; } .ai-content { min-height:40px; } textarea { min-height:44px; height:44px; } }
</style>
