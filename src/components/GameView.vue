<template>
  <div class="game-view">
    <div v-if="!gameState" class="start-screen">
      <h1>广东麻将训练助手</h1>
      <button class="btn" @click="startGameAndAutoPlay">开始新游戏</button>
    </div>

    <div v-else class="game-container">
      <div class="top-bar">
        <span class="ghost-badge">鬼牌: {{ ghostName }}</span>
        <div class="top-bar-actions">
          <button v-if="revealMode" class="btn-new-game" @click="handleNewGame">再来一局</button>
          <button class="settings-btn" @click="showSettings = true">⚙ 设置</button>
        </div>
      </div>

      <GameBoard
        :hands="gameState.hands"
        :melds="gameState.melds"
        :discards="gameState.discards"
        :selected-tile-id="selectedTile?.id ?? null"
        :highlighted-tile-ids="highlightedTileIds"
        :matched-tile-ids="matchedTileIds"
        :ghost-type="gameState.ghostType"
        :ghost-value="gameState.ghostValue"
        :ghost-name="ghostName"
        :current-player="gameState.currentPlayer"
        :phase="gameState.phase"
        :turn-text="`轮次: ${gameState.turnCount} | 当前: ${currentPlayerName}`"
        :reveal-mode="revealMode"
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

      <GameResult
        :show="(gameState.phase === 'hu' || gameState.phase === 'draw_end') && !revealMode"
        :winner="gameState.winner"
        :turn-count="gameState.turnCount"
        @new-game="handleNewGame"
        @view-details="revealMode = true"
      />

      <div class="log-panel">
        <div v-for="(msg, i) in gameLog.slice(-8)" :key="i" class="log-line">{{ msg }}</div>
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
import { ref, watch } from 'vue';
import { useGame } from '../composables/useGame';
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

const {
  gameState,
  selectedTile,
  gameLog,
  canHuNow,
  jiaGangOptions,
  anGangOptions,
  highlightedTileIds,
  matchedTileIds,
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
} = useGame();

const aiResult = ref<AnalysisResult | null>(null);
const aiLoading = ref(false);
const aiError = ref('');
const showSettings = ref(false);
const revealMode = ref(false);
const aiConfig = ref<AIProviderConfig>(loadAIConfig());
const appSettings = ref<AppSettings>(loadSettings());

async function analyzeCurrentGame() {
  if (!gameState.value || aiLoading.value) return;
  aiLoading.value = true;
  aiError.value = '';
  aiResult.value = null;
  const result = await analyzeGame(aiConfig.value, gameState.value, 0);
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
  startGameAndAutoPlay();
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
