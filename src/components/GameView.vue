<template>
  <div class="game-view">
    <div v-if="!gameState" class="start-screen">
      <h1>广东麻将训练助手</h1>
      <div class="seed-panel">
        <label class="seed-label">种子号（留空随机生成）</label>
        <input
          v-model="seedInput"
          class="seed-input"
          type="text"
          placeholder="输入种子号重播牌局"
          @keyup.enter="handleStart"
        />
        <button class="btn" @click="handleStart">开始新游戏</button>
      </div>
    </div>

    <div v-else class="game-container">
      <div class="top-bar">
        <div class="top-bar-info">
          <span class="ghost-badge">鬼牌: {{ ghostName }}</span>
          <span class="seed-badge">种子: {{ gameState.seed }}</span>
        </div>
        <div class="top-bar-actions">
          <button v-if="revealMode" class="btn-new-game" @click="handleNewGame">再来一局</button>
          <button class="settings-btn" @click="showSettings = true">⚙ 设置</button>
        </div>
      </div>

      <GameBoard
        :hands="gameState.hands"
        :melds="gameState.melds"
        :discards="gameState.discards"
        :discard-order="gameState.discardOrder"
        :selected-tile-id="selectedTile?.id ?? null"
        :highlighted-tile-ids="highlightedTileIds"
        :matched-tile-ids="matchedTileIds"
        :ghost-type="gameState.ghostType"
        :ghost-value="gameState.ghostValue"
        :ghost-name="ghostName"
        :current-player="gameState.currentPlayer"
        :phase="gameState.phase"
        :turn-text="`轮次: ${gameState.turnCount} | 当前: ${currentPlayerName}`"
        :reveal-mode="revealMode || appSettings.robotOpenHand"
        :wall-tiles="revealMode ? gameState.wall : undefined"
        @select-tile="selectTile"
      />

      <ActionPanel
        :phase="gameState.phase"
        :current-player="gameState.currentPlayer"
        :last-discard-player="gameState.lastDiscardPlayer"
        :can-hu="canHuNow"
        :show-peng="gameState.phase === 'reaction' && gameState.lastDiscardPlayer !== 0 && canPeng(gameState.hands[0], gameState.lastDiscard!)"
        :show-ming-gang="gameState.phase === 'reaction' && gameState.lastDiscardPlayer !== 0 && canMingGang(gameState.hands[0], gameState.lastDiscard!)"
        :show-pass="gameState.phase === 'reaction' && gameState.lastDiscardPlayer !== 0"
        :show-discard="gameState.currentPlayer === 0 && gameState.phase === 'discard'"
        :jia-gang-options="jiaGangOptions"
        :an-gang-options="anGangOptions"
        :selected-tile="selectedTile"
        @discard="playerDiscard"
        @peng="playerPeng"
        @ming-gang="playerMingGang"
        @jia-gang="(t, v) => playerJiaGang(t, v)"
        @an-gang="(t, v) => playerAnGang(t, v)"
        @hu="playerHu"
        @pass="playerPass"
      />

      <AIAnalysisPanel
        :result="aiResult"
        :loading="aiLoading"
        :error="aiError"
        @analyze="analyzeCurrentGame"
      />

      <DiscardAdvisorVue
        v-if="discardAdvice"
        :evaluations="discardAdvice.evaluations"
        :current-shanten="discardAdvice.currentShanten"
      />

      <ReactionAdvisorVue
        v-if="reactionAdvice"
        :analysis="reactionAdvice"
      />

      <GameResult
        :show="(gameState.phase === 'hu' || gameState.phase === 'draw_end') && !revealMode"
        :winner="gameState.winner"
        :turn-count="gameState.turnCount"
        :seed="gameState.seed"
        :hu-result="lastHuResult"
        @new-game="handleNewGame"
        @view-details="revealMode = true"
        @replay="handleReplay"
      />

      <div class="log-panel">
        <div
          v-for="(msg, i) in gameLog.slice(-8)"
          :key="i"
          class="log-line"
          :style="{ color: logColor(msg) }"
        >{{ msg }}</div>
      </div>
    </div>

    <SettingsModal
      :show="showSettings"
      :config="aiConfig"
      :settings="appSettings"
      @close="showSettings = false"
      @save="onSaveSettings"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useGame } from '../composables/useGame';
