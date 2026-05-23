import { ref, computed } from 'vue';
import type { GameState, Tile, TileType } from '../engine/types';
import {
  createGame, drawPhase, discardPhase,
  pengPhase, mingGangPhase, jiaGangPhase,
  checkReactions, passReaction,
} from '../engine/game';
import { isSelfHu } from '../engine/hu';
import { getTileName } from '../engine/tile';
import { canJiaGang, getJiaGangCandidates, canAnGang } from '../engine/meld';

export function useGame() {
  const gameState = ref<GameState | null>(null);
  const selectedTile = ref<Tile | null>(null);
  const gameLog = ref<string[]>([]);
  const isProcessing = ref(false);

  const canHuNow = ref(false);
  const canJiaGangNow = ref(false);
  const canAnGangNow = ref(false);
  const jiaGangOptions = ref<{ type: TileType; value: number }[]>([]);

  const currentPlayerName = computed(() => {
    if (!gameState.value) return '';
    const p = gameState.value.currentPlayer;
    return p === 0 ? '你' : `机器人${p}`;
  });

  const playerHand = computed(() => {
    if (!gameState.value) return [];
    return gameState.value.hands[0];
  });

  const playerMelds = computed(() => {
    if (!gameState.value) return [];
    return gameState.value.melds[0];
  });

  const playerDiscards = computed(() => {
    if (!gameState.value) return [];
    return gameState.value.discards[0];
  });

  const ghostName = computed(() => {
    if (!gameState.value) return '';
    return getTileName({
      type: gameState.value.ghostType,
      value: gameState.value.ghostValue,
      id: -1,
    });
  });

  function addLog(msg: string) {
    gameLog.value.push(msg);
    if (gameLog.value.length > 100) gameLog.value.shift();
  }

  function updateActions(game: GameState) {
    if (game.currentPlayer !== 0 || game.phase !== 'discard') {
      canHuNow.value = false;
      canJiaGangNow.value = false;
      canAnGangNow.value = false;
      jiaGangOptions.value = [];
      return;
    }
    canHuNow.value = isSelfHu(game.hands[0], game.ghostType, game.ghostValue);
    canAnGangNow.value = canAnGang(game.hands[0]);
    jiaGangOptions.value = getJiaGangCandidates(game.hands[0], game.melds[0]);
    canJiaGangNow.value = jiaGangOptions.value.length > 0;
  }

  function startNewGame() {
    const game = createGame(0);
    gameState.value = game;
    selectedTile.value = null;
    gameLog.value = [];
    canHuNow.value = false;
    canJiaGangNow.value = false;
    canAnGangNow.value = false;
    jiaGangOptions.value = [];
    addLog(`新游戏开始！鬼牌: ${getTileName({ type: game.ghostType, value: game.ghostValue, id: -1 })}`);

    // 庄家是玩家，庄家14张直接进入出牌阶段
    // 检查是否可以胡/加杠
    updateActions(game);
  }

  function selectTile(tile: Tile) {
    if (!gameState.value || gameState.value.currentPlayer !== 0) return;
    if (gameState.value.phase !== 'discard') return;
    if (selectedTile.value?.id === tile.id) {
      selectedTile.value = null;
    } else {
      selectedTile.value = tile;
    }
  }

  function playerDiscard() {
    const game = gameState.value;
    if (!game || !selectedTile.value) return;
    if (game.currentPlayer !== 0 || game.phase !== 'discard') return;

    const tile = selectedTile.value;
    const next = discardPhase(game, tile);
    addLog(`你打出: ${getTileName(tile)}`);
    gameState.value = next;
    selectedTile.value = null;
  }

  function playerPeng() {
    const game = gameState.value;
    if (!game || !game.lastDiscard || game.phase !== 'reaction') return;
    const next = pengPhase(game, 0);
    addLog(`你碰了: ${getTileName(game.lastDiscard)}`);
    gameState.value = next;
    updateActions(next);
  }

  function playerMingGang() {
    const game = gameState.value;
    if (!game || !game.lastDiscard || game.phase !== 'reaction') return;
    const next = mingGangPhase(game, 0);
    addLog(`你明杠了: ${getTileName(game.lastDiscard)}`);
    gameState.value = next;
  }

  function playerJiaGang(type: TileType, value: number) {
    const game = gameState.value;
    if (!game || game.currentPlayer !== 0) return;
    const next = jiaGangPhase(game, type, value);
    addLog(`你加杠了: ${getTileName({ type, value, id: -1 })}`);
    gameState.value = next;
    updateActions(next);
  }

  function playerPass() {
    const game = gameState.value;
    if (!game || game.phase !== 'reaction') return;
    const next = passReaction(game, 0);
    addLog('你选择过牌');
    gameState.value = next;
  }

  function playerHu() {
    const game = gameState.value;
    if (!game) return;
    const next = { ...game, phase: 'hu' as const, winner: 0 };
    addLog('你胡了！');
    gameState.value = next;
  }

  return {
    gameState,
    selectedTile,
    gameLog,
    isProcessing,
    canHuNow,
    canJiaGangNow,
    canAnGangNow,
    jiaGangOptions,
    currentPlayerName,
    playerHand,
    playerMelds,
    playerDiscards,
    ghostName,
    startNewGame,
    selectTile,
    playerDiscard,
    playerPeng,
    playerMingGang,
    playerJiaGang,
    playerPass,
    playerHu,
    addLog,
  };
}
