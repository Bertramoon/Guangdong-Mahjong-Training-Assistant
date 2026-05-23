<template>
  <div class="game-view">
    <div v-if="!gameState" class="start-screen">
      <h1>广东麻将训练助手</h1>
      <button class="btn" @click="startGameAndAutoPlay">开始新游戏</button>
    </div>

    <div v-else class="game-container">
      <GameBoard
        :hands="gameState.hands"
        :melds="gameState.melds"
        :discards="gameState.discards"
        :selected-tile-id="selectedTile?.id ?? null"
        :drawn-tile-id="drawnTileId"
        :ghost-type="gameState.ghostType"
        :ghost-value="gameState.ghostValue"
        :ghost-name="ghostName"
        :current-player="gameState.currentPlayer"
        :phase="gameState.phase"
        :turn-text="`轮次: ${gameState.turnCount} | 当前: ${currentPlayerName}`"
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
        :selected-tile="selectedTile"
        @discard="playerDiscard"
        @peng="playerPeng"
        @ming-gang="playerMingGang"
        @jia-gang="(t, v) => playerJiaGang(t, v)"
        @hu="playerHu"
        @pass="playerPass"
      />

      <GameResult
        :show="gameState.phase === 'hu' || gameState.phase === 'draw_end'"
        :winner="gameState.winner"
        :turn-count="gameState.turnCount"
        @new-game="startGameAndAutoPlay"
      />

      <div class="log-panel">
        <div v-for="(msg, i) in gameLog.slice(-8)" :key="i" class="log-line">{{ msg }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGame } from '../composables/useGame';
import { canPeng, canMingGang } from '../engine/meld';
import GameBoard from './GameBoard.vue';
import ActionPanel from './ActionPanel.vue';
import GameResult from './GameResult.vue';

const {
  gameState,
  selectedTile,
  gameLog,
  canHuNow,
  jiaGangOptions,
  drawnTileId,
  currentPlayerName,
  ghostName,
  startGameAndAutoPlay,
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
