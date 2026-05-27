import { ref, computed } from 'vue';
import type { GameState, Tile, TileType } from '../engine/types';
import {
  createGame, drawPhase, discardPhase,
  pengPhase, mingGangPhase, jiaGangPhase, anGangPhase,
  checkReactions, passReaction, nextPlayerAfter,
} from '../engine/game';
import { isSelfHu } from '../engine/hu';
import { getTileName } from '../engine/tile';
import { canJiaGang, getJiaGangCandidates, canAnGang, getAnGangCandidates, canPeng, canMingGang } from '../engine/meld';
import { robotDiscard, robotShouldPeng, robotShouldMingGang, robotShouldJiaGang } from '../robot/robot';
import { getDiscardRecommendation, getReactionAnalysis, type DiscardRecommendation, type ReactionAnalysis } from '../engine/advisor';

export function useGame() {
  const gameState = ref<GameState | null>(null);
  const selectedTile = ref<Tile | null>(null);
  const gameLog = ref<string[]>([]);
  const isProcessing = ref(false);

  const canHuNow = ref(false);
  const canJiaGangNow = ref(false);
  const canAnGangNow = ref(false);
  const jiaGangOptions = ref<{ type: TileType; value: number }[]>([]);
  const anGangOptions = ref<{ type: TileType; value: number }[]>([]);
  const highlightedTileIds = ref<number[]>([]);

  const discardAdvice = computed<DiscardRecommendation | null>(() => {
    const game = gameState.value;
    if (!game || game.currentPlayer !== 0 || game.phase !== 'discard') return null;
    const hand = game.hands[0];
    if (hand.length < 2) return null;
    try {
      return getDiscardRecommendation(
        hand,
        game.ghostType,
        game.ghostValue,
        game.melds[0].length,
      );
    } catch {
      return null;
    }
  });

  const reactionAdvice = computed<ReactionAnalysis | null>(() => {
    const game = gameState.value;
    if (!game || game.phase !== 'reaction' || game.currentPlayer !== 0 || !game.lastDiscard) return null;
    const hand = game.hands[0];
    const tile = game.lastDiscard;
    try {
      return getReactionAnalysis(
        hand, tile, game.ghostType, game.ghostValue, game.melds[0].length,
        { peng: canPeng(hand, tile), mingGang: canMingGang(hand, tile) },
      );
    } catch {
      return null;
    }
  });

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

  const matchedTileIds = computed(() => {
    if (!selectedTile.value || !gameState.value) return [];
    const { type, value } = selectedTile.value;
    const ids: number[] = [];
    for (const player of gameState.value.discards) {
      for (const t of player) {
        if (t.type === type && t.value === value) ids.push(t.id);
      }
    }
    for (const player of gameState.value.melds) {
      for (const meld of player) {
        for (const t of meld.tiles) {
          if (t.type === type && t.value === value) ids.push(t.id);
        }
      }
    }
    return ids;
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

  function updateActions(game: GameState, checkHu: boolean = true) {
    if (game.currentPlayer !== 0 || game.phase !== 'discard') {
      canHuNow.value = false;
      canJiaGangNow.value = false;
      canAnGangNow.value = false;
      jiaGangOptions.value = [];
      anGangOptions.value = [];
      return;
    }
    canHuNow.value = checkHu && isSelfHu(game.hands[0], game.ghostType, game.ghostValue);
    anGangOptions.value = getAnGangCandidates(game.hands[0]);
    canAnGangNow.value = anGangOptions.value.length > 0;
    jiaGangOptions.value = getJiaGangCandidates(game.hands[0], game.melds[0]);
    canJiaGangNow.value = jiaGangOptions.value.length > 0;
  }

  function startNewGame(seed?: number) {
    let game = createGame(0, seed);
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
    anGangOptions.value = [];
    highlightedTileIds.value = [];
    addLog(`新游戏开始！鬼牌: ${getTileName({ type: game.ghostType, value: game.ghostValue, id: -1 })}`);
    addLog(`种子号: ${game.seed}`);

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
    highlightedTileIds.value = [];

    // After player discards, robots may react
    if (next.phase === 'reaction') {
      handleRobotReactions(next).then(() => {
        autoPlayUntilPlayer();
      });
    }
  }

  function playerPeng() {
    const game = gameState.value;
    if (!game || !game.lastDiscard || game.phase !== 'reaction') return;
    const next = pengPhase(game, 0);
    addLog(`你碰了: ${getTileName(game.lastDiscard)}`);
    gameState.value = next;
    updateActions(next, false);
  }

  function playerMingGang() {
    const game = gameState.value;
    if (!game || !game.lastDiscard || game.phase !== 'reaction') return;
    const afterGang = mingGangPhase(game, 0);
    addLog(`你明杠了: ${getTileName(game.lastDiscard)}`);
    // Gang: draw replacement tile then enter discard phase
    if (afterGang.phase === 'draw') {
      const oldIds = new Set(afterGang.hands[0].map(t => t.id));
      const afterDraw = drawPhase(afterGang);
      const newTile = afterDraw.hands[0].find(t => !oldIds.has(t.id));
      highlightedTileIds.value = newTile ? [newTile.id] : [];
      addLog('你摸牌');
      gameState.value = afterDraw;
      updateActions(afterDraw);
    } else {
      gameState.value = afterGang;
    }
  }

  function playerJiaGang(type: TileType, value: number) {
    const game = gameState.value;
    if (!game || game.currentPlayer !== 0) return;
    const next = jiaGangPhase(game, type, value);
    addLog(`你加杠了: ${getTileName({ type, value, id: -1 })}`);
    gameState.value = next;
    updateActions(next);
  }

  function playerAnGang(type: TileType, value: number) {
    const game = gameState.value;
    if (!game || game.currentPlayer !== 0 || game.phase !== 'discard') return;
    const oldIds = new Set(game.hands[0].map(t => t.id));
    const next = anGangPhase(game, type, value);
    addLog(`你暗杠了: ${getTileName({ type, value, id: -1 })}`);
    const newTile = next.hands[0].find(t => !oldIds.has(t.id));
    highlightedTileIds.value = newTile ? [newTile.id] : [];
    gameState.value = next;
    updateActions(next);
  }

  function playerPass() {
    const game = gameState.value;
    if (!game || game.phase !== 'reaction') return;
    const next = passReaction(game, 0);
    addLog('你选择过牌');
    gameState.value = next;
    highlightedTileIds.value = [];

    autoPlayUntilPlayer();
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

    // Check robots in counter-clockwise order: after player 0 (South) → East(3), North(2), West(1)
    for (const i of [3, 2, 1]) {
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

      // Check if human player can react to this discard
      if (canPeng(afterDiscard.hands[0], tile) || canMingGang(afterDiscard.hands[0], tile)) {
        gameState.value = { ...afterDiscard, phase: 'reaction', currentPlayer: 0 };
        highlightedTileIds.value = afterDiscard.hands[0]
          .filter(t => t.type === tile.type && t.value === tile.value)
          .map(t => t.id);
        return; // Stop auto-play, wait for human decision
      }

      // Check if other robots can react (in counter-clockwise order, skipping human)
      let g: GameState = afterDiscard;
      const robotReactionOrder = [3, 2, 1].map(d => (player + d) % 4).filter(i => i !== 0);
      for (const i of robotReactionOrder) {
        if (i === player) continue;
        if (robotShouldMingGang(g.hands[i], tile)) {
          g = mingGangPhase(g, i);
          addLog(`机器人${i}明杠了: ${getTileName(tile)}`);
          gameState.value = g;
          if (g.phase === 'draw') {
            const rd = drawPhase(g);
            gameState.value = rd;
            if (rd.phase === 'discard') {
              const rdTile = robotDiscard(rd.hands[i], rd.ghostType, rd.ghostValue);
              g = discardPhase(rd, rdTile);
              addLog(`机器人${i}打出: ${getTileName(rdTile)}`);
              gameState.value = g;
              // Check if human can react to gang player's discard
              if (canPeng(g.hands[0], rdTile) || canMingGang(g.hands[0], rdTile)) {
                gameState.value = { ...g, phase: 'reaction', currentPlayer: 0 };
                highlightedTileIds.value = g.hands[0]
                  .filter(t => t.type === rdTile.type && t.value === rdTile.value)
                  .map(t => t.id);
                return;
              }
            }
          }
          return;
        }
        if (robotShouldPeng(g.hands[i], tile)) {
          g = pengPhase(g, i);
          addLog(`机器人${i}碰了: ${getTileName(tile)}`);
          gameState.value = g;
          if (g.phase === 'discard') {
            const rdTile = robotDiscard(g.hands[i], g.ghostType, g.ghostValue);
            g = discardPhase(g, rdTile);
            addLog(`机器人${i}打出: ${getTileName(rdTile)}`);
            gameState.value = g;
            // Check if human can react to peng player's discard
            if (canPeng(g.hands[0], rdTile) || canMingGang(g.hands[0], rdTile)) {
              gameState.value = { ...g, phase: 'reaction', currentPlayer: 0 };
              highlightedTileIds.value = g.hands[0]
                .filter(t => t.type === rdTile.type && t.value === rdTile.value)
                .map(t => t.id);
              return;
            }
          }
          return;
        }
      }

      // No reactions
      gameState.value = afterDiscard;
      await delay(300);
    } finally {
      isProcessing.value = false;
    }
  }

  async function autoPlayUntilPlayer(): Promise<void> {
    while (
      gameState.value &&
      gameState.value.currentPlayer !== 0 &&
      gameState.value.phase !== 'draw_end' &&
      gameState.value.phase !== 'hu' &&
      gameState.value.phase !== 'reaction'
    ) {
      await executeRobotTurn();
      await delay(300);
    }
    if (gameState.value && gameState.value.currentPlayer === 0 && gameState.value.phase === 'draw') {
      const oldIds = new Set(gameState.value.hands[0].map(t => t.id));
      const next = drawPhase(gameState.value);
      const newTile = next.hands[0].find(t => !oldIds.has(t.id));
      highlightedTileIds.value = newTile ? [newTile.id] : [];
      addLog('你摸牌');
      gameState.value = next;
    }
    if (gameState.value) {
      updateActions(gameState.value);
    }
  }

  async function startGameAndAutoPlay(seed?: number): Promise<void> {
    startNewGame(seed);
    await delay(300);
    await autoPlayUntilPlayer();
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
    anGangOptions,
    highlightedTileIds,
    matchedTileIds,
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
    playerAnGang,
    playerPass,
    playerHu,
    addLog,
    discardAdvice,
    reactionAdvice,
  };
}
