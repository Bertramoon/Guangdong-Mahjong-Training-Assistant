<template>
  <div class="game-view">
    <div v-if="!gameState" class="start-screen">
      <h1>广东麻将训练助手</h1>
      <button class="btn" @click="startNewGame">开始新游戏</button>
    </div>

    <div v-else class="game-container">
      <GameBoard
        :hands="gameState.hands"
        :melds="gameState.melds"
        :discards="gameState.discards"
        :selected-tile-id="selectedTile?.id ?? null"
        :ghost-type="gameState.ghostType"
        :ghost-value="gameState.ghostValue"
        :ghost-name="ghostName"
        :current-player="gameState.currentPlayer"
        :phase="gameState.phase"
        :turn-text="`轮次: ${gameState.turnCount} | 当前: ${currentPlayerName}`"
        @select-tile="selectTile"
      />

      <!-- Action bar -->
      <div class="action-bar">
        <button
          v-if="gameState.currentPlayer === 0 && gameState.phase === 'discard'"
          class="btn btn--primary"
          :disabled="!selectedTile"
          @click="playerDiscard"
        >
          {{ selectedTile ? `出牌: ${getTileName(selectedTile)}` : '请选择手牌' }}
        </button>

        <template v-if="gameState.phase === 'reaction' && gameState.lastDiscardPlayer !== 0">
          <button class="btn btn--peng" @click="playerPeng" v-if="canPeng(gameState.hands[0], gameState.lastDiscard!)">
            碰
          </button>
          <button class="btn btn--gang" @click="playerMingGang" v-if="canMingGang(gameState.hands[0], gameState.lastDiscard!)">
            明杠
          </button>
          <button class="btn btn--pass" @click="playerPass">过</button>
        </template>

        <template v-if="gameState.currentPlayer === 0 && gameState.phase === 'discard'">
          <button
            v-for="opt in jiaGangOptions"
            :key="`jg-${opt.type}-${opt.value}`"
            class="btn btn--gang"
            @click="playerJiaGang(opt.type, opt.value)"
          >
            加杠: {{ getTileName({ type: opt.type, value: opt.value, id: -1 }) }}
          </button>
        </template>

        <button v-if="canHuNow" class="btn btn--hu" @click="playerHu">
          自摸胡！
        </button>
      </div>

      <!-- Game over -->
      <div v-if="gameState.phase === 'hu' || gameState.phase === 'draw_end'" class="result-banner">
        <span v-if="gameState.winner === 0">你赢了！</span>
        <span v-else>流局</span>
        <button class="btn" @click="startNewGame">再来一局</button>
      </div>

      <!-- Log -->
      <div class="log-panel">
        <div v-for="(msg, i) in gameLog.slice(-8)" :key="i" class="log-line">{{ msg }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGame } from '../composables/useGame';
import { getTileName } from '../engine/tile';
import { canPeng, canMingGang } from '../engine/meld';
import GameBoard from './GameBoard.vue';

const {
  gameState,
  selectedTile,
  gameLog,
  canHuNow,
  jiaGangOptions,
  currentPlayerName,
  ghostName,
  startNewGame,
  selectTile,
  playerDiscard,
  playerPeng,
  playerMingGang,
  playerJiaGang,
  playerPass,
  playerHu,
} = useGame();
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
.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.action-bar {
  display: flex;
  gap: 10px;
  min-height: 44px;
}
.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.2s;
  color: #fff;
}
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn--primary { background: #3388cc; }
.btn--primary:hover:not(:disabled) { background: #2277bb; }
.btn--peng { background: #cc8833; }
.btn--gang { background: #9933cc; }
.btn--hu { background: #cc3333; font-size: 18px; font-weight: bold; }
.btn--pass { background: #666; }
.result-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  color: #ffd700;
  font-size: 20px;
  font-weight: bold;
}
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
