import { computed, onScopeDispose, ref, shallowRef, type Ref } from 'vue';
import type { GameState } from '../engine/types';
import type { DiscardEvaluation, ReactionAnalysis } from '../engine/advisor';
import { discardRecommendation } from '../engine/compute-client';
import { analyzeGame, type AnalysisResult } from '../ai/analyzer';
import type { AIMessage, AIProviderConfig } from '../ai/provider';
import { answerQuestion, captureSnapshot, compareDiscards, namedTiles, resolveQuestionTiles, tileKey, type AnalysisSnapshot, type DiscardComparison } from '../ai/followup';

interface Dependencies {
  loadAdvice: typeof discardRecommendation;
  analyze: typeof analyzeGame;
  answer: typeof answerQuestion;
}

export function useAIConversation(
  gameState: Ref<GameState | null>, config: Ref<AIProviderConfig>,
  reactionAdvice: Ref<ReactionAnalysis | null> = ref(null), overrides: Partial<Dependencies> = {},
) {
  const deps: Dependencies = { loadAdvice: discardRecommendation, analyze: analyzeGame, answer: answerQuestion, ...overrides };
  const snapshot = shallowRef<AnalysisSnapshot | null>(null);
  const result = ref<AnalysisResult | null>(null);
  const messages = ref<AIMessage[]>([]);
  const evaluations = shallowRef<DiscardEvaluation[] | null>(null);
  const comparison = shallowRef<DiscardComparison | null>(null);
  const draft = ref('');
  const loading = ref(false);
  const error = ref('');
  const locked = ref(false);
  const status = ref('');
  let requestId = 0;
  let controller: AbortController | null = null;
  let recommendation: string | undefined;

  const eligible = (game: GameState | null) => game?.phase === 'discard' && game.currentPlayer === 0;
  const canAsk = computed(() => eligible(snapshot.value?.game ?? null) || eligible(gameState.value));
  const stale = computed(() => !!snapshot.value && (!gameState.value || captureSnapshot(gameState.value).key !== snapshot.value.key));
  const atLimit = computed(() => messages.value.length >= 40);
  const configured = () => !!(config.value.endpoint.trim() && config.value.apiKey.trim() && config.value.model.trim());

  function cancel() {
    requestId++;
    controller?.abort();
    controller = null;
    loading.value = false;
    status.value = '';
  }
  function clearDiscussion() {
    result.value = null;
    messages.value = [];
    comparison.value = null;
    recommendation = undefined;
    locked.value = false;
    error.value = '';
    draft.value = '';
  }
  function reset() {
    cancel(); clearDiscussion(); snapshot.value = null; evaluations.value = null;
  }
  function restart() {
    cancel();
    const initialResult = result.value;
    clearDiscussion();
    result.value = initialResult;
    locked.value = !!snapshot.value;
    recommendation = initialResult ? namedTiles(initialResult.recommendation).find(k => evaluations.value?.some(e => tileKey(e.discardTile) === k)) : undefined;
  }
  function begin() {
    controller = new AbortController();
    loading.value = true;
    error.value = '';
    return { id: ++requestId, signal: controller.signal };
  }
  async function prepare(target: AnalysisSnapshot, id: number) {
    if (evaluations.value || !eligible(target.game)) return;
    status.value = '正在准备本地依据…';
    const game = target.game;
    const advice = await deps.loadAdvice(game.hands[0], game.ghostType, game.ghostValue, game.melds[0].length, 34);
    if (id === requestId) evaluations.value = advice.evaluations;
  }
  function finish(id: number) {
    if (id !== requestId) return;
    loading.value = false; status.value = ''; controller = null;
  }
  function fail(id: number, err: unknown) {
    if (id === requestId) error.value = err instanceof Error ? err.message : String(err);
  }

  async function analyze(automatic = false) {
    if (!gameState.value || (automatic && locked.value)) return;
    cancel();
    clearDiscussion();
    snapshot.value = captureSnapshot(gameState.value);
    evaluations.value = null;
    if (!configured()) { error.value = '请在设置中填写 AI 服务地址、API Key 和模型名称。'; return; }
    const target = snapshot.value;
    const { id, signal } = begin();
    // Copy reaction evidence synchronously, before any asynchronous computation.
    const reaction = reactionAdvice.value ? JSON.parse(JSON.stringify(reactionAdvice.value)) as ReactionAnalysis : undefined;
    try {
      await prepare(target, id);
      if (id !== requestId) return;
      status.value = '正在请求 AI 分析…';
      const entries = evaluations.value as DiscardEvaluation[] | null;
      const advice = entries ? { evaluations: entries.slice(0, 10), currentShanten: entries[0]?.shanten ?? 8 } : undefined;
      const response = await deps.analyze({ ...config.value }, target.game, 0, advice, reaction, signal);
      if (id !== requestId) return;
      if (response.error) throw new Error(response.error);
      result.value = response;
      recommendation = namedTiles(response.recommendation).find(k => entries?.some(e => tileKey(e.discardTile) === k));
    } catch (err) { fail(id, err); }
    finally { finish(id); }
  }

  async function send() {
    if (loading.value) return;
    const question = draft.value.trim();
    if (!question) return;
    error.value = '';
    if (question.length > 1000) { error.value = '每次问题最多 1000 个字符。'; return; }
    if (atLimit.value) { error.value = '本次讨论已达到 20 轮，请重新讨论此局面。'; return; }
    if (!canAsk.value) { error.value = '轮到你出牌时，可以开始新的追问讨论。'; return; }
    if (!eligible(snapshot.value?.game ?? null)) {
      snapshot.value = captureSnapshot(gameState.value!); evaluations.value = null;
      result.value = null; messages.value = []; comparison.value = null;
    }
    const target = snapshot.value!;
    locked.value = true;
    const { id, signal } = begin();
    try {
      await prepare(target, id);
      if (id !== requestId) return;
      const entries = evaluations.value ?? [];
      const previous = comparison.value ? [tileKey(comparison.value.a.discardTile), tileKey(comparison.value.b.discardTile)] : [];
      const keys = resolveQuestionTiles(question, entries, recommendation, previous);
      const localComparison = compareDiscards(entries, keys);
      if (localComparison) comparison.value = localComparison;
      // Local evidence remains useful even without a configured/reachable model.
      if (!configured()) throw new Error('请在设置中填写 AI 服务地址、API Key 和模型名称。');
      status.value = '正在请求 AI 回答…';
      const history: AIMessage[] = result.value ? [{ role: 'assistant', content: `此前推荐：${result.value.recommendation}\n理由：${result.value.reasoning}` }, ...messages.value] : [...messages.value];
      const response = await deps.answer({ ...config.value }, target, entries, history, question, localComparison, signal);
      if (id !== requestId) return;
      if (response.comparison) comparison.value = response.comparison;
      messages.value.push({ role: 'user', content: question }, { role: 'assistant', content: response.content });
      draft.value = '';
    } catch (err) { fail(id, err); }
    finally { finish(id); }
  }

  onScopeDispose(cancel);
  return { snapshot, result, messages, comparison, draft, loading, error, locked, status, stale, canAsk, atLimit, analyze, send, cancel, reset, restart };
}