import { useShantenCache } from '../composables/useShantenCache';
import { canPeng, canMingGang } from '../engine/meld';
import AIAnalysisPanel from './AIAnalysisPanel.vue';
import SettingsModal from './SettingsModal.vue';
import { analyzeGame, type AnalysisResult } from '../ai/analyzer';
import { loadAIConfig, saveAIConfig, loadSettings, saveSettings, saveGameSummary } from '../storage/store';
import type { AIProviderConfig } from '../ai/provider';
import type { AppSettings } from '../storage/store';
import GameBoard from './GameBoard.vue';
import ActionPanel from './ActionPanel.vue';
import GameResult from './GameResult.vue';
import DiscardAdvisorVue from './DiscardAdvisor.vue';
import ReactionAdvisorVue from './ReactionAdvisor.vue';

const appSettings = ref<AppSettings>(loadSettings());

const {
  gameState,
  selectedTile,
  gameLog,
  canHuNow,
  jiaGangOptions,
  anGangOptions,
  highlightedTileIds,
  matchedTileIds,
  lastHuResult,
  currentPlayerName,
  ghostName,
  startGameAndAutoPlay,
  selectTile,
  playerDiscard,
  playerPeng,
  playerMingGang,
  playerJiaGang,
  playerAnGang,
  playerPass,
  playerHu,
  discardAdvice,
  reactionAdvice,
} = useGame(appSettings);

const { loadCache } = useShantenCache();

onMounted(() => {
  loadCache();
  window.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
});

const aiResult = ref<AnalysisResult | null>(null);
const aiLoading = ref(false);
const aiError = ref('');
const showSettings = ref(false);
const revealMode = ref(false);
const aiConfig = ref<AIProviderConfig>(loadAIConfig());

const seedInput = ref('');

function handleStart() {
  const trimmed = seedInput.value.trim();
  const seed = trimmed ? parseInt(trimmed, 10) : undefined;
  if (trimmed && (isNaN(seed!) || seed! <= 0)) {
    return;
  }
  seedInput.value = '';
  startGameAndAutoPlay(seed);
}

async function analyzeCurrentGame() {
  if (!gameState.value || aiLoading.value) return;
  aiLoading.value = true;
  aiError.value = '';
  aiResult.value = null;
  const result = await analyzeGame(aiConfig.value, gameState.value, 0, discardAdvice.value ?? undefined, reactionAdvice.value ?? undefined);
  aiResult.value = result;
  if (result.error) aiError.value = result.error;
  aiLoading.value = false;
}

function onSaveSettings(config: AIProviderConfig, settings: AppSettings) {
  aiConfig.value = config;
  appSettings.value = settings;
  saveAIConfig(config);
  saveSettings(settings);
}

function handleNewGame() {
  revealMode.value = false;
  seedInput.value = '';
  startGameAndAutoPlay();
}

function handleReplay(seed: number) {
  revealMode.value = false;
  startGameAndAutoPlay(seed);
}

/** 按日志内容着色：胡=红、杠=紫、你=白、机器人=灰、其余=浅灰 */
function logColor(msg: string): string {
  if (msg.includes('胡')) return '#ff7777';
  if (msg.includes('杠')) return '#cc77dd';
  if (msg.startsWith('你')) return '#ffffff';
  if (msg.startsWith('机器人')) return '#9a9a9a';
  return '#cccccc';
}

/** 键盘移动手牌选择（出牌阶段） */
function moveSelection(dir: -1 | 1) {
  const hand = gameState.value?.hands[0] ?? [];
  if (hand.length === 0) return;
  let idx = selectedTile.value
    ? hand.findIndex(t => t.id === selectedTile.value!.id)
    : -1;
  if (idx === -1) {
    idx = dir === 1 ? 0 : hand.length - 1;
  } else {
    idx = (idx + dir + hand.length) % hand.length;
  }
  selectedTile.value = hand[idx];
}

