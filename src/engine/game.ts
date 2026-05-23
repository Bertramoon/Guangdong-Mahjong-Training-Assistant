import type { GameState, Tile, TileType } from './types';
import { createAllTiles } from './tile';
import { shuffleWall, drawInitialHands, drawTile } from './wall';
import { sortHand } from './hand';
import { canPeng, canMingGang, createPeng, createMingGang, createAnGang, createJiaGang } from './meld';

export function createGame(dealerIndex: number = 0): GameState {
  const allTiles = createAllTiles();
  const shuffled = shuffleWall(allTiles);
  const { hands, remaining } = drawInitialHands(shuffled, dealerIndex);

  const ghostDraw = drawTile(remaining);
  const ghostTile = ghostDraw.tile!;
  const wall = ghostDraw.wall;

  const game: GameState = {
    wall,
    hands: hands.map(h => sortHand(h)),
    melds: [[], [], [], []],
    discards: [[], [], [], []],
    currentPlayer: dealerIndex,
    phase: 'draw',
    ghostType: ghostTile.type,
    ghostValue: ghostTile.value,
    turnCount: 0,
    history: [],
    lastDiscard: null,
    lastDiscardPlayer: -1,
    winner: null,
  };

  return game;
}

export function discardPhase(game: GameState, tile: Tile): GameState {
  if (game.phase !== 'discard') {
    throw new Error(`Cannot discard in phase: ${game.phase}`);
  }

  const player = game.currentPlayer;
  const hand = game.hands[player];
  const idx = hand.findIndex(t => t.id === tile.id);
  if (idx === -1) {
    throw new Error('Tile not found in hand');
  }

  const newHand = [...hand];
  newHand.splice(idx, 1);

  const newHands = game.hands.map((h, i) => (i === player ? newHand : [...h]));
  const newDiscards = game.discards.map((d, i) =>
    i === player ? [...d, tile] : [...d],
  );

  const nextPhase = player === 0 ? 'reaction' : 'draw';
  const nextPlayer = player === 0 ? player : (player + 1) % 4;

  return {
    ...game,
    hands: newHands,
    discards: newDiscards,
    phase: nextPhase,
    currentPlayer: nextPlayer,
    lastDiscard: tile,
    lastDiscardPlayer: player,
  };
}

export function drawPhase(game: GameState): GameState {
  if (game.phase !== 'draw') {
    throw new Error(`Cannot draw in phase: ${game.phase}`);
  }

  if (game.wall.length === 0) {
    return { ...game, phase: 'draw_end', winner: -1 };
  }

  const { tile, wall } = drawTile(game.wall);
  if (!tile) {
    return { ...game, phase: 'draw_end', winner: -1 };
  }

  const newHands = game.hands.map((h, i) =>
    i === game.currentPlayer ? sortHand([...h, tile]) : [...h],
  );

  return {
    ...game,
    wall,
    hands: newHands,
    phase: 'discard',
    turnCount: game.turnCount + 1,
  };
}

export function checkReactions(game: GameState): number[] {
  if (game.phase !== 'reaction' || !game.lastDiscard) return [];
  const reactors: number[] = [];
  for (let i = 0; i < 4; i++) {
    if (i === game.lastDiscardPlayer) continue;
    const hand = game.hands[i];
    if (canPeng(hand, game.lastDiscard) || canMingGang(hand, game.lastDiscard)) {
      reactors.push(i);
    }
  }
  return reactors;
}

export function pengPhase(game: GameState, playerIndex: number): GameState {
  if (!game.lastDiscard) throw new Error('No discard to peng');
  const { hand, meld } = createPeng(game.hands[playerIndex], game.lastDiscard);
  const newHands = game.hands.map((h, i) => (i === playerIndex ? hand : [...h]));
  const newMelds = game.melds.map((m, i) => (i === playerIndex ? [...m, meld] : [...m]));
  return {
    ...game,
    hands: newHands,
    melds: newMelds,
    phase: 'discard',
    currentPlayer: playerIndex,
    lastDiscard: null,
    lastDiscardPlayer: -1,
  };
}

export function mingGangPhase(game: GameState, playerIndex: number): GameState {
  if (!game.lastDiscard) throw new Error('No discard to gang');
  const { hand, meld } = createMingGang(game.hands[playerIndex], game.lastDiscard);
  const newHands = game.hands.map((h, i) => (i === playerIndex ? hand : [...h]));
  const newMelds = game.melds.map((m, i) => (i === playerIndex ? [...m, meld] : [...m]));
  return {
    ...game,
    hands: newHands,
    melds: newMelds,
    phase: 'draw',
    currentPlayer: playerIndex,
    lastDiscard: null,
    lastDiscardPlayer: -1,
  };
}

export function anGangPhase(game: GameState, type: string, value: number): GameState {
  const result = createAnGang(game.hands[game.currentPlayer], type as any, value);
  if (!result) throw new Error('Cannot an_gang');
  const newHands = game.hands.map((h, i) =>
    i === game.currentPlayer ? result.hand : [...h],
  );
  const newMelds = game.melds.map((m, i) =>
    i === game.currentPlayer ? [...m, result.meld] : [...m],
  );
  const { tile, wall } = drawTile(game.wall);
  const finalHands = newHands.map((h, i) =>
    i === game.currentPlayer && tile ? sortHand([...h, tile]) : [...h],
  );
  return {
    ...game,
    hands: finalHands,
    melds: newMelds,
    wall,
    phase: 'discard',
    lastDiscard: null,
  };
}

/** 执行加杠（摸牌后，手中有第4张且已碰过该牌） */
export function jiaGangPhase(game: GameState, type: string, value: number): GameState {
  const player = game.currentPlayer;
  const result = createJiaGang(
    game.hands[player],
    game.melds[player],
    type as TileType,
    value,
  );
  if (!result) throw new Error('Cannot jia_gang');

  const newHands = game.hands.map((h, i) =>
    i === player ? result.hand : [...h],
  );
  const newMelds = game.melds.map((m, i) =>
    i === player ? result.melds : [...m],
  );

  // 加杠后补牌
  const { tile, wall } = drawTile(game.wall);
  const finalHands = newHands.map((h, i) =>
    i === player && tile ? sortHand([...h, tile]) : [...h],
  );

  return {
    ...game,
    hands: finalHands,
    melds: newMelds,
    wall,
    phase: 'discard',
    lastDiscard: null,
  };
}

export function passReaction(game: GameState, _playerIndex: number): GameState {
  const nextPlayer = (game.lastDiscardPlayer! + 1) % 4;
  return {
    ...game,
    phase: 'draw',
    currentPlayer: nextPlayer,
    lastDiscard: null,
    lastDiscardPlayer: -1,
  };
}
