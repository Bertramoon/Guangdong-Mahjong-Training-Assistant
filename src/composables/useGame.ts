import { ref, computed, watch } from 'vue';
import type { GameState, Tile, TileType } from '../engine/types';
import {
  createGame, drawPhase, discardPhase,
  pengPhase, mingGangPhase, jiaGangPhase,
  checkReactions, passReaction,
} from '../engine/game';
import { isSelfHu } from '../engine/hu';
import { getTileName } from '../engine/tile';
import { canJiaGang, getJiaGangCandidates, canAnGang } from '../engine/meld';
import { robotDiscard, robotShouldPeng, robotShouldMingGang, robotShouldJiaGang } from '../robot/robot';

export function useGame() {
  const gameState = ref<GameState | null>(null);
  const selectedTile = ref<Tile | null>(null);
  const gameLog = ref<string[]>([]);
  const isProcessing = ref(false);

  const canHuNow = ref(false);
  const canJiaGangNow = ref(false);
  const canAnGangNow = ref(false);
  const jiaGangOptions = ref<{ type: TileType; value: number }[]>([]);
  const drawnTileId = ref<number | null>(null);

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
    let game = createGame(0);
    // 庄家已有14张牌（初始发牌时已多摸一张），直接进入出牌阶段
    if (game.currentPlayer === 0 && game.hands[0].length === 14) {
      game = { ...game, phase: 'discard' as const };
    }
    gameState.value = game;
    selectedTile.value = null;
    gameLog.value = [];
    canHuNow.value = false;
    canJiaGangNow.value = false;
    canAnGangNow.value = false;
    jiaGangOptions.value = [];
    addLog(`新游戏开始！鬼牌: ${getTileName({ type: game.ghostType, value: game.ghostValue, id: -1 })}`);

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
    drawnTileId.value = null;

    // After player discards, robots may react
    if (next.phase === 'reaction') {
      handleRobotReactions(next).then(() => {
        if (gameState.value && gameState.value.currentPlayer !== 0 && gameState.value.phase === 'draw') {
          autoPlayUntilPlayer();
        }
      });
    }
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

    // After passing, if robot's turn, auto-play
    if (next.currentPlayer !== 0) {
      autoPlayUntilPlayer();
    }
  }

  function playerHu() {
    const game = gameState.value;
    if (!game) return;
    const next = { ...game, phase: 'hu' as const, winner: 0 };
    addLog('你胡了！');
    gameState.value = next;
  }

  function delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  async function handleRobotReactions(game: GameState): Promise<void> {
    if (!game.lastDiscard) return;
    const discardPlayer = game.lastDiscardPlayer;

    for (let i = 1; i <= 3; i++) {
      if (i === discardPlayer) continue;
      const hand = game.hands[i];

      // Check mingGang first (higher priority)
      if (robotShouldMingGang(hand, game.lastDiscard)) {
        const afterGang = mingGangPhase(game, i);
        addLog(`机器人${i}明杠了: ${getTileName(game.lastDiscard)}`);
        gameState.value = afterGang;
        // Gang: draw then discard
        if (afterGang.phase === 'draw') {
          const afterDraw = drawPhase(afterGang);
          gameState.value = afterDraw;
          if (afterDraw.phase === 'discard') {
            const tile = robotDiscard(afterDraw.hands[i], afterDraw.ghostType, afterDraw.ghostValue);
            const afterDiscard = discardPhase(afterDraw, tile);
            addLog(`机器人${i}打出: ${getTileName(tile)}`);
            gameState.value = afterDiscard;
          }
        }
        return;
      }

      // Then check peng
      if (robotShouldPeng(hand, game.lastDiscard)) {
        const afterPeng = pengPhase(game, i);
        addLog(`机器人${i}碰了: ${getTileName(game.lastDiscard)}`);
        gameState.value = afterPeng;
        // Peng: must discard
        if (afterPeng.phase === 'discard') {
          const tile = robotDiscard(afterPeng.hands[i], afterPeng.ghostType, afterPeng.ghostValue);
          const afterDiscard = discardPhase(afterPeng, tile);
          addLog(`机器人${i}打出: ${getTileName(tile)}`);
          gameState.value = afterDiscard;
        }
        return;
      }
    }

    // No robot reacts - pass for everyone (advance to next player's draw phase)
    const next = passReaction(gameState.value!, 0);
    gameState.value = next;
  }

  async function executeRobotTurn(): Promise<void> {
    const game = gameState.value;
    if (!game || game.currentPlayer === 0 || game.phase === 'draw_end' || game.phase === 'hu' || isProcessing.value) return;

    isProcessing.value = true;
    const player = game.currentPlayer;

    try {
      // Draw
      const afterDraw = drawPhase(game);
      addLog(`机器人${player}摸牌`);
      gameState.value = afterDraw;
      await delay(500);

      if (afterDraw.phase === 'draw_end' || afterDraw.phase === 'hu') return;

      // Check jiaGang
      if (robotShouldJiaGang(afterDraw.hands[player], afterDraw.melds[player])) {
        const candidates = getJiaGangCandidates(afterDraw.hands[player], afterDraw.melds[player]);
        if (candidates.length > 0) {
          const { type, value } = candidates[0];
          const afterJiaGang = jiaGangPhase(afterDraw, type, value);
          addLog(`机器人${player}加杠: ${getTileName({ type, value, id: -1 })}`);
          gameState.value = afterJiaGang;
          await delay(500);
          // Must discard after jiaGang
          if (afterJiaGang.phase === 'discard') {
            const tile = robotDiscard(afterJiaGang.hands[player], afterJiaGang.ghostType, afterJiaGang.ghostValue);
            const afterDiscard = discardPhase(afterJiaGang, tile);
            addLog(`机器人${player}打出: ${getTileName(tile)}`);
            gameState.value = afterDiscard;
          }
          return;
        }
      }

      // Normal discard
      const tile = robotDiscard(afterDraw.hands[player], afterDraw.ghostType, afterDraw.ghostValue);
      const afterDiscard = discardPhase(afterDraw, tile);
      addLog(`机器人${player}打出: ${getTileName(tile)}`);
      gameState.value = afterDiscard;
      await delay(300);

      // Handle reactions if triggered
      if (afterDiscard.phase === 'reaction') {
        await handleRobotReactions(afterDiscard);
      }
    } finally {
      isProcessing.value = false;
    }
  }

  async function autoPlayUntilPlayer(): Promise<void> {
    while (
      gameState.value &&
      gameState.value.currentPlayer !== 0 &&
      gameState.value.phase !== 'draw_end' &&
      gameState.value.phase !== 'hu'
    ) {
      await executeRobotTurn();
      await delay(300);
    }
    if (gameState.value && gameState.value.currentPlayer === 0 && gameState.value.phase === 'draw') {
      const oldIds = new Set(gameState.value.hands[0].map(t => t.id));
      const next = drawPhase(gameState.value);
      const newTile = next.hands[0].find(t => !oldIds.has(t.id));
      drawnTileId.value = newTile?.id ?? null;
      addLog('你摸牌');
      gameState.value = next;
    }
    if (gameState.value) {
      updateActions(gameState.value);
    }
  }

  async function startGameAndAutoPlay(): Promise<void> {
    startNewGame();
    await delay(300);
    await autoPlayUntilPlayer();
  }

  watch(
    () => gameState.value ? `${gameState.value.phase}-${gameState.value.currentPlayer}` : null,
    async () => {
      if (!gameState.value) return;
      if (gameState.value.phase === 'draw' && gameState.value.currentPlayer !== 0 && !isProcessing.value) {
        await autoPlayUntilPlayer();
      }
    },
  );

  return {
    gameState,
    selectedTile,
    gameLog,
    isProcessing,
    canHuNow,
    canJiaGangNow,
    canAnGangNow,
    jiaGangOptions,
    drawnTileId,
    currentPlayerName,
    playerHand,
    playerMelds,
    playerDiscards,
    ghostName,
    startNewGame,
    startGameAndAutoPlay,
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