/** 全局键盘快捷键 */
function onKeyDown(e: KeyboardEvent) {
  const tag = (document.activeElement?.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea') return;
  const game = gameState.value;
  if (!game) return;

  const isDiscard = game.phase === 'discard' && game.currentPlayer === 0;
  const isReaction = game.phase === 'reaction' && game.lastDiscardPlayer !== 0 && game.lastDiscard;

  if (isDiscard) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      moveSelection(e.key === 'ArrowLeft' ? -1 : 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (selectedTile.value) { e.preventDefault(); playerDiscard(); }
    } else if (e.key === 'h' || e.key === 'H') {
      if (canHuNow.value) { e.preventDefault(); playerHu(); }
    }
    return;
  }

  if (isReaction && game.lastDiscard) {
    const tile = game.lastDiscard;
    if (e.key === 'p' || e.key === 'P') {
      if (canPeng(game.hands[0], tile)) { e.preventDefault(); playerPeng(); }
    } else if (e.key === 'm' || e.key === 'M') {
      if (canMingGang(game.hands[0], tile)) { e.preventDefault(); playerMingGang(); }
    } else if (e.key === 'g' || e.key === 'G') {
      e.preventDefault(); playerPass();
    }
  }
}

watch(() => gameState.value?.phase, (phase) => {
  if (phase === 'hu' || phase === 'draw_end') {
    saveGameSummary({
      date: new Date().toISOString(),
      winner: gameState.value?.winner ?? null,
      turns: gameState.value?.turnCount ?? 0,
      ghostType: gameState.value?.ghostType ?? 'wan',
      ghostValue: gameState.value?.ghostValue ?? 1,
    });
  }
});

/** 自动 AI 分析：进入玩家出牌阶段时触发（仅在开启且配置了 API Key 时） */
watch(
  () => gameState.value?.phase === 'discard' && gameState.value?.currentPlayer === 0,
  (isPlayerTurn, wasPlayerTurn) => {
    if (isPlayerTurn && !wasPlayerTurn && appSettings.value.autoAnalysis && aiConfig.value.apiKey) {
      analyzeCurrentGame();
    }
  },
);
</script>

<style scoped>
.game-view {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.start-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  margin-top: 120px;
  color: #fff;
}
.start-screen h1 { font-size: 32px; }
.start-screen .btn {
  padding: 12px 32px;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
  background: #3388cc;
  color: #fff;
}
.start-screen .btn:hover { background: #2277bb; }
.seed-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.seed-label {
  color: #aaa;
  font-size: 14px;
}
.seed-input {
  width: 280px;
  padding: 10px 16px;
  border: 1px solid #555;
  border-radius: 6px;
  background: rgba(255,255,255,0.1);
  color: #fff;
  font-size: 16px;
  text-align: center;
}
.seed-input::placeholder {
  color: #777;
}
.seed-input:focus {
  outline: none;
  border-color: #3388cc;
}
.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.top-bar {
  width: 100%;
  max-width: 600px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 8px;
}
.ghost-badge {
  font-size: 14px;
  color: #ffd700;
  background: rgba(0,0,0,0.3);
  padding: 4px 12px;
  border-radius: 4px;
}
.top-bar-info {
  display: flex;
  gap: 8px;
  align-items: center;
}
.seed-badge {
  font-size: 13px;
  color: #aaa;
  background: rgba(0,0,0,0.2);
  padding: 4px 10px;
  border-radius: 4px;
}
.settings-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  background: rgba(255,255,255,0.15);
  color: #fff;
  cursor: pointer;
  font-size: 13px;
}
.settings-btn:hover { background: rgba(255,255,255,0.25); }
.top-bar-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.btn-new-game {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  background: #3388cc;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
}
.btn-new-game:hover { background: #2277bb; }
.log-panel {
  width: 100%;
  max-width: 600px;
  max-height: 140px;
  overflow-y: auto;
  background: rgba(0,0,0,0.4);
  border-radius: 8px;
  padding: 8px 12px;
}
.log-line {
  font-size: 13px;
  color: #ccc;
  line-height: 1.6;
}
</style>
